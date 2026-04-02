/**
 * Diagnóstico dos endpoints do Avec para entender o formato dos dados retornados.
 * Testa diferentes endpoints para encontrar o que retorna faturamento por categoria.
 */

import puppeteer from "puppeteer-core";

const ADMIN_URL = "https://admin.avec.beauty";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";
const email = "seraphinebeauty24@gmail.com";
const senha = "Dxj4oue@";
const salaoSlug = "seraphine-beauty-ltda";

// Fazer login e obter cookies
async function login() {
  const loginUrl = `${ADMIN_URL}/${salaoSlug}/admin/?email=${encodeURIComponent(email)}`;
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    const senhaInput = await page.$('input[type="password"]');
    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const botao = botoes.find(b => b.textContent?.includes('Entrar') || b.type === 'submit');
      if (botao) botao.click();
    });
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    console.log(`✅ Login OK! ${cookies.length} cookies. URL: ${page.url()}`);
    return cookieStr;
  } finally {
    await browser.close();
  }
}

const cookies = await login();

const headers = {
  Cookie: cookies,
  Accept: "application/json, text/html",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
};

// Testar endpoint de consultoria para um dia específico (01/04/2026)
const endpoints = [
  // Consultoria por dia
  `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=01-04-2026&dataFim=01-04-2026`,
  // Consultoria por mês
  `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=mes&mesFiltro=04-2026`,
  // Histórico de caixas
  `${ADMIN_URL}/admin/financeiro/caixa/historico?fechamento=01%2F04%2F2026`,
  // Relatório de serviços
  `${ADMIN_URL}/admin/relatorio/servicos?dataInicio=01-04-2026&dataFim=01-04-2026`,
  // Comandas finalizadas
  `${ADMIN_URL}/admin/financeiro/comanda/finalizadas?dataInicio=01/04/2026&dataFim=01/04/2026`,
];

for (const url of endpoints) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testando: ${url.substring(0, 100)}...`);
  
  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    
    const text = await res.text();
    
    if (res.headers.get("content-type")?.includes("json")) {
      try {
        const json = JSON.parse(text);
        console.log(`Resposta JSON (primeiros 500 chars):`);
        console.log(JSON.stringify(json, null, 2).substring(0, 500));
      } catch {
        console.log(`Texto (primeiros 300 chars): ${text.substring(0, 300)}`);
      }
    } else {
      // HTML - extrair partes relevantes
      const categorias = text.match(/(?:Cabelo|Manicure|Sobrancelha|Pacote|Recorr)[^<]{0,100}/gi);
      if (categorias) {
        console.log(`Categorias encontradas no HTML:`);
        categorias.slice(0, 10).forEach(c => console.log(`  - ${c.trim()}`));
      }
      
      const valores = text.match(/R\$\s*[\d.,]+/g);
      if (valores) {
        console.log(`Valores R$ encontrados: ${valores.slice(0, 10).join(", ")}`);
      }
      
      console.log(`HTML (primeiros 300 chars): ${text.substring(0, 300).replace(/\s+/g, " ")}`);
    }
  } catch (e) {
    console.log(`❌ Erro: ${e.message}`);
  }
}
