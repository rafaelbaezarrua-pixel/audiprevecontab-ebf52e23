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
      headless: isLocal ? false : true,
    }) as any;
    
    const page: Page = await (browser as Browser).newPage();

    // ─────────────────────────────────────────────────────────────────────────
    // BYPASS ANTI-BOT: Oculta o Headless Chrome para o RichFaces não travar
    // ─────────────────────────────────────────────────────────────────────────
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      (window as any).chrome = { runtime: {} };
    });

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

    // Registra framenavigated e response ANTES do clique (por precaução)
    let framenavigatedPdfUrl: string | null = null;
    
    page.on('response', async (res) => {
      try {
        const url = res.url();
        const contentType = res.headers()['content-type'] || '';
        if (url.includes('faces') || url.includes('pdf')) {
          console.log(`[NET] URL: ${url.substring(0, 100)} | Type: ${contentType}`);
        }
        
        // Se a resposta for um PDF nativo ou for o gerador de relatorio assíncrono (mesmo sem .pdf)
        if (contentType.includes('application/pdf') || (url.includes('reportasync.faces') && !url.includes('.js') && !url.includes('.css'))) {
          // Garante que é uma URL válida
          if (!framenavigatedPdfUrl && url.startsWith('http')) {
            framenavigatedPdfUrl = url;
            console.log('[INTERCEPT] ✅ URL do PDF identificada via response:', url);
          }
        }
      } catch (e) { /* ignorar contexto destruído */ }
    });
    
    page.on('framenavigated', (frame: any) => {
      const url = frame.url();
      if (url.includes('viewer.html') && url.includes('file=')) {
        const extracted = extractPdfUrl(url);
        if (extracted && !framenavigatedPdfUrl) {
          framenavigatedPdfUrl = extracted;
          console.log('[FRAME] ✅ PDF URL extraída do viewer.html:', framenavigatedPdfUrl);
        }
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
    
    // Aguarda carregar os débitos (networkidle0 é importante para o JSF RichFaces anexar os listeners)
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 3: Verificar e selecionar débitos
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[3] Verificando débitos...');
    const hasDebits = await page.evaluate(() => document.querySelectorAll('input[id^="P"]').length > 0);
    if (!hasDebits) throw new Error('Não foram encontrados débitos em aberto para este CNPJ.');

    // Clica via JS disparando evento 'change' explicitamente para engatilhar o AJAX do RichFaces
    console.log('[3] Clicando no primeiro checkbox para habilitar botões...');
    await page.evaluate(() => {
      const firstCheck = document.querySelector('input[id^="P"]') as HTMLInputElement;
      if (firstCheck) {
        
        // Tenta usar jQuery/iCheck se estiver carregado na página (padrão Betha antigo)
        try {
          if (typeof (window as any).$ !== 'undefined') {
            const $el = (window as any).$(firstCheck);
            if ($el.parent().hasClass('icheckbox_minimal') || $el.parent().hasClass('icheckbox_flat-green')) {
               $el.iCheck('check');
            }
          }
        } catch(e) {}
        
        firstCheck.checked = true;
        firstCheck.click();
        
        // Simula todos os eventos que o JSF costuma escutar
        ['change', 'click', 'blur'].forEach(evName => {
          const evt = document.createEvent("HTMLEvents");
          evt.initEvent(evName, true, true);
          firstCheck.dispatchEvent(evt);
        });

        // Clica na label associada (muitos frameworks baseiam-se na label)
        const label = document.querySelector(`label[for="${firstCheck.id}"]`) as HTMLLabelElement;
        if (label) label.click();
      }
      
      // Se tiver "Marcar todas", clica nativamente na string do Betha
      const marcarTodas = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Marcar todas');
      if (marcarTodas) {
        // Usa onclick vazio para evitar redirect falso
        const onClickOriginal = marcarTodas.getAttribute('onclick');
        if (onClickOriginal) (window as any).eval(onClickOriginal);
        else (marcarTodas as HTMLElement).click();
      }
    });
    
    // JSF faz uma chamada AJAX após marcar os checkboxes para habilitar o botão
    console.log('[3] Aguardando JSF habilitar o botão...');
    await page.waitForFunction(() => {
      const em1 = document.querySelector<HTMLButtonElement>('#mainForm\\:emitir');
      const em2 = document.querySelector<HTMLButtonElement>('#mainForm\\:emitirIndividual');
      return (em1 && !em1.disabled) || (em2 && !em2.disabled);
    }, { timeout: 15000 }).catch(() => console.log('[3] Timeout aguardando habilitar o botão naturalmente...'));

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
    // PASSO 5: Aguardar URL do PDF interagir com botão Salvar
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[5] Verificando existência de modal com botão Salvar...');
    
    // Tenta clicar pró-ativamente num botão de Salvar/Download (se aparecer na interface do visualizador JSF)
    try {
      await page.waitForSelector(`::-p-xpath(//button[contains(text(), "Salvar") or contains(text(), "Download")] | //span[contains(text(), "Salvar")]/parent::* | //a[contains(text(), "Salvar")])`, { visible: true, timeout: 5000 })
        .then(async (btn: any) => {
          console.log('[5] Botão Salvar encontrado! Clicando...');
          await btn.click();
        })
        .catch(() => console.log('[5] Botão Salvar não encontrado, aguardando download automático...'));
    } catch(e) {}

    console.log('[5] Aguardando interceptação da resposta PDF...');
    const pdfUrl = await new Promise<string>((resolve, reject) => {
      const deadline = Date.now() + 60000;
      
      const poll = async (): Promise<void> => {
        if (framenavigatedPdfUrl) {
           return resolve(framenavigatedPdfUrl);
        }
        
        if (Date.now() > deadline) {
           return reject(new Error('Timeout (60s) aguardando geração do PDF. Tente novamente mais tarde.'));
        }
        
        // Verifica se o JS injetou um link para donwload (pdfViewer Betha antigo)
        try {
          const directLink = await page.evaluate(() => {
            const a = document.querySelector('a[href*="reportasync.faces"]') as HTMLAnchorElement;
            return a ? a.href : null;
          });
          if (directLink) {
             console.log('[5] Link no DOM (fallback) encontrado:', directLink);
             return resolve(directLink);
          }
        } catch (e) {}

        setTimeout(poll, 400);
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
