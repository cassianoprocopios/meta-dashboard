/**
 * Testa o endpoint /admin/financeiro/comanda/lista para obter comandas
 * e depois abre uma comanda individual para ver os serviços por categoria.
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
            const entry = { url, status, body: text.substring(0, 5000) };
            apiLog.push(entry);
            if ((contentType.includes("json") || text.startsWith("[") || text.startsWith("{")) && text.length > 20) {
              console.log(`[JSON API] ${status} ${url.substring(0, 150)}`);
              console.log(`  ${text.substring(0, 400)}`);
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
    
    // ===== TESTAR ENDPOINT DE LISTA DE COMANDAS =====
    console.log("\n2. Testando endpoint de lista de comandas para 01/04/2026...");
    
    // Endpoint descoberto: /admin/financeiro/comanda/lista?status=2&parTipoComanda=1&parDataIni=DD/MM/YYYY&parDataFim=DD/MM/YYYY
    const listaUrl = `${ADMIN_URL}/admin/financeiro/comanda/lista?status=2&parTipoComanda=1&parDataIni=01/04/2026&parDataFim=01/04/2026&draw=1&start=0&length=500`;
    
    const listaResp = await page.evaluate(async (url) => {
      const r = await fetch(url, { 
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json, text/javascript, */*; q=0.01"
        }
      });
      const text = await r.text();
      return { status: r.status, text: text.substring(0, 10000) };
    }, listaUrl);
    
    console.log(`Status: ${listaResp.status}`);
    console.log(`Resposta (primeiros 2000): ${listaResp.text.substring(0, 2000)}`);
    
    // Salvar resposta completa
    fs.writeFileSync("/tmp/avec-lista-comandas-01-04.json", listaResp.text);
    
    // Extrair tokens de comandas do HTML
    const tokenMatches = listaResp.text.match(/abrirComanda\('([^']+)'/g);
    if (tokenMatches) {
      console.log(`\nTokens de comandas encontrados: ${tokenMatches.length}`);
      console.log("Primeiros 3 tokens:", tokenMatches.slice(0, 3));
    }
    
    // ===== ABRIR UMA COMANDA INDIVIDUAL =====
    console.log("\n3. Abrindo uma comanda individual para ver serviços...");
    apiLog.length = 0;
    
    // Navegar para a página de comandas e clicar em uma comanda
    await page.goto(`${ADMIN_URL}/admin/financeiro/comanda/historico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Filtrar por 01/04/2026
    const parDataIniInput = await page.$('input[name="parDataIni"]');
    const parDataFimInput = await page.$('input[name="parDataFim"]');
    
    if (parDataIniInput && parDataFimInput) {
      console.log("Preenchendo datas...");
      await parDataIniInput.click({ clickCount: 3 });
      await parDataIniInput.type("01/04/2026");
      await parDataFimInput.click({ clickCount: 3 });
      await parDataFimInput.type("01/04/2026");
      
      // Clicar em Buscar
      const btnBuscar = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find(b => b.textContent?.trim().toLowerCase().includes("buscar"));
      });
      if (btnBuscar) {
        await btnBuscar.click();
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    
    await page.screenshot({ path: "/tmp/avec-comandas-01-04-filtrado.png", fullPage: true });
    
    const textoFiltrado = await page.evaluate(() => document.body.innerText);
    console.log("Texto após filtro (primeiros 2000):", textoFiltrado.substring(0, 2000));
    
    // Clicar no botão de editar da primeira comanda
    const btnEditar = await page.$('a.btn i.icon-pencil');
    if (btnEditar) {
      console.log("Clicando no botão de editar da primeira comanda...");
      await btnEditar.click();
      await new Promise(r => setTimeout(r, 5000));
      
      await page.screenshot({ path: "/tmp/avec-comanda-detalhe.png", fullPage: true });
      
      const textoDetalhe = await page.evaluate(() => document.body.innerText);
      console.log("Texto detalhe da comanda (primeiros 3000):", textoDetalhe.substring(0, 3000));
    } else {
      // Tentar via JavaScript
      console.log("Tentando abrir comanda via JavaScript...");
      
      // Verificar se há comandas na tabela
      const comandas = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll("table tr"));
        return rows.map(r => r.textContent?.trim().substring(0, 100)).filter(t => t && t.includes("R$"));
      });
      console.log("Comandas na tabela:", comandas.slice(0, 5));
      
      // Tentar clicar no ícone de editar
      const icones = await page.$$("i.icon-pencil");
      console.log(`Ícones de editar encontrados: ${icones.length}`);
      
      if (icones.length > 0) {
        const parentBtn = await icones[0].evaluateHandle(el => el.closest("a"));
        if (parentBtn) {
          await parentBtn.click();
          await new Promise(r => setTimeout(r, 5000));
          
          await page.screenshot({ path: "/tmp/avec-comanda-detalhe.png", fullPage: true });
          const textoDetalhe = await page.evaluate(() => document.body.innerText);
          console.log("Texto detalhe:", textoDetalhe.substring(0, 3000));
        }
      }
    }
    
    // Verificar API calls após abrir comanda
    console.log(`\nAPI calls após abrir comanda: ${apiLog.length}`);
    for (const entry of apiLog) {
      if (entry.body && !entry.body.includes("<!DOCTYPE") && entry.body.length > 10) {
        console.log(`[API] ${entry.status} ${entry.url.substring(0, 150)}`);
        console.log(`  ${entry.body.substring(0, 500)}`);
        console.log();
      }
    }
    
    // ===== TESTAR ENDPOINT DE BUSCAR COMANDA =====
    console.log("\n4. Testando endpoint /admin/financeiro/comanda/buscar...");
    
    // Extrair um token de comanda da lista
    let tokenComanda = null;
    try {
      const listaData = JSON.parse(listaResp.text);
      if (listaData.aaData && listaData.aaData.length > 0) {
        // Extrair token do HTML da primeira comanda
        const primeiraComanda = listaData.aaData[0];
        const tokenMatch = primeiraComanda[5]?.match(/abrirComanda\('([^']+)'/);
        if (tokenMatch) {
          tokenComanda = tokenMatch[1];
          console.log("Token da primeira comanda:", tokenComanda.substring(0, 50) + "...");
        }
      }
    } catch (e) {
      console.log("Erro ao extrair token:", e.message);
    }
    
    if (tokenComanda) {
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
        return { status: r.status, text: text.substring(0, 5000) };
      }, `${ADMIN_URL}/admin/financeiro/comanda/buscar`, tokenComanda);
      
      console.log(`Status buscar: ${buscarResp.status}`);
      console.log(`Resposta buscar (primeiros 3000): ${buscarResp.text.substring(0, 3000)}`);
      fs.writeFileSync("/tmp/avec-comanda-detalhe-api.json", buscarResp.text);
    }
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
