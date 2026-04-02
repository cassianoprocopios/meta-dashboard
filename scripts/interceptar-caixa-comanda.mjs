/**
 * Intercepta chamadas de API do Avec ao navegar no histórico de caixas
 * e clicar em uma comanda individual para ver dados por categoria de serviço.
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
            if (contentType.includes("json") || (text.startsWith("[") || text.startsWith("{")) && text.length > 20) {
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
    
    // ===== HISTÓRICO DE CAIXAS COM DATA 01/04/2026 =====
    console.log("\n2. Acessando Histórico de Caixas para 01/04/2026...");
    apiLog.length = 0;
    
    // Acessar histórico de caixas
    await page.goto(`${ADMIN_URL}/admin/financeiro/caixa`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Clicar na aba "Histórico de Caixas"
    const abaHistorico = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll("a, button, li"));
      return links.find(l => l.textContent?.trim().toLowerCase().includes("histórico de caixas") || 
                             l.textContent?.trim().toLowerCase().includes("historico de caixas"));
    });
    if (abaHistorico) {
      console.log("Clicando na aba Histórico de Caixas...");
      await abaHistorico.click();
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Verificar URL e preencher data
    console.log("URL atual:", page.url());
    
    // Tentar preencher data 01/04/2026
    const dateInput = await page.$('input[type="date"], input[ng-model*="data"], input[ng-model*="Data"]');
    if (dateInput) {
      await dateInput.click({ clickCount: 3 });
      await dateInput.type("2026-04-01");
      console.log("Data preenchida");
    }
    
    // Clicar em filtrar
    const btnFiltrar = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, a.btn"));
      return btns.find(b => {
        const text = (b.textContent || "").toLowerCase();
        return text.includes("filtrar") || text.includes("buscar");
      });
    });
    if (btnFiltrar) {
      console.log("Clicando em filtrar...");
      await btnFiltrar.click();
      await new Promise(r => setTimeout(r, 3000));
    }
    
    await page.screenshot({ path: "/tmp/avec-historico-caixas.png", fullPage: true });
    
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("Texto (primeiros 2000):", texto.substring(0, 2000));
    
    // Salvar log de API do histórico
    fs.writeFileSync("/tmp/avec-api-historico.json", JSON.stringify(apiLog, null, 2));
    console.log(`API calls capturadas: ${apiLog.length}`);
    
    // ===== TENTAR CLICAR EM UMA COMANDA =====
    console.log("\n3. Tentando clicar em uma comanda...");
    apiLog.length = 0;
    
    // Procurar links de comandas na página
    const linksComanda = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href*='comanda'], a[href*='caixa'], button[ng-click*='comanda'], tr[ng-click]"));
      return links.map(l => ({
        href: l.getAttribute("href"),
        ngClick: l.getAttribute("ng-click"),
        text: l.textContent?.trim().substring(0, 50)
      })).filter(l => l.href || l.ngClick);
    });
    console.log("Links de comanda:", JSON.stringify(linksComanda.slice(0, 10), null, 2));
    
    // ===== TESTAR ENDPOINTS DIRETOS COM COOKIES =====
    console.log("\n4. Testando endpoints diretos com cookies de sessão...");
    
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    console.log(`Cookies disponíveis: ${cookies.length}`);
    
    // Testar endpoints via fetch com cookies
    const endpointsParaTestar = [
      // Histórico de caixas
      `/admin/financeiro/caixa/historico?fechamento=01%2F04%2F2026`,
      `/admin/financeiro/caixa/historico?fechamento=01/04/2026`,
      `/admin/financeiro/caixa/listarHistorico?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/caixa/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      // Comandas
      `/admin/financeiro/comanda/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/financeiro/comanda/listarFinalizadas?dataInicio=01/04/2026&dataFim=01/04/2026`,
      // Relatório de serviços
      `/admin/relatorio/servico/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/relatorio/servico/carregarRelatorio?dataInicio=01/04/2026&dataFim=01/04/2026`,
      // Consultoria
      `/admin/consultoria/dados?dashboard=262&dataInicio=01-04-2026&dataFim=01-04-2026`,
      `/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=01-04-2026&dataFim=01-04-2026`,
      `/admin/consultoria/dados?dashboard=262&periodo=dia&data=01-04-2026`,
      `/admin/consultoria/dados?dashboard=262&periodo=dia&data=01/04/2026`,
      `/admin/consultoria/dados?dashboard=262&mesFiltro=04-2026`,
      `/admin/consultoria/dados?dashboard=262&mesFiltro=04/2026`,
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
          return { status: r.status, text: text.substring(0, 800), contentType: r.headers.get("content-type") };
        }, `${ADMIN_URL}${ep}`);
        
        if (resp.status !== 404 || resp.text.length > 50) {
          console.log(`  ${resp.status} ${ep}`);
          if (resp.text && !resp.text.includes("<!DOCTYPE") && resp.text.length > 10) {
            console.log(`  Resposta: ${resp.text.substring(0, 400)}`);
          }
        }
      } catch (e) {
        // Silenciar erros
      }
    }
    
    // ===== VERIFICAR O HTML DO HISTÓRICO DE CAIXAS =====
    console.log("\n5. Verificando HTML do Histórico de Caixas...");
    await page.goto(`${ADMIN_URL}/admin/financeiro/caixa/historico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-historico-direto.png", fullPage: true });
    
    const textoHistorico = await page.evaluate(() => document.body.innerText);
    console.log("Texto histórico direto:", textoHistorico.substring(0, 2000));
    
    // Verificar ng-model e ng-click para entender a API
    const ngElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[ng-controller]")).map(el => ({
        tag: el.tagName,
        ngController: el.getAttribute("ng-controller"),
        id: el.id
      }));
    });
    console.log("Controllers Angular:", JSON.stringify(ngElements, null, 2));
    
    // Verificar source JS para encontrar endpoints
    const sourceJs = await page.evaluate(() => {
      // Pegar todos os scripts src
      return Array.from(document.querySelectorAll("script[src]"))
        .map(s => s.getAttribute("src"))
        .filter(s => s && s.includes("avec"));
    });
    console.log("Scripts JS do Avec:", JSON.stringify(sourceJs, null, 2));
    
    // Salvar todos os logs
    fs.writeFileSync("/tmp/avec-api-log-final.json", JSON.stringify(apiLog, null, 2));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
