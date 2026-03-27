import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CNPJ = '47272234000151';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  
  await page.goto('https://e-gov.betha.com.br/cdweb/03114-548/contribuinte/con_situacaocontribuinte.faces', {
    waitUntil: 'networkidle2', timeout: 30000
  });

  await page.evaluate(() => document.querySelector('button[title="Não responder"]')?.click()).catch(() => {});

  await page.click('.cnpj.btModo').catch(() => {});
  await page.waitForSelector('#mainForm\\:cnpj', { visible: true });
  await page.type('#mainForm\\:cnpj', CNPJ, { delay: 10 });
  await page.click('#mainForm\\:btCnpj');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});

  await page.evaluate(() => {
    const ms = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim() === 'Marcar todas');
    if (ms) ms.click();
    else document.querySelectorAll('input[id^="P"]').forEach(c => c.click());
  });
  
  await page.waitForFunction(() => {
    const em = document.querySelector('#mainForm\\:emitirIndividual');
    return em && !em.disabled;
  }, { timeout: 15000 });

  await page.click('#mainForm\\:emitirIndividual').catch(e => {
    return page.click('#mainForm\\:emitir');
  });
  
  console.log('Esperando 10s...');
  await new Promise(r => setTimeout(r, 10000));
  
  const html = await page.content();
  fs.writeFileSync('tela.html', html);
  console.log('Salvo tela.html');

  await browser.close();
})();
