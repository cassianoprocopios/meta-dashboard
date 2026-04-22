import puppeteer from 'puppeteer';

async function captureAvecHTML() {
  console.log("\n=== CAPTURANDO HTML DO AVEC RELATÓRIO 0184 ===\n");
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.avec.app', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Preencher email
    await page.type('input[type="email"]', 'seraphinebeauty24@gmail.com', { delay: 50 });
    await page.waitForTimeout(500);
    
    // Preencher senha
    await page.type('input[type="password"]', 'Dxj4oue@', { delay: 50 });
    await page.waitForTimeout(500);
    
    // Clicar em entrar
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log("✓ Login realizado com sucesso");
    
    // Navegar para Relatório 0184
    // Procurar pelo link ou menu que leva ao Relatório 0184
    await page.goto('https://www.avec.app/relatorios/0184', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log("✓ Navegou para Relatório 0184");
    
    // Preencher data inicial: 18/04/2026
    const dataInicio = await page.$('input[name="dataInicio"]') || await page.$('input[placeholder*="Data"]');
    if (dataInicio) {
      await dataInicio.click({ clickCount: 3 });
      await page.type('input[name="dataInicio"]', '18/04/2026', { delay: 50 });
      console.log("✓ Data início preenchida");
    }
    
    // Preencher data final: 21/04/2026
    const dataFim = await page.$('input[name="dataFim"]');
    if (dataFim) {
      await dataFim.click({ clickCount: 3 });
      await page.type('input[name="dataFim"]', '21/04/2026', { delay: 50 });
      console.log("✓ Data fim preenchida");
    }
    
    // Clicar em buscar/gerar relatório
    const btnBuscar = await page.$('button:has-text("Buscar")') || await page.$('button:has-text("Gerar")');
    if (btnBuscar) {
      await btnBuscar.click();
      await page.waitForTimeout(2000);
      console.log("✓ Relatório gerado");
    }
    
    // Capturar HTML da tabela
    const tableHTML = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      if (tables.length === 0) return "NENHUMA TABELA ENCONTRADA";
      
      let html = "";
      tables.forEach((table, idx) => {
        html += `\n\n=== TABELA ${idx + 1} ===\n`;
        html += table.outerHTML;
      });
      return html;
    });
    
    // Salvar em arquivo
    const fs = require('fs');
    fs.writeFileSync('/tmp/avec-html-capture.html', tableHTML);
    
    console.log("\n✓ HTML capturado e salvo em /tmp/avec-html-capture.html");
    console.log(`Tamanho: ${tableHTML.length} caracteres`);
    
  } catch (e) {
    console.error("✗ ERRO:", e instanceof Error ? e.message : String(e));
  } finally {
    if (browser) await browser.close();
  }
  
  process.exit(0);
}

captureAvecHTML();
