import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://e-gov.betha.com.br/cdweb/03114-546/contribuinte/con_situacaocontribuinte.faces', { waitUntil: 'networkidle2' });
  
  // Select state PR (21)
  await page.select('select[name="mainForm:estados"]', '21');
  
  // Wait for cities to be enabled
  await page.waitForFunction(() => !document.querySelector('select[name="mainForm:municipios"]').disabled);
  
  // Get city ID for "Fazenda Rio Grande"
  const cityId = await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('select[name="mainForm:municipios"] option'));
    const prOption = options.find(o => o.textContent.includes('Fazenda Rio Grande'));
    return prOption ? prOption.value : null;
  });
  
  console.log('City ID for Fazenda Rio Grande:', cityId);
  
  if (cityId) {
    // Check if it works like the subagent: select the city in the actual select or use the custom dropdown
    // Let's just use page.select on the hidden select, then trigger the click on the result, or just page.select
    await page.select('select[name="mainForm:municipios"]', cityId);
    
    // The verifyCity function enables the btAccess. But let's evaluate it to make sure.
    await page.evaluate((id) => verifyCity(document.querySelector('select[name="mainForm:municipios"]')), cityId);
    
    // Wait a bit, then click Acessar
    await new Promise(r => setTimeout(r, 1000));
    const btn = await page.$('a#mainForm\\:selecionar');
    if (btn) {
      await btn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      await page.screenshot({ path: 'step2.png' });
      fs.writeFileSync('step2.html', await page.content());
      console.log('Saved step2.png and step2.html (after login)');
    }
  }

  await browser.close();
})();
