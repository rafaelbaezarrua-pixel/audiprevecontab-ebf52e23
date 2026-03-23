import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer, { Browser, Page, Target } from 'puppeteer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cnpj } = req.body;
  
  if (!cnpj) {
    return res.status(400).json({ error: 'CNPJ é obrigatório' });
  }

  // Sanitiza e valida o CNPJ (deve ter 14 dígitos e formato válido)
  const sanitizedCnpj = cnpj.replace(/\D/g, '');
  
  // Regras de validação: 14 dígitos e não ser sequência repetida
  const invalidPatterns = [
    '00000000000000', '11111111111111', '22222222222222', '33333333333333',
    '44444444444444', '55555555555555', '66666666666666', '77777777777777',
    '88888888888888', '99999999999999'
  ];

  if (sanitizedCnpj.length !== 14 || invalidPatterns.includes(sanitizedCnpj)) {
    return res.status(400).json({ error: 'CNPJ inválido. Verifique os dados informados.' });
  }

  let browser: Browser | undefined;

  try {
    // Nota: Em ambiente de produção Vercel, recomenda-se o uso de puppeteer-core + @sparticuz/chromium
    // devido às limitações de tamanho de 50MB do Serverless Function.
    // Para rodar localmente, o puppeteer padrão funciona.
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Acessa o portal da prefeitura de Fazenda Rio Grande (Entidade 66, Estado 21)
    await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
    
    // Verifica se já está na página de consulta ou se precisa selecionar a entidade
    const isLoginPage = await page.$('select[name="mainForm:estados"]');
    if (isLoginPage) {
      // Seleciona o estado PR (21)
      await page.select('select[name="mainForm:estados"]', '21');
      
      // Aguarda o combobox de cidades ser habilitado
      await page.waitForFunction(() => {
        const el = document.querySelector('select[name="mainForm:municipios"]');
        return el && !(el as HTMLSelectElement).disabled;
      });
      
      // Pega o ID da Fazenda Rio Grande dinamicamente
      const cityId = await page.evaluate(() => {
        const options = Array.from(document.querySelectorAll('select[name="mainForm:municipios"] option'));
        const prOption = options.find(o => o.textContent?.includes('Fazenda Rio Grande'));
        return prOption ? (prOption as HTMLOptionElement).value : null;
      });

      if (!cityId) throw new Error("Não foi possível encontrar a entidade Fazenda Rio Grande.");

      await page.select('select[name="mainForm:municipios"]', cityId);
      await page.evaluate((id) => (window as any).verifyCity(document.querySelector('select[name="mainForm:municipios"]')), cityId);
      await new Promise(r => setTimeout(r, 1000));
      
      const btnAcessar = await page.$('a#mainForm\\:selecionar');
      if (btnAcessar) {
        await btnAcessar.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
      }
    }

    // 2. Vai para a página de situação do contribuinte (se já não estiver nela)
    if (!page.url().includes('con_situacaocontribuinte.faces')) {
      await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
    }

    // Fecha popups de pesquisa se existirem
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[title="Não responder"]') as HTMLButtonElement;
      if (closeBtn) closeBtn.click();
    }).catch(() => {});

    // 3. Seleciona CNPJ e preenche
    await page.click('.cnpj.btModo'); // Clica no rádio CNPJ (que é um link no Betha)
    await page.waitForSelector('#mainForm\\:cnpj', { visible: true });
    await page.type('#mainForm\\:cnpj', sanitizedCnpj);
    await page.click('#mainForm\\:btCnpj');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

    // 4. Seleciona as guias em aberto
    // Verifica se existem débitos
    const hasDebits = await page.evaluate(() => {
      return document.querySelectorAll('input[id^="P"]').length > 0;
    });

    if (!hasDebits) {
      throw new Error("Não foram encontrados débitos em aberto para este CNPJ.");
    }

    // Seleciona todos os débitos (geralmente o checkbox P0 seleciona o grupo)
    await page.evaluate(() => {
      const checks = document.querySelectorAll('input[id^="P"]') as NodeListOf<HTMLInputElement>;
      checks.forEach(c => { if (!c.checked) c.click(); });
    });

    // O Betha abre o PDF em uma nova aba. Vamos interceptar isso.
    const newPagePromise = new Promise<Page | null>((x) => {
      if (browser) {
        browser.once('targetcreated', async (target: Target) => {
          x(await target.page());
        });
      } else {
        x(null);
      }
    });
    
    await page.click('#mainForm\\:emitirUnificada');
    
    const popup = await newPagePromise;
    if (!popup) {
      throw new Error("Não foi possível gerar o PDF das guias.");
    }

    await popup.waitForNetworkIdle();
    const pdfBuffer = await popup.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Guias_Alvara_${sanitizedCnpj}.pdf"`);
    return res.end(pdfBuffer);

  } catch (error: any) {
    if (browser) await browser.close();
    console.error("Erro na automação Betha:", error);
    
    // Tratamento específico para erros esperados de negócio
    if (error.message?.includes('Não foram encontrados débitos')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Falha na comunicação com a prefeitura: ' + error.message });
  }
}
