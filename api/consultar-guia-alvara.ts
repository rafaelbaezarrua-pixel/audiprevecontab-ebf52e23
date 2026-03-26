import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { Browser, Page } from 'puppeteer-core';
import * as https from 'https';
import * as http from 'http';

/** Faz download de uma URL mantendo cookies via HTTP nativo */
async function downloadWithCookies(pdfUrl: string, cookieHeader: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = pdfUrl.startsWith('https') ? https : http;
    const options = {
      headers: { 
        Cookie: cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      }
    };
    const req = lib.get(pdfUrl, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location!;
        console.log('[DOWNLOAD] Redirecionando para:', redirectUrl);
        return downloadWithCookies(redirectUrl, cookieHeader).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cnpj } = req.body;
  if (!cnpj) return res.status(400).json({ error: 'CNPJ é obrigatório' });

  const sanitizedCnpj = cnpj.replace(/\D/g, '');
  const invalidPatterns = [
    '00000000000000','11111111111111','22222222222222','33333333333333',
    '44444444444444','55555555555555','66666666666666','77777777777777',
    '88888888888888','99999999999999'
  ];
  if (sanitizedCnpj.length !== 14 || invalidPatterns.includes(sanitizedCnpj)) {
    return res.status(400).json({ error: 'CNPJ inválido. Verifique os dados informados.' });
  }

  let browser: Browser | undefined;

  try {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    
    browser = await puppeteer.launch({ 
      args: isLocal 
        ? ['--no-sandbox', '--disable-setuid-sandbox'] 
        : chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: isLocal 
        ? (process.platform === 'win32' 
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
            : '/usr/bin/google-chrome')
        : await chromium.executablePath(),
      headless: true,
    }) as any;
    
    const page: Page = await (browser as Browser).newPage();

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: extrai URL do PDF a partir da URL do viewer.html
    // ─────────────────────────────────────────────────────────────────────────
    const extractPdfUrl = (viewerUrl: string): string | null => {
      try {
        const u = new URL(viewerUrl);
        const filePath = decodeURIComponent(u.searchParams.get('file') || '');
        if (filePath) return `${u.protocol}//${u.host}${filePath}`;
      } catch (e) { /* ignore */ }
      return null;
    };

    // Registra framenavigated ANTES do clique (por precaução)
    let framenavigatedPdfUrl: string | null = null;
    page.on('framenavigated', (frame: any) => {
      const url = frame.url();
      if (url && url !== 'about:blank' && !url.includes('.css') && !url.includes('.js')) {
        console.log('[FRAME] navegou:', url.substring(0, 120));
      }
      if (url.includes('viewer.html') && url.includes('file=')) {
        framenavigatedPdfUrl = extractPdfUrl(url);
        if (framenavigatedPdfUrl) console.log('[FRAME] ✅ PDF URL:', framenavigatedPdfUrl);
      }
      if (url.includes('reportasync.faces') && url.toLowerCase().includes('.pdf')) {
        framenavigatedPdfUrl = url;
        console.log('[FRAME] ✅ reportasync PDF direto:', url);
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 1: Navegar para o portal
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[1] Acessando portal Betha...');
    await page.goto(
      'https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces',
      { waitUntil: 'networkidle2', timeout: 30000 }
    );

    if (await page.$('select[name="mainForm:estados"]')) {
      console.log('[1] Selecionando entidade...');
      await page.select('select[name="mainForm:estados"]', '21');
      await page.waitForFunction(() => {
        const el = document.querySelector('select[name="mainForm:municipios"]');
        return el && !(el as HTMLSelectElement).disabled;
      }, { timeout: 10000 });
      const cityId = await page.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('select[name="mainForm:municipios"] option'));
        return opts.find(o => o.textContent?.includes('Fazenda Rio Grande'))
          ? (opts.find(o => o.textContent?.includes('Fazenda Rio Grande')) as HTMLOptionElement).value
          : null;
      });
      if (!cityId) throw new Error('Não foi possível encontrar Fazenda Rio Grande.');
      await page.select('select[name="mainForm:municipios"]', cityId);
      await page.evaluate(() => {
        const sel = document.querySelector('select[name="mainForm:municipios"]') as HTMLSelectElement;
        if (sel && (window as any).verifyCity) (window as any).verifyCity(sel);
      });
      await new Promise(r => setTimeout(r, 800));
      const btn = await page.$('a#mainForm\\:selecionar');
      if (btn) {
        await btn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      }
    }

    // Navega para a página de situação do contribuinte se ainda não estiver lá
    if (!page.url().includes('con_situacaocontribuinte')) {
      console.log('[1] Navegando para con_situacaocontribuinte...');
      // Tenta clicar no link do menu
      const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const link = links.find(a => a.href?.includes('con_situacaocontribuinte') || a.textContent?.toLowerCase().includes('situa'));
        if (link) { link.click(); return true; }
        return false;
      });
      if (!clicked) {
        // Navega diretamente
        await page.goto(
          'https://e-gov.betha.com.br/cdweb/03114-548/contribuinte/con_situacaocontribuinte.faces',
          { waitUntil: 'networkidle2', timeout: 20000 }
        );
      } else {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      }
    }

    await page.evaluate(() => {
      const btn = document.querySelector('button[title="Não responder"]') as HTMLButtonElement;
      if (btn) btn.click();
    }).catch(() => {});

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 2: Preencher CNPJ
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[2] Preenchendo CNPJ:', sanitizedCnpj);
    await page.click('.cnpj.btModo').catch(() => {});
    await page.waitForSelector('#mainForm\\:cnpj', { visible: true, timeout: 10000 });
    await page.type('#mainForm\\:cnpj', sanitizedCnpj);
    await page.click('#mainForm\\:btCnpj');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 3: Verificar e selecionar débitos
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[3] Verificando débitos...');
    const hasDebits = await page.evaluate(() => document.querySelectorAll('input[id^="P"]').length > 0);
    if (!hasDebits) throw new Error('Não foram encontrados débitos em aberto para este CNPJ.');

    await page.evaluate(() => {
      const marcarTodas = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Marcar todas');
      if (marcarTodas) { (marcarTodas as HTMLElement).click(); }
      else { document.querySelectorAll<HTMLInputElement>('input[id^="P"]').forEach(c => { if (!c.checked) c.click(); }); }
    });
    
    // JSF faz uma chamada AJAX após marcar os checkboxes para habilitar o botão
    console.log('[3] Aguardando JSF habilitar o botão...');
    await page.waitForFunction(() => {
      const em1 = document.querySelector<HTMLButtonElement>('#mainForm\\:emitir');
      const em2 = document.querySelector<HTMLButtonElement>('#mainForm\\:emitirIndividual');
      return (em1 && !em1.disabled) || (em2 && !em2.disabled);
    }, { timeout: 10000 }).catch(() => console.log('[3] Timeout aguardando habilitar o botão naturalmente...'));

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 4: Clicar no botão de emissão
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[4] Clicando em Emissão individual...');
    const emitSelectors = ['#mainForm\\:emitir', '#mainForm\\:emitirIndividual', '#mainForm\\:emitirUnificada'];
    let clicked = false;
    for (const sel of emitSelectors) {
      const el = await page.$(sel);
      if (el) {
        // Força habilitar o botão caso o JSF tenha falhado ou seja demorado
        await page.evaluate((s) => {
          const btn = document.querySelector<HTMLButtonElement>(s);
          if (btn) btn.disabled = false;
        }, sel);

        // Inspeciona o onclick antes de clicar
        const onclickAttr = await el.evaluate((e: Element) => e.getAttribute('onclick') || '');
        const disabled = await el.evaluate((e: Element) => (e as HTMLButtonElement).disabled);
        console.log(`[4] Botão: sel=${sel} disabled=${disabled} onclick=${onclickAttr.substring(0, 100)}`);
        
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) throw new Error('Botão de emissão não encontrado.');

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 5: Aguardar URL do PDF via polling intensivo do DOM
    // Estratégia: verifica DOM a cada 300ms por até 60s
    // O fancybox injeta o iframe dinamicamente sem gerar navegação de frame
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[5] Aguardando iframe fancybox via polling do DOM...');
    
    const pdfUrl = await new Promise<string>(async (resolve, reject) => {
      const deadline = Date.now() + 60000;
      
      // Checa se framenavigated já capturou algo
      if (framenavigatedPdfUrl) {
        console.log('[5] framenavigated já capturou:', framenavigatedPdfUrl);
        return resolve(framenavigatedPdfUrl);
      }

      const poll = async (): Promise<void> => {
        if (Date.now() > deadline) {
          // Log de diagnóstico final
          const diagInfo = await page.evaluate(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'))
              .map(f => ({ id: f.id, class: f.className, src: f.src.substring(0, 100) }));
            const fancybox = document.querySelector('.fancybox-wrap, #fancybox-wrap');
            const bodySnippet = document.body.innerText.substring(0, 200);
            return { iframes, hasFancybox: !!fancybox, bodySnippet };
          }).catch(() => null);
          console.error('[5] TIMEOUT. Estado DOM:', JSON.stringify(diagInfo));
          return reject(new Error('Timeout (60s) aguardando geração do PDF.'));
        }

        // Verifica se framenavigated capturou
        if (framenavigatedPdfUrl) {
          console.log('[5] framenavigated capturou:', framenavigatedPdfUrl);
          return resolve(framenavigatedPdfUrl);
        }

        try {
          const result = await page.evaluate(() => {
            // Procura qualquer iframe com viewer.html no src
            const iframes = Array.from(document.querySelectorAll('iframe'));
            for (const iframe of iframes) {
              const src = iframe.src || iframe.getAttribute('src') || '';
              if (src.includes('viewer.html') && src.includes('file=')) return { type: 'viewer', url: src };
              if (src.includes('reportasync.faces') && src.toLowerCase().includes('.pdf')) return { type: 'async', url: src };
            }
            // Verifica também se o texto do corpo indica carregamento
            const loadingMsg = document.querySelector('.fancybox-inner, .fancybox-wrap');
            return { type: 'none', hasFancybox: !!loadingMsg };
          });

          if (result.type === 'viewer' || result.type === 'async') {
            let pdfUrl: string = result.url!;
            if (result.type === 'viewer') {
              pdfUrl = extractPdfUrl(result.url!) || result.url!;
            }
            console.log('[5] ✅ iframe encontrado via polling! URL:', pdfUrl);
            return resolve(pdfUrl);
          }

          if ((result as any).hasFancybox) {
            console.log('[5] Fancybox aberto mas sem iframe src ainda...');
          }
        } catch (e) { /* página navegando */ }

        await new Promise(r => setTimeout(r, 300));
        return poll();
      };

      poll();
    });

    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    console.log('[5] Baixando PDF de:', pdfUrl);
    const pdfBuffer = await downloadWithCookies(pdfUrl, cookieHeader);

    if (!pdfBuffer || pdfBuffer.length < 500) throw new Error('PDF gerado está vazio ou corrompido.');

    const pdfMagic = pdfBuffer.slice(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      const preview = pdfBuffer.slice(0, 200).toString('utf8');
      console.error('[5] Não é PDF. Preview:', preview);
      throw new Error('O servidor da prefeitura não retornou um PDF válido.');
    }

    console.log(`[5] PDF válido! Tamanho: ${pdfBuffer.length} bytes`);
    await (browser as Browser).close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Guia_Alvara_${sanitizedCnpj}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    return res.end(pdfBuffer);

  } catch (error: any) {
    if (browser) await (browser as Browser).close();
    console.error('Erro na automação Betha:', error);
    if (error.message?.includes('Não foram encontrados débitos')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Falha na comunicação com a prefeitura: ' + error.message });
  }
}
