/**
 * Investiga a tela de Comandas Finalizadas do Avec para extrair dados por categoria de serviço.
 */
import puppeteer from "puppeteer-core";

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

  try {
    const page = await browser.newPage();
    
    // Capturar respostas de API
    const apiResponses = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("admin.avec.beauty") && !url.includes(".js") && !url.includes(".css") && !url.includes(".png") && !url.includes("google") && !url.includes("facebook")) {
        try {
          const text = await response.text();
          if (text.length < 50000) {
            apiResponses.push({ url, status: response.status(), text: text.substring(0, 300) });
          }
        } catch (e) {}
      }
    });
    
    // Login
    const loginUrl = `${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`;
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', SENHA);
    const botao = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find(b => b.textContent?.trim().toLowerCase().includes("entrar"));
    });
    if (botao) await botao.click();
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    console.log("Login OK:", page.url());
    
    // Acessar Financeiro > Comandas Finalizadas com filtro de data
    const comandasUrl = `${ADMIN_URL}/admin/financeiro/comanda/finalizadas`;
    console.log("\n1. Acessando comandas finalizadas:", comandasUrl);
    await page.goto(comandasUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-comandas-lista.png", fullPage: true });
    console.log("Screenshot: /tmp/avec-comandas-lista.png");
    
    // Verificar os campos de filtro disponíveis
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value
      }));
    });
    console.log("\nInputs na página:", JSON.stringify(inputs, null, 2));
    
    // Tentar filtrar por data
    const dateInputs = await page.$$('input[type="date"], input[placeholder*="data"], input[placeholder*="Data"], input[id*="data"], input[id*="date"]');
    console.log(`\nInputs de data encontrados: ${dateInputs.length}`);
    
    if (dateInputs.length >= 1) {
      await dateInputs[0].click({ clickCount: 3 });
      await dateInputs[0].type("01/04/2026");
      if (dateInputs.length >= 2) {
        await dateInputs[1].click({ clickCount: 3 });
        await dateInputs[1].type("01/04/2026");
      }
      
      // Clicar no botão de filtrar
      const btnFiltrar = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button, input[type='submit']"));
        return btns.find(b => b.textContent?.toLowerCase().includes("filtrar") || b.textContent?.toLowerCase().includes("buscar") || b.textContent?.toLowerCase().includes("pesquisar"));
      });
      if (btnFiltrar) {
        await btnFiltrar.click();
        await new Promise(r => setTimeout(r, 3000));
        console.log("\nFiltro aplicado!");
      }
    }
    
    await page.screenshot({ path: "/tmp/avec-comandas-filtradas.png", fullPage: true });
    console.log("Screenshot filtradas: /tmp/avec-comandas-filtradas.png");
    
    // Extrair texto da página
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto da página (primeiros 3000):\n", texto.substring(0, 3000));
    
    // Verificar respostas de API capturadas
    console.log("\n\nRespostas de API capturadas:");
    for (const r of apiResponses) {
      console.log(`  ${r.status} ${r.url}`);
      if (r.text.includes("categoria") || r.text.includes("servico") || r.text.includes("cabelo") || r.text.includes("manicure")) {
        console.log(`  *** RELEVANTE: ${r.text.substring(0, 300)}`);
      }
    }
    
    // Tentar acessar a API de serviços diretamente
    console.log("\n\n2. Testando endpoint de serviços por categoria...");
    
    // Endpoints comuns do Avec para dados financeiros
    const endpointsParaTestar = [
      `${ADMIN_URL}/admin/financeiro/servico/categoria?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `${ADMIN_URL}/admin/financeiro/relatorio/categoria?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `${ADMIN_URL}/admin/relatorio/servico?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `${ADMIN_URL}/admin/financeiro/comanda/finalizadas?dataInicio=01%2F04%2F2026&dataFim=01%2F04%2F2026&formato=json`,
    ];
    
    for (const url of endpointsParaTestar) {
      const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });
      const content = await page.content();
      const status = resp?.status();
      console.log(`  ${status} ${url}`);
      if (status === 200 && content.length < 100000) {
        console.log(`  Conteúdo: ${content.substring(0, 500)}`);
      }
    }
    
  } finally {
    await browser.close();
    console.log("\nDiagnóstico concluído.");
  }
}

main().catch(console.error);
