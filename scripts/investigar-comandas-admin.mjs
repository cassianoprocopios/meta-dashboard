/**
 * Investiga as Comandas Finalizadas no admin do Avec (não no terminal).
 * Intercepta chamadas de API para encontrar dados por categoria de serviço.
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
    
    // Interceptar respostas de API relevantes
    page.on("response", async (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()["content-type"] || "";
      
      if (url.includes("admin.avec.beauty") && 
          !url.includes(".js") && !url.includes(".css") && 
          !url.includes(".png") && !url.includes(".svg") && 
          !url.includes(".ico") && !url.includes("manifest") &&
          !url.includes("google") && !url.includes("hubspot") && 
          !url.includes("hyperlocal") && !url.includes("facebook") &&
          !url.includes("doubleclick")) {
        try {
          const text = await response.text();
          if (text.length > 5 && text.length < 500000) {
            const entry = { url, status, body: text.substring(0, 3000) };
            apiLog.push(entry);
            if (contentType.includes("json") || text.startsWith("[") || text.startsWith("{")) {
              console.log(`[JSON API] ${status} ${url}`);
              console.log(`  ${text.substring(0, 500)}`);
            }
          }
        } catch (e) {}
      }
    });
    
    // Login direto no admin
    const loginUrl = `${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`;
    console.log("1. Login:", loginUrl);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
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
      console.log("Já logado ou senha não necessária");
    }
    
    console.log("URL após login:", page.url());
    await new Promise(r => setTimeout(r, 2000));
    
    // ===== COMANDAS FINALIZADAS NO ADMIN =====
    console.log("\n2. Acessando Comandas Finalizadas no admin...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/financeiro/comanda/finalizadas`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-admin-comandas-fin.png", fullPage: true });
    
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("Texto (primeiros 2000):", texto.substring(0, 2000));
    
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        type: el.getAttribute("type"),
        name: el.getAttribute("name") || el.getAttribute("ng-model") || el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value
      }));
    });
    console.log("\nInputs:", JSON.stringify(inputs, null, 2));
    
    // Tentar filtrar por data
    console.log("\n3. Tentando filtrar por 01/04/2026...");
    
    // Verificar se tem campo de data
    const dateInput = await page.$('input[type="date"]');
    if (dateInput) {
      await dateInput.click({ clickCount: 3 });
      await dateInput.type("2026-04-01");
      console.log("Data preenchida");
    }
    
    // Tentar clicar em filtrar
    const btnFiltrar = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, a.btn, input[type='submit']"));
      return btns.find(b => {
        const text = (b.textContent || "").toLowerCase();
        return text.includes("filtrar") || text.includes("buscar") || text.includes("pesquisar");
      });
    });
    if (btnFiltrar) {
      console.log("Botão filtrar encontrado, clicando...");
      await btnFiltrar.click();
      await new Promise(r => setTimeout(r, 5000));
    }
    
    await page.screenshot({ path: "/tmp/avec-admin-comandas-fin-filtrado.png", fullPage: true });
    
    const textoFiltrado = await page.evaluate(() => document.body.innerText);
    console.log("Texto após filtro (primeiros 3000):", textoFiltrado.substring(0, 3000));
    
    // Salvar log
    fs.writeFileSync("/tmp/avec-api-log-comandas-admin.json", JSON.stringify(apiLog, null, 2));
    console.log(`\nAPI calls capturadas: ${apiLog.length}`);
    
    // ===== TENTAR ENDPOINT DIRETO DE COMANDAS =====
    console.log("\n4. Testando endpoints diretos de comandas...");
    
    const endpoints = [
      "/admin/financeiro/comanda/finalizadas/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/financeiro/comanda/listar?dataInicio=01/04/2026&dataFim=01/04/2026&status=finalizado",
      "/admin/financeiro/comanda/buscar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/financeiro/comanda/relatorio?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/relatorio/servico/listar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/relatorio/servico/buscar?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/consultoria/dashboard/262/dados?dataInicio=01/04/2026&dataFim=01/04/2026",
      "/admin/consultoria/dashboard/262/carregar?dataInicio=01/04/2026&dataFim=01/04/2026",
    ];
    
    for (const ep of endpoints) {
      const url = `${ADMIN_URL}${ep}`;
      try {
        const resp = await page.evaluate(async (url) => {
          const r = await fetch(url, { credentials: "include" });
          const text = await r.text();
          return { status: r.status, text: text.substring(0, 500) };
        }, url);
        console.log(`  ${resp.status} ${ep}`);
        if (resp.status === 200 && resp.text.length > 10 && !resp.text.includes("<!DOCTYPE")) {
          console.log(`  Resposta: ${resp.text}`);
        }
      } catch (e) {
        console.log(`  ERRO ${ep}: ${e.message}`);
      }
    }
    
    // ===== VERIFICAR RELATÓRIO DE SERVIÇOS COM INTERAÇÃO =====
    console.log("\n5. Acessando Relatório de Serviços com interação...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/relatorio/servico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Verificar o HTML completo para encontrar ng-model e endpoints
    const html = await page.evaluate(() => {
      // Pegar scripts inline que podem revelar endpoints
      const scripts = Array.from(document.querySelectorAll("script:not([src])")).map(s => s.textContent?.substring(0, 500));
      return scripts.filter(s => s && s.length > 50).join("\n---\n");
    });
    console.log("Scripts inline:", html.substring(0, 2000));
    
    // Verificar ng-controller e ng-model
    const ngInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("[ng-controller], [ng-model], [ng-click]"));
      return elements.map(el => ({
        tag: el.tagName,
        ngController: el.getAttribute("ng-controller"),
        ngModel: el.getAttribute("ng-model"),
        ngClick: el.getAttribute("ng-click"),
        id: el.id,
        className: el.className?.substring(0, 50)
      })).filter(e => e.ngController || e.ngModel || e.ngClick);
    });
    console.log("\nElementos Angular:", JSON.stringify(ngInfo.slice(0, 20), null, 2));
    
    fs.writeFileSync("/tmp/avec-api-log-relatorio-servico.json", JSON.stringify(apiLog, null, 2));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
