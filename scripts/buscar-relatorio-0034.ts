import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const email = 'seraphinebeauty24@gmail.com';
const senha = 'Seraphine@2024';
const dataIni = '02/04/2026';
const dataFim = '02/04/2026';

async function main() {
  console.log('Buscando relatório 0034 Seraphine 02/04/2026...');
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    // Login
    const loginUrl = `https://admin.avec.beauty/seraphine-beauty-ltda/admin/?email=${encodeURIComponent(email)}`;
    console.log('Acessando:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Preencher senha se necessário
    const senhaInput = await page.$('input[type="password"]');
    if (senhaInput) {
      console.log('Preenchendo senha...');
      await senhaInput.type(senha);
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
    
    console.log('URL após login:', page.url());
    
    // Navegar para o relatório 0034
    const relUrl = `https://admin.avec.beauty/seraphine-beauty-ltda/admin/relatorio/0034?dataIni=${dataIni}&dataFim=${dataFim}`;
    console.log('Acessando relatório:', relUrl);
    
    await page.goto(relUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('URL atual:', page.url());
    
    // Capturar screenshot
    await page.screenshot({ path: '/tmp/avec-rel-0034.png', fullPage: true });
    console.log('Screenshot salvo em /tmp/avec-rel-0034.png');
    
    // Tentar extrair tabelas de dados
    const textoTabela = await page.evaluate(() => {
      const tabelas = document.querySelectorAll('table');
      const resultados: string[] = [];
      tabelas.forEach((t: any, i: number) => {
        resultados.push(`\n=== TABELA ${i+1} ===\n${t.innerText}`);
      });
      return resultados.join('\n');
    });
    
    if (textoTabela) {
      console.log('DADOS DAS TABELAS:', textoTabela.substring(0, 5000));
      writeFileSync('/tmp/avec-rel-0034-tabelas.txt', textoTabela);
    }
    
    // Tentar extrair texto geral da página
    const textoGeral = await page.evaluate(() => (document.body as any).innerText);
    console.log('\nTEXTO GERAL (primeiros 3000 chars):', textoGeral.substring(0, 3000));
    writeFileSync('/tmp/avec-rel-0034-texto.txt', textoGeral);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
