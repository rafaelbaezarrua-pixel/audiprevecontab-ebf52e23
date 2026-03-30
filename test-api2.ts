import puppeteer from 'puppeteer-core';

(async () => {
    const isLocal = true;
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 900 },
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });
    
    const page = await browser.newPage();
    let interceptedPdfUrl = null;
    page.on('response', async (res) => {
        try {
          const url = res.url();
          const contentType = res.headers()['content-type'] || '';
          if (contentType.includes('application/pdf') || (url.includes('reportasync.faces') && !url.includes('.js') && !url.includes('.css'))) {
            interceptedPdfUrl = url;
            console.log('[INTERCEPT] ✅ URL do PDF identificada via response:', url);
          }
        } catch (e) { /* ignore */ }
    });

    console.log('[1] Acessando portal...');
    await page.goto('https://e-gov.betha.com.br/cdweb/03114-548/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => document.querySelector('button[title="Não responder"]')?.click()).catch(() => {});

    console.log('[2] CNPJ...');
    await page.click('.cnpj.btModo').catch(() => {});
    await page.waitForSelector('#mainForm\\:cnpj', { visible: true });
    await page.type('#mainForm\\:cnpj', '47272234000151');
    await page.click('#mainForm\\:btCnpj');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

    console.log('[3] Verificando débitos...');
    const hasDebits = await page.evaluate(() => document.querySelectorAll('input[id^="P"]').length > 0);
    if (!hasDebits) return console.log('Sem débitos.');

    // Clique nativo
    console.log('Procurando Marcar Todas...');
    const marcarTodas = await page.$x('//a[contains(text(), "Marcar todas")]');
    if (marcarTodas.length > 0) {
        console.log('Clicando em Marcar Todas...');
        await (marcarTodas[0] as any).click();
    } else {
        console.log('Clicando no primeiro checkbox...');
        await page.click('input[id^="P"]');
    }

    console.log('Aguardando JSF habilitar botão Emitir...');
    await page.waitForFunction(() => {
        const em1 = document.querySelector('#mainForm\\:emitir');
        const em2 = document.querySelector('#mainForm\\:emitirIndividual');
        return (em1 && !em1.disabled) || (em2 && !em2.disabled);
    }, { timeout: 15000 });
    console.log('✅ Botão Emitir HABILITADO NATURAMENTE PELO JSF!');

    console.log('Clicando em Emitir Individual ou Emitir...');
    await page.click('#mainForm\\:emitirIndividual').catch(async e => {
      console.log('Caiu pro fallback do emitir central');
      await page.click('#mainForm\\:emitir');
    });

    console.log('[5] Aguardando interceptação da resposta PDF...');
    const pdfUrl = await new Promise((resolve, reject) => {
      const deadline = Date.now() + 60000;
      const poll = async () => {
        if (interceptedPdfUrl) return resolve(interceptedPdfUrl);
        if (Date.now() > deadline) return reject(new Error('Timeout'));
        
        try {
          await page.waitForSelector(`::-p-xpath(//button[contains(text(), "Salvar") or contains(text(), "Download")] | //span[contains(text(), "Salvar")]/parent::* | //a[contains(text(), "Salvar")])`, { visible: true, timeout: 500 })
            .then(async btn => {
              console.log('[5] Botão Salvar (WebView) encontrado! Clicando...');
              await (btn as any).click();
            }).catch(() => {});
        } catch(e) { /* ignore */ }
        
        setTimeout(poll, 400);
      };
      poll();
    });

    console.log('🎉 SUCESSO:', pdfUrl);
    await browser.close();
})();
