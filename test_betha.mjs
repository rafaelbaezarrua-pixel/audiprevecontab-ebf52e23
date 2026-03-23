import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'step1.png' });
  
  const html = await page.content();
  fs.writeFileSync('step1.html', html);
  
  console.log('Saved step1.png and step1.html');
  await browser.close();
})();
