import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
  
  await page.select('select[name="mainForm:estados"]', '21');
  await page.waitForFunction(() => !document.querySelector('select[name="mainForm:municipios"]').disabled);
  
  const cityId = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('select[name="mainForm:municipios"] option'));
    const prOption = options.find(o => o.textContent.includes('Fazenda Rio Grande'));
    return prOption ? prOption.value : null;
  });
  
  if (cityId) {
    await page.select('select[name="mainForm:municipios"]', cityId);
    await page.evaluate((id) => verifyCity(document.querySelector('select[name="mainForm:municipios"]')), cityId);
    await new Promise(r => setTimeout(r, 1000));
    await page.click('a#mainForm\\:selecionar');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Now click on Situacao do contribuinte
    await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
    
    await page.screenshot({ path: 'step3.png' });
    fs.writeFileSync('step3.html', await page.content());
    console.log('Saved step3.html and step3.png');
  }

  await browser.close();
})();
