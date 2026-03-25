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
    lib.get(pdfUrl, options, (res) => {
      // Segue redirecionamentos (302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location!;
        console.log('[DOWNLOAD] Redirecionando para:', redirectUrl);
        return downloadWithCookies(redirectUrl, cookieHeader).then(resolve).catch(reject);
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
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
    // INTERCEPTAÇÃO VIA CDP (captura requisições de TODOS os frames/iframes)
    // ─────────────────────────────────────────────────────────────────────────
    const cdpClient = await (page as any).target().createCDPSession();
    await cdpClient.send('Network.enable');

    const pdfUrlPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout (60s) aguardando geração do PDF.')), 60000);

      cdpClient.on('Network.requestWillBeSent', (params: any) => {
        const url: string = params.request.url;

        // Estratégia 1: Visualizador PDF.js com parâmetro file=
        if (url.includes('viewer.html') && url.includes('file=')) {
          try {
            const viewerUrl = new URL(url);
            const filePath = viewerUrl.searchParams.get('file');
            if (filePath) {
              // filePath pode ser relativo como ../../reportasync.faces/...pdf
              const base = viewerUrl.origin + viewerUrl.pathname.replace(/\/web\/viewer\.html$/, '/');
              const absolutePdfUrl = new URL(filePath, base).href;
              console.log('[CDP] viewer.html detectado. PDF URL:', absolutePdfUrl);
              clearTimeout(timeout);
              resolve(absolutePdfUrl);
            }
          } catch (e) {
            console.warn('[CDP] Erro ao parsear viewer URL:', e);
          }
        }

        // Estratégia 2: URL direta do relatório PDF (reportasync.faces/*.pdf)
        if (url.includes('reportasync.faces') && url.toLowerCase().includes('.pdf')) {
          console.log('[CDP] reportasync PDF URL detectado:', url);
          clearTimeout(timeout);
          resolve(url);
        }
      });

      // Estratégia 3 (fallback): response com content-type application/pdf
      cdpClient.on('Network.responseReceived', (params: any) => {
        const contentType: string = params.response.mimeType || '';
        const url: string = params.response.url;
        if (contentType === 'application/pdf' || contentType.includes('pdf')) {
          console.log('[CDP] Resposta PDF por content-type em:', url);
          clearTimeout(timeout);
          resolve(url);
        }
      });
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
        const opt = opts.find(o => o.textContent?.includes('Fazenda Rio Grande'));
        return opt ? (opt as HTMLOptionElement).value : null;
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

    if (!page.url().includes('con_situacaocontribuinte.faces')) {
      await page.goto(
        'https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces',
        { waitUntil: 'networkidle2', timeout: 30000 }
      );
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
      if (marcarTodas) {
        (marcarTodas as HTMLElement).click();
      } else {
        document.querySelectorAll<HTMLInputElement>('input[id^="P"]').forEach(c => { if (!c.checked) c.click(); });
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 4: Clicar no botão de emissão
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[4] Clicando em Emissão individual...');
    const emitSelectors = ['#mainForm\\:emitir', '#mainForm\\:emitirIndividual', '#mainForm\\:emitirUnificada'];
    let clicked = false;
    for (const sel of emitSelectors) {
      const el = await page.$(sel);
      if (el) {
        console.log('[4] Clicando em:', sel);
        await el.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) throw new Error('Botão de emissão não encontrado.');

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 5: Aguardar URL do PDF via CDP e baixar com cookies
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[5] Aguardando URL do PDF via CDP...');
    const pdfUrl = await pdfUrlPromise;

    // Obtém cookies da sessão para download autenticado
    const cookies = await page.cookies();
    const cookieHeader = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');

    console.log('[5] Baixando PDF de:', pdfUrl);
    const pdfBuffer = await downloadWithCookies(pdfUrl, cookieHeader);

    if (!pdfBuffer || pdfBuffer.length < 500) {
      throw new Error('PDF gerado está vazio ou corrompido.');
    }

    // Valida magic bytes do PDF
    const pdfMagic = pdfBuffer.slice(0, 4).toString('ascii');
    if (pdfMagic !== '%PDF') {
      const preview = pdfBuffer.slice(0, 200).toString('utf8');
      console.error('[5] Resposta não é PDF. Preview:', preview);
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
