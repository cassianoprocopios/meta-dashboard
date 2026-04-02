/**
 * Testa o endpoint de buscar comanda individual com o token obtido da lista.
 * Objetivo: ver se a comanda retorna dados de serviços por categoria.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";

const EMAIL = "seraphinebeauty24@gmail.com";
const SENHA = "Dxj4oue@";
const SLUG = "seraphine-beauty-ltda";
const ADMIN_URL = "https://admin.avec.beauty";

// Token extraído da lista de comandas do dia 01/04/2026
// Comanda Nº0041 - Michele Evans - R$ 75,00
const TOKEN_COMANDA = "d4745b44914219cf84ad5e6e32e775e5888b98ea051e4bd067e2e935c05f63c1e11fb4ce3888a78d38eb1ffe0b1efeaffe72c11476df39228cac13d78d1b62b3ymbvs6tjNjRzC+LikhKIb7iM871fHk3JpHZUiGbaH0g=";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const apiLog = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
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
          !url.includes("doubleclick") && !url.includes("appcache")) {
        try {
          const text = await response.text();
          if (text.length > 5 && text.length < 500000) {
            const entry = { url, status, body: text.substring(0, 10000) };
            apiLog.push(entry);
            if ((contentType.includes("json") || text.startsWith("[") || text.startsWith("{")) && text.length > 20) {
              console.log(`[JSON API] ${status} ${url.substring(0, 150)}`);
              console.log(`  ${text.substring(0, 600)}`);
              console.log();
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
    
    // ===== TESTAR ENDPOINT DE BUSCAR COMANDA =====
    console.log("\n2. Testando endpoint /admin/financeiro/comanda/buscar com token...");
    
    const buscarResp = await page.evaluate(async (url, token) => {
      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json, text/javascript, */*; q=0.01"
        },
        body: `token=${encodeURIComponent(token)}&tipo=comanda`
      });
      const text = await r.text();
      return { status: r.status, text };
    }, `${ADMIN_URL}/admin/financeiro/comanda/buscar`, TOKEN_COMANDA);
    
    console.log(`Status: ${buscarResp.status}`);
    console.log(`Resposta completa: ${buscarResp.text.substring(0, 5000)}`);
    fs.writeFileSync("/tmp/avec-comanda-buscar-resp.json", buscarResp.text);
    
    // ===== TESTAR OUTROS ENDPOINTS COM O TOKEN =====
    console.log("\n3. Testando outros endpoints com o token...");
    
    const endpointsParaTestar = [
      { url: `${ADMIN_URL}/admin/financeiro/comanda/buscar`, method: "POST", body: `token=${encodeURIComponent(TOKEN_COMANDA)}&tipo=comanda` },
      { url: `${ADMIN_URL}/admin/financeiro/comanda/buscar`, method: "POST", body: `token=${encodeURIComponent(TOKEN_COMANDA)}` },
      { url: `${ADMIN_URL}/admin/financeiro/comanda/buscar?token=${encodeURIComponent(TOKEN_COMANDA)}`, method: "GET" },
      { url: `${ADMIN_URL}/admin/financeiro/comanda/detalhe?token=${encodeURIComponent(TOKEN_COMANDA)}`, method: "GET" },
      { url: `${ADMIN_URL}/admin/financeiro/comanda/abrir?token=${encodeURIComponent(TOKEN_COMANDA)}`, method: "GET" },
    ];
    
    for (const ep of endpointsParaTestar) {
      try {
        const resp = await page.evaluate(async (ep) => {
          const opts = {
            method: ep.method,
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Accept": "application/json, text/javascript, */*; q=0.01"
            }
          };
          if (ep.body) {
            opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
            opts.body = ep.body;
          }
          const r = await fetch(ep.url, opts);
          const text = await r.text();
          return { status: r.status, text: text.substring(0, 2000) };
        }, ep);
        
        console.log(`  ${resp.status} ${ep.method} ${ep.url.substring(0, 100)}`);
        if (resp.text && !resp.text.includes("<!DOCTYPE") && resp.text.length > 10) {
          console.log(`  Resposta: ${resp.text.substring(0, 500)}`);
        }
      } catch (e) {
        console.log(`  ERRO: ${e.message}`);
      }
    }
    
    // ===== NAVEGAR PARA A COMANDA E INTERCEPTAR API =====
    console.log("\n4. Navegando para a página de comandas e abrindo uma comanda...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/financeiro/comanda/historico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Preencher datas
    await page.evaluate(() => {
      const parDataIni = document.querySelector('input[name="parDataIni"]');
      const parDataFim = document.querySelector('input[name="parDataFim"]');
      if (parDataIni) { parDataIni.value = "01/04/2026"; parDataIni.dispatchEvent(new Event("change")); }
      if (parDataFim) { parDataFim.value = "01/04/2026"; parDataFim.dispatchEvent(new Event("change")); }
    });
    
    // Clicar em Buscar
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.textContent?.trim().toLowerCase().includes("buscar"));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 5000));
    
    // Verificar se há comandas na tabela
    const comandas = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("#tableFilter tbody tr"));
      return rows.map(r => r.textContent?.trim().substring(0, 100));
    });
    console.log(`Comandas na tabela: ${comandas.length}`);
    console.log("Primeiras 3:", comandas.slice(0, 3));
    
    // Clicar no botão de editar da primeira comanda
    await page.evaluate(() => {
      const icone = document.querySelector("i.icon-pencil");
      if (icone) {
        const btn = icone.closest("a");
        if (btn) btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: "/tmp/avec-comanda-aberta.png", fullPage: true });
    
    const textoComanda = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto da comanda aberta (primeiros 3000):", textoComanda.substring(0, 3000));
    
    // Verificar API calls
    console.log(`\nAPI calls após abrir comanda: ${apiLog.length}`);
    for (const entry of apiLog) {
      if (entry.body && !entry.body.includes("<!DOCTYPE") && entry.body.length > 10) {
        console.log(`[API] ${entry.status} ${entry.url.substring(0, 150)}`);
        console.log(`  ${entry.body.substring(0, 1000)}`);
        console.log();
      }
    }
    
    fs.writeFileSync("/tmp/avec-api-comanda-aberta.json", JSON.stringify(apiLog, null, 2));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
