/**
 * Investiga o endpoint /admin/financeiro/comanda/historico do Avec
 * para extrair dados de faturamento por categoria de serviço.
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
              console.log(`[JSON API] ${status} ${url}`);
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
    
    // ===== COMANDAS FINALIZADAS (HISTÓRICO) =====
    console.log("\n2. Acessando /admin/financeiro/comanda/historico...");
    apiLog.length = 0;
    
    await page.goto(`${ADMIN_URL}/admin/financeiro/comanda/historico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-comanda-historico.png", fullPage: true });
    
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("Texto (primeiros 3000):", texto.substring(0, 3000));
    
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        type: el.getAttribute("type"),
        name: el.getAttribute("name") || el.getAttribute("ng-model") || el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value,
        ngModel: el.getAttribute("ng-model")
      }));
    });
    console.log("\nInputs:", JSON.stringify(inputs, null, 2));
    
    // Salvar log de API
    fs.writeFileSync("/tmp/avec-api-comanda-historico.json", JSON.stringify(apiLog, null, 2));
    console.log(`API calls capturadas: ${apiLog.length}`);
    
    // ===== FILTRAR POR DATA =====
    console.log("\n3. Tentando filtrar por 01/04/2026...");
    apiLog.length = 0;
    
    // Tentar preencher campos de data
    const dateInputs = await page.$$('input[type="date"], input[type="text"][ng-model*="ata"]');
    console.log(`Campos de data encontrados: ${dateInputs.length}`);
    
    for (let i = 0; i < dateInputs.length; i++) {
      const ngModel = await dateInputs[i].evaluate(el => el.getAttribute("ng-model") || el.getAttribute("id") || "");
      const placeholder = await dateInputs[i].evaluate(el => el.getAttribute("placeholder") || "");
      console.log(`  Campo ${i}: ng-model=${ngModel}, placeholder=${placeholder}`);
      await dateInputs[i].click({ clickCount: 3 });
      await dateInputs[i].type("01/04/2026");
    }
    
    // Clicar em filtrar/buscar
    const btnFiltrar = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, a.btn, input[type='submit']"));
      return btns.find(b => {
        const text = (b.textContent || "").toLowerCase();
        return text.includes("filtrar") || text.includes("buscar") || text.includes("pesquisar");
      });
    });
    if (btnFiltrar) {
      const btnText = await btnFiltrar.evaluate(el => el.textContent?.trim());
      console.log(`Botão encontrado: "${btnText}", clicando...`);
      await btnFiltrar.click();
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.log("Botão filtrar não encontrado");
    }
    
    await page.screenshot({ path: "/tmp/avec-comanda-historico-filtrado.png", fullPage: true });
    
    const textoFiltrado = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto após filtro (primeiros 3000):", textoFiltrado.substring(0, 3000));
    
    fs.writeFileSync("/tmp/avec-api-comanda-historico-filtrado.json", JSON.stringify(apiLog, null, 2));
    console.log(`API calls após filtro: ${apiLog.length}`);
    
    // Mostrar chamadas JSON relevantes
    for (const entry of apiLog) {
      if (entry.body && !entry.body.includes("<!DOCTYPE") && entry.body.length > 10) {
        console.log(`\n[API] ${entry.status} ${entry.url}`);
        console.log(`  ${entry.body.substring(0, 500)}`);
      }
    }
    
    // ===== TESTAR ENDPOINTS DIRETOS =====
    console.log("\n4. Testando endpoints diretos...");
    
    const cookies = await page.cookies();
    console.log(`Cookies disponíveis: ${cookies.length}`);
    
    const endpointsParaTestar = [
      `/admin/financeiro/comanda/historico/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/historico/listar?dataInicio=01-04-2026&dataFim=01-04-2026`,
      `/admin/financeiro/comanda/historico/buscar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/historico?dataInicio=01/04/2026&dataFim=01/04/2026&formato=json`,
      `/admin/financeiro/comanda/listar?dataInicio=01/04/2026&dataFim=01/04/2026&status=finalizado`,
      `/admin/financeiro/comanda/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/buscar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/relatorio?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/exportar?dataInicio=01/04/2026&dataFim=01/04/2026`,
    ];
    
    for (const ep of endpointsParaTestar) {
      try {
        const resp = await page.evaluate(async (url) => {
          const r = await fetch(url, { 
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Accept": "application/json, text/javascript, */*; q=0.01"
            }
          });
          const text = await r.text();
          return { status: r.status, text: text.substring(0, 800) };
        }, `${ADMIN_URL}${ep}`);
        
        console.log(`  ${resp.status} ${ep}`);
        if (resp.text && !resp.text.includes("<!DOCTYPE") && resp.text.length > 10) {
          console.log(`  Resposta: ${resp.text.substring(0, 400)}`);
        }
      } catch (e) {
        // Silenciar erros
      }
    }
    
    // ===== VERIFICAR O JS DO FINANCEIRO PARA ENCONTRAR ENDPOINTS =====
    console.log("\n5. Analisando financeiro.js para encontrar endpoints...");
    
    try {
      const resp = await page.evaluate(async () => {
        const r = await fetch("https://admin.avec.beauty/public/js/admin/financeiro/financeiro.js?v=1774865685", {
          credentials: "include"
        });
        return await r.text();
      });
      
      // Procurar por endpoints de comanda
      const matches = resp.match(/['"](\/admin\/financeiro\/comanda[^'"]+)['"]/g);
      if (matches) {
        console.log("Endpoints de comanda encontrados no JS:");
        const uniqueMatches = [...new Set(matches)];
        for (const m of uniqueMatches.slice(0, 30)) {
          console.log(`  ${m}`);
        }
      }
      
      // Procurar por endpoints de caixa
      const matchesCaixa = resp.match(/['"](\/admin\/financeiro\/caixa[^'"]+)['"]/g);
      if (matchesCaixa) {
        console.log("\nEndpoints de caixa encontrados no JS:");
        const uniqueMatchesCaixa = [...new Set(matchesCaixa)];
        for (const m of uniqueMatchesCaixa.slice(0, 30)) {
          console.log(`  ${m}`);
        }
      }
      
      // Salvar parte do JS para análise
      fs.writeFileSync("/tmp/avec-financeiro-js.txt", resp.substring(0, 50000));
    } catch (e) {
      console.log("Erro ao carregar financeiro.js:", e.message);
    }
    
    // ===== VERIFICAR O JS DE COMANDA V3 =====
    console.log("\n6. Analisando financeiro-comanda-v3.js...");
    
    try {
      const resp = await page.evaluate(async () => {
        const r = await fetch("https://admin.avec.beauty/public/js/admin/financeiro/financeiro-comanda-v3.js?v=1774865685", {
          credentials: "include"
        });
        return await r.text();
      });
      
      // Procurar por endpoints
      const matches = resp.match(/['"](\/admin[^'"]+)['"]/g);
      if (matches) {
        console.log("Endpoints encontrados no comanda-v3.js:");
        const uniqueMatches = [...new Set(matches)];
        for (const m of uniqueMatches.slice(0, 50)) {
          console.log(`  ${m}`);
        }
      }
      
      fs.writeFileSync("/tmp/avec-comanda-v3-js.txt", resp.substring(0, 100000));
      console.log(`JS salvo: ${resp.length} bytes`);
    } catch (e) {
      console.log("Erro ao carregar comanda-v3.js:", e.message);
    }
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
