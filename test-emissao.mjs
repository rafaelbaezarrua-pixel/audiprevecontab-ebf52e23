import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CNPJ = '47272234000151';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  
  console.log('[NAV] Acessando portal...');
  await page.goto('https://e-gov.betha.com.br/cdweb/03114-548/contribuinte/con_situacaocontribuinte.faces', {
    waitUntil: 'networkidle2', timeout: 30000
  });

  console.log('[NAV] Fechando popup...');
  await page.evaluate(() => document.querySelector('button[title="Não responder"]')?.click()).catch(() => {});

  console.log('[CNPJ] Preenchendo CNPJ...');
  await page.click('.cnpj.btModo').catch(() => {});
  await page.waitForSelector('#mainForm\\:cnpj', { visible: true, timeout: 10000 });
  await page.type('#mainForm\\:cnpj', CNPJ, { delay: 30 });
  await page.click('#mainForm\\:btCnpj');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

  const debitCount = await page.evaluate(() => document.querySelectorAll('input[id^="P"]').length);
  console.log(`[DEB] Débitos encontrados: ${debitCount}`);

  if (debitCount > 0) {
    console.log('[DEB] Marcando checkboxes...');
    await page.evaluate(() => {
      const ms = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Marcar todas');
      if (ms) ms.click();
      else document.querySelectorAll('input[id^="P"]').forEach(c => c.checked || c.click());
    });
    
    console.log('[DEB] Aguardando habilitar botões...');
    await page.waitForFunction(() => {
      const em1 = document.querySelector('#mainForm\\:emitir');
      const em2 = document.querySelector('#mainForm\\:emitirIndividual');
      return (em1 && !em1.disabled) || (em2 && !em2.disabled);
    }, { timeout: 10000 });

    console.log('[DEB] Clicando no Emissão Individual...');
    await page.click('#mainForm\\:emitirIndividual').catch(e => page.click('#mainForm\\:emitir'));
    
    console.log('[WAIT] Aguardando 10s para a guia aparecer...');
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('[SCREENSHOT] Salvando screenshot1.png');
    await page.screenshot({ path: 'screenshot1.png' });
    
    console.log('[DOM] HTML do fancybox/viewer:');
    const domInfo = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      const html = document.body.innerHTML.substring(0, 500);
      return { iframes, html };
    });
    console.log(JSON.stringify(domInfo, null, 2));
    
    // Tenta clicar em "Salvar" dentro do viewer, se existir!
    // No visualizador do PDF.js, o botão de download tem id "download"
    console.log('[ACTION] Tentando clicar no Botão Salvar...');
    const frame = page.frames().find(f => f.url().includes('viewer.html'));
    if (frame) {
       console.log('[ACTION] Frame do PDF encontrado!');
       try {
         await frame.click('#download');
         console.log('[ACTION] Botão Download/Salvar Clicado no Viewer!');
       } catch(e) { console.log('Erro ao clicar no download do iframe:', e.message); }
    } else {
       console.log('[ACTION] Frame do PDF não encontrado ou não tem a classe esperada.');
       // Tenta clicar num modal local
       try {
         const btn = await page.$x('//button[contains(text(), "Salvar") or contains(text(), "Download")]');
         if (btn.length > 0) await btn[0].click();
       } catch(e) {}
    }
    
    await new Promise(r => setTimeout(r, 5000));
    console.log('[SCREENSHOT] Salvando screenshot2.png');
    await page.screenshot({ path: 'screenshot2.png' });
  }

  await browser.close();
})();
