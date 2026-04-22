import puppeteer from 'puppeteer-core';

async function captureHTML() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const loginUrl = 'https://admin.avec.beauty/seraphine-beauty-ltda/admin/?email=seraphinebeauty24@gmail.com';
    
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    const senhaInput = await page.$('input[type="password"]');
    await senhaInput?.click({ clickCount: 3 });
    await senhaInput?.type('Dxj4oue@', { delay: 50 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {}),
      page.keyboard.press('Enter')
    ]);
    
    await page.waitForTimeout(2000);
    
    // Navegar para Relatório 0184
    await page.goto('https://admin.avec.beauty/seraphine-beauty-ltda/admin/relatorios/0184', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Preencher datas
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type('21/04/2026', { delay: 50 });
      
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type('21/04/2026', { delay: 50 });
    }
    
    // Clicar em buscar
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text?.includes('Buscar') || text?.includes('Gerar')) {
        await btn.click();
        break;
      }
    }
    
    await page.waitForTimeout(3000);
    
    // Capturar HTML
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync('/tmp/avec-relatorio-html.txt', html);
    
    console.log('✓ HTML capturado em /tmp/avec-relatorio-html.txt');
    console.log(`Tamanho: ${html.length} caracteres`);
    
  } catch (e) {
    console.error('✗ Erro:', e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }
  
  process.exit(0);
}

captureHTML();
