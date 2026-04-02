/**
 * Intercepta chamadas de API do Avec ao navegar no relatório de serviços.
 * Usa o admin.avec.beauty com login direto.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";

const EMAIL = "seraphinebeauty24@gmail.com";
const SENHA = "Dxj4oue@";
const SLUG = "seraphine-beauty-ltda";
const ADMIN_URL = "https://admin.avec.beauty";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const apiLog = [];

  try {
    const page = await browser.newPage();
    
    // Interceptar TODAS as requisições de API
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      req.continue();
    });
    
    page.on("response", async (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()["content-type"] || "";
      
      // Capturar apenas respostas JSON ou texto relevantes do Avec
      if (url.includes("admin.avec.beauty") && 
          !url.includes(".js") && !url.includes(".css") && 
          !url.includes(".png") && !url.includes(".svg") && 
          !url.includes(".ico") && !url.includes("manifest") &&
          !url.includes("hubspot") && !url.includes("hyperlocal")) {
        try {
          const text = await response.text();
          if (text.length > 5 && text.length < 500000) {
            const entry = { url, status, contentType: contentType.substring(0, 50), body: text.substring(0, 2000) };
            apiLog.push(entry);
            console.log(`[API] ${status} ${url}`);
            if (contentType.includes("json") || text.startsWith("[") || text.startsWith("{")) {
              console.log(`  JSON: ${text.substring(0, 300)}`);
            }
          }
        } catch (e) {}
      }
    });
    
    // Login direto no admin
    const loginUrl = `${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`;
    console.log("1. Login:", loginUrl);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Preencher senha
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await page.type('input[type="password"]', SENHA);
      const botao = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find(b => b.textContent?.trim().toLowerCase().includes("entrar"));
      });
      if (botao) await botao.click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    } catch (e) {
      console.log("Senha não necessária ou já logado");
    }
    
    console.log("URL após login:", page.url());
    
    // Aguardar um pouco
    await new Promise(r => setTimeout(r, 2000));
    
    // ===== EXPLORAR RELATÓRIO DE SERVIÇOS =====
    console.log("\n2. Acessando /admin/relatorio/servico...");
    apiLog.length = 0; // Limpar log anterior
    
    await page.goto(`${ADMIN_URL}/admin/relatorio/servico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-relatorio-1.png", fullPage: true });
    
    const texto1 = await page.evaluate(() => document.body.innerText);
    console.log("Texto (primeiros 1000):", texto1.substring(0, 1000));
    
    // Verificar se tem campos de data
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name") || el.getAttribute("ng-model") || el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value
      }));
    });
    console.log("\nInputs:", JSON.stringify(inputs, null, 2));
    
    // Salvar log de API
    fs.writeFileSync("/tmp/avec-api-log-relatorio.json", JSON.stringify(apiLog, null, 2));
    console.log(`\nAPI calls capturadas: ${apiLog.length}`);
    
    // ===== EXPLORAR FINANCEIRO/CAIXA =====
    console.log("\n3. Acessando /admin/financeiro/caixa...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/financeiro/caixa`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-financeiro-caixa.png", fullPage: true });
    const texto2 = await page.evaluate(() => document.body.innerText);
    console.log("Texto caixa (primeiros 1000):", texto2.substring(0, 1000));
    
    fs.writeFileSync("/tmp/avec-api-log-caixa.json", JSON.stringify(apiLog, null, 2));
    console.log(`API calls caixa: ${apiLog.length}`);
    
    // ===== EXPLORAR FINANCEIRO/COMANDA =====
    console.log("\n4. Acessando /admin/financeiro/comanda...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/financeiro/comanda`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-financeiro-comanda.png", fullPage: true });
    const texto3 = await page.evaluate(() => document.body.innerText);
    console.log("Texto comanda (primeiros 1000):", texto3.substring(0, 1000));
    
    fs.writeFileSync("/tmp/avec-api-log-comanda.json", JSON.stringify(apiLog, null, 2));
    console.log(`API calls comanda: ${apiLog.length}`);
    
    // ===== TENTAR ENDPOINT DE CAIXA COM DATA =====
    console.log("\n5. Testando endpoints diretos...");
    
    const endpoints = [
      "/admin/financeiro/caixa/carregarCaixa?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/financeiro/caixa/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/relatorio/servico/carregarRelatorio?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/relatorio/servico/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/financeiro/comanda/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/financeiro/comanda/finalizadas/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
    ];
    
    for (const ep of endpoints) {
      const url = `${ADMIN_URL}${ep}`;
      try {
        const resp = await page.evaluate(async (url) => {
          const r = await fetch(url, { credentials: "include" });
          return { status: r.status, text: await r.text() };
        }, url);
        console.log(`  ${resp.status} ${ep}`);
        if (resp.status === 200 && resp.text.length > 10) {
          console.log(`  Resposta: ${resp.text.substring(0, 300)}`);
        }
      } catch (e) {
        console.log(`  ERRO ${ep}: ${e.message}`);
      }
    }
    
    // ===== NAVEGAR NO MENU PARA VER OPÇÕES =====
    console.log("\n6. Verificando links do menu...");
    await page.goto(`${ADMIN_URL}/admin/agenda`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a[href]")).map(a => ({
        href: a.getAttribute("href"),
        text: a.textContent?.trim().substring(0, 50)
      })).filter(l => l.href && l.href.includes("admin") && !l.href.includes("#") && l.text);
    });
    console.log("Links do menu:", JSON.stringify(links, null, 2));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
