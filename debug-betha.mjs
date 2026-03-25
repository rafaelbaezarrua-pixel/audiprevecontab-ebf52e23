/**
 * debug-betha-v3.mjs
 * Navega corretamente pelo portal e diagnostica o que acontece após o click
 */
import puppeteer from 'puppeteer-core';

const CNPJ = '47272234000151';

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: false,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: { width: 1280, height: 900 },
});

const page = await browser.newPage();
const client = await page.target().createCDPSession();
await client.send('Network.enable');

const allRequests = [];
client.on('Network.requestWillBeSent', (p) => {
  const u = p.request.url;
  if (u.includes('data:') || u.endsWith('.woff2') || u.endsWith('.woff') || u.endsWith('.gif')) return;
  allRequests.push(`${p.request.method} ${u}`);
  if (!u.includes('.css') && !u.includes('.js') && !u.includes('.png') && !u.includes('.ico')) {
    console.log(`[REQ] ${p.request.method} ${u}`);
  }
});
client.on('Network.responseReceived', (p) => {
  const u = p.response.url;
  if (u.includes('data:') || u.endsWith('.woff2') || u.includes('.css') || u.includes('.js')) return;
  console.log(`[RES] ${p.response.status} [${p.response.mimeType}] ${u.substring(0, 120)}`);
});

// ─── Navega para o portal ───────────────────────────────────────────────────
console.log('\n[NAV] Acessando portal via URL direta da entidade...');
await page.goto('https://e-gov.betha.com.br/cdweb/03114-548/contribuinte/con_situacaocontribuinte.faces', {
  waitUntil: 'domcontentloaded', timeout: 30000
});
await new Promise(r => setTimeout(r, 3000));
console.log('[NAV] URL atual:', page.url());

// Se caiu no main.faces, clica no menu "Situação do Contribuinte"
if (!page.url().includes('con_situacaocontribuinte')) {
  console.log('[NAV] Em main.faces - clicando menu Situação do Contribuinte...');
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent?.trim(), href: a.href }))
  );
  const situacaoLink = links.find(l => l.text?.toLowerCase().includes('situa'));
  console.log('[NAV] Link encontrado:', JSON.stringify(situacaoLink));
  if (situacaoLink?.href) {
    await page.goto(situacaoLink.href, { waitUntil: 'networkidle2', timeout: 20000 });
  } else {
    // Tenta clicar pelo texto
    await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a')).find(el => el.textContent?.toLowerCase().includes('situa'));
      if (a) a.click();
    });
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('[NAV] URL após menu:', page.url());
}

// Fecha popup pesquisa
await page.evaluate(() => document.querySelector('button[title="Não responder"]')?.click()).catch(() => {});

// ─── Preenche CNPJ ───────────────────────────────────────────────────────────
console.log('\n[CNPJ] Selecionando modo CNPJ...');
await page.click('.cnpj.btModo').catch(() => {});
await page.waitForSelector('#mainForm\\:cnpj', { visible: true, timeout: 10000 });
await page.evaluate(() => { document.querySelector('#mainForm\\:cnpj').value = ''; });
await page.type('#mainForm\\:cnpj', CNPJ, { delay: 30 });
console.log('[CNPJ] Procurando botão de busca...');
const buscarBtn = await page.$('#mainForm\\:btCnpj, #mainForm\\:continuar, input[value*="Continuar"], input[value*="Buscar"]');
console.log('[CNPJ] Botão busca:', buscarBtn ? 'encontrado' : 'NÃO ENCONTRADO');
await buscarBtn?.click();
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
console.log('[CNPJ] URL após busca:', page.url());

// ─── Débitos ─────────────────────────────────────────────────────────────────
const debitCount = await page.evaluate(() => document.querySelectorAll('input[id^="P"]').length);
console.log(`[DEB] Débitos: ${debitCount}`);
if (debitCount === 0) {
  console.log('[DEB] SEM DÉBITOS');
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('[DEB] Conteúdo da página:', bodyText);
  await browser.close(); process.exit(0);
}

await page.evaluate(() => {
  const marcarTodas = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Marcar todas');
  if (marcarTodas) marcarTodas.click();
  else document.querySelectorAll('input[id^="P"]').forEach(c => { if (!c.checked) c.click(); });
});
await new Promise(r => setTimeout(r, 500));

// ─── Inspeciona o botão emitir ───────────────────────────────────────────────
const emitInfo = await page.evaluate(() => {
  const el = document.querySelector('#mainForm\\:emitir');
  if (!el) {
    // Lista todos os IDs disponíveis com "emit" ou "guia"
    const all = Array.from(document.querySelectorAll('[id]'))
      .filter(e => e.id.toLowerCase().includes('emit') || e.id.toLowerCase().includes('guia') || e.id.toLowerCase().includes('boleto'))
      .map(e => ({ id: e.id, tag: e.tagName, text: e.textContent?.trim().substring(0,30), onclick: e.getAttribute('onclick') }));
    return { found: false, candidates: all };
  }
  return {
    found: true,
    tagName: el.tagName,
    type: el.type,
    disabled: el.disabled,
    onclick: el.getAttribute('onclick'),
    outerHTML: el.outerHTML.substring(0, 300),
  };
});
console.log('\n[EMIT] Botão emitir:', JSON.stringify(emitInfo, null, 2));

// ─── Clica e monitora ────────────────────────────────────────────────────────
console.log('\n[EMIT] === CLICANDO EMITIR ===\n');
const requestsBefore = allRequests.length;

const emitEl = await page.$('#mainForm\\:emitir, #mainForm\\:emitirIndividual');
if (emitEl) {
  // Tenta clicar normalmente
  await emitEl.click();
  console.log('[EMIT] Clique executado!');
  
  await new Promise(r => setTimeout(r, 15000));
  
  const newRequests = allRequests.slice(requestsBefore);
  console.log(`\n[EMIT] ${newRequests.length} nova(s) requisição(ões) após o clique:`);
  newRequests.forEach(r => console.log('  ', r));
}

// ─── Estado final ────────────────────────────────────────────────────────────
const frames = page.frames();
console.log('\n[STATE] Frames ativos:');
frames.forEach(f => console.log('  -', f.url()));

const iframes = await page.evaluate(() =>
  Array.from(document.querySelectorAll('iframe')).map(f => ({ id: f.id, class: f.className, src: f.src }))
);
console.log('\n[STATE] iframes DOM:', JSON.stringify(iframes));

const fancyHtml = await page.evaluate(() => {
  const fb = document.querySelector('.fancybox-wrap, #fancybox-wrap');
  return fb ? fb.innerHTML.substring(0, 800) : null;
});
console.log('\n[STATE] fancybox HTML:', fancyHtml ?? 'NENHUM');

const modalVisible = await page.evaluate(() => {
  const fb = document.querySelector('.fancybox-wrap');
  if (!fb) return 'NENHUM';
  const style = window.getComputedStyle(fb);
  return `display=${style.display} visibility=${style.visibility}`;
});
console.log('[STATE] Modal visível?', modalVisible);

console.log('\n[FIM] Fechando em 5s...');
await new Promise(r => setTimeout(r, 5000));
await browser.close();
