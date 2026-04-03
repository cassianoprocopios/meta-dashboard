/**
 * Script para buscar o relatório 0184 (Faturamento por tipos de venda)
 * da Seraphine no Avec para o dia 02/04/2026
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const email = 'seraphinebeauty24@gmail.com';
const senha = 'Seraphine@2024';
const dataIni = '02/04/2026';
const dataFim = '02/04/2026';
const CHROMIUM_PATH = '/usr/bin/chromium-browser';

async function main() {
  console.log('Buscando relatório 0184 (Faturamento por tipos de venda) Seraphine 02/04/2026...');

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Passo 1: Acessar o admin e fazer login
    const loginUrl = `https://admin.avec.beauty/seraphine-beauty-ltda/admin/`;
    console.log('Acessando admin:', loginUrl);
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Verificar se precisa de login
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      console.log('Preenchendo email...');
      await emailInput.type(email);
      const senhaInput = await page.$('input[type="password"]');
      if (senhaInput) {
        await senhaInput.type(senha);
      }
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    } else {
      // Tentar via URL com email
      await page.goto(`https://admin.avec.beauty/seraphine-beauty-ltda/admin/?email=${encodeURIComponent(email)}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      const senhaInput = await page.$('input[type="password"]');
      if (senhaInput) {
        console.log('Preenchendo senha...');
        await senhaInput.type(senha);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
      }
    }

    console.log('URL após login:', page.url());
    await page.screenshot({ path: '/tmp/avec-login-status.png' });

    // Passo 2: Navegar para o relatório 0184
    const relUrl = `https://admin.avec.beauty/seraphine-beauty-ltda/admin/relatorio/0184?dataIni=${encodeURIComponent(dataIni)}&dataFim=${encodeURIComponent(dataFim)}`;
    console.log('Acessando relatório 0184:', relUrl);
    await page.goto(relUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('URL atual:', page.url());
    await page.screenshot({ path: '/tmp/avec-rel-0184.png', fullPage: true });
    console.log('Screenshot salvo em /tmp/avec-rel-0184.png');

    // Extrair texto da página
    const textoGeral = await page.evaluate(() => (document.body as any).innerText);
    writeFileSync('/tmp/avec-rel-0184-texto.txt', textoGeral);
    console.log('\nTEXTO DA PÁGINA (primeiros 4000 chars):\n', textoGeral.substring(0, 4000));

    // Extrair tabelas
    const tabelas = await page.evaluate(() => {
      const tbs = document.querySelectorAll('table');
      const res: string[] = [];
      tbs.forEach((t: any, i: number) => {
        res.push(`\n=== TABELA ${i + 1} ===\n${t.innerText}`);
      });
      return res.join('\n');
    });
    if (tabelas) {
      writeFileSync('/tmp/avec-rel-0184-tabelas.txt', tabelas);
      console.log('\nTABELAS:\n', tabelas.substring(0, 3000));
    }

    // Interceptar chamadas de API feitas pela página
    const apiCalls: string[] = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/admin/') && !url.includes('.js') && !url.includes('.css')) {
        try {
          const ct = response.headers()['content-type'] ?? '';
          if (ct.includes('json') || ct.includes('html')) {
            const body = await response.text().catch(() => '');
            if (body.length > 10 && body.length < 50000) {
              apiCalls.push(`URL: ${url}\nSTATUS: ${response.status()}\nBODY: ${body.substring(0, 500)}\n---`);
            }
          }
        } catch { /* ignorar */ }
      }
    });

    // Tentar clicar em botão de busca se existir
    const btnBuscar = await page.$('button[type="submit"], input[type="submit"], .btn-buscar, .btn-primary');
    if (btnBuscar) {
      console.log('Clicando em botão de busca...');
      await btnBuscar.click();
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: '/tmp/avec-rel-0184-apos-busca.png', fullPage: true });
    }

    if (apiCalls.length > 0) {
      writeFileSync('/tmp/avec-rel-0184-api.txt', apiCalls.join('\n'));
      console.log('\nAPI CALLS CAPTURADAS:', apiCalls.length);
      console.log(apiCalls.slice(0, 3).join('\n'));
    }

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
