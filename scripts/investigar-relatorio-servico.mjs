/**
 * Investiga o endpoint /admin/relatorio/servico do Avec para extrair dados por categoria.
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
      if (url.includes("admin.avec.beauty") && !url.includes(".js") && !url.includes(".css") && !url.includes(".png") && !url.includes(".svg") && !url.includes("google") && !url.includes("facebook") && !url.includes("hubspot") && !url.includes("hyperlocal")) {
        try {
          const text = await response.text();
          if (text.length < 100000 && text.length > 10) {
            apiResponses.push({ url, status: response.status(), text: text.substring(0, 500) });
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
    
    // Acessar o relatório de serviços
    const relatorioUrl = `${ADMIN_URL}/admin/relatorio/servico`;
    console.log("\n1. Acessando relatório de serviços:", relatorioUrl);
    await page.goto(relatorioUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    await page.screenshot({ path: "/tmp/avec-relatorio-servico.png", fullPage: true });
    console.log("Screenshot: /tmp/avec-relatorio-servico.png");
    
    // Verificar campos de filtro
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        tag: el.tagName,
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        placeholder: el.getAttribute("placeholder"),
        value: el.value,
        ngModel: el.getAttribute("ng-model")
      }));
    });
    console.log("\nInputs na página:", JSON.stringify(inputs, null, 2));
    
    // Texto da página
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto da página (primeiros 2000):\n", texto.substring(0, 2000));
    
    // Tentar filtrar por data 01/04/2026
    console.log("\n2. Tentando filtrar por 01/04/2026...");
    
    // Preencher campos de data
    const dateFields = await page.$$('input[type="date"], input[placeholder*="ata"], input[id*="ata"], input[ng-model*="ata"]');
    console.log(`Campos de data: ${dateFields.length}`);
    
    for (let i = 0; i < dateFields.length; i++) {
      const placeholder = await dateFields[i].evaluate(el => el.placeholder);
      console.log(`  Campo ${i}: ${placeholder}`);
      await dateFields[i].click({ clickCount: 3 });
      await dateFields[i].type("01/04/2026");
    }
    
    // Clicar em filtrar
    const btnFiltrar = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, input[type='submit'], a"));
      return btns.find(b => {
        const text = b.textContent?.toLowerCase() || "";
        return text.includes("filtrar") || text.includes("buscar") || text.includes("pesquisar") || text.includes("consultar");
      });
    });
    if (btnFiltrar) {
      console.log("Botão filtrar encontrado, clicando...");
      await btnFiltrar.click();
      await new Promise(r => setTimeout(r, 5000));
    }
    
    await page.screenshot({ path: "/tmp/avec-relatorio-servico-filtrado.png", fullPage: true });
    console.log("Screenshot filtrado: /tmp/avec-relatorio-servico-filtrado.png");
    
    const textoFiltrado = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto após filtro (primeiros 3000):\n", textoFiltrado.substring(0, 3000));
    
    // Verificar respostas de API capturadas
    console.log("\n\nRespostas de API relevantes:");
    for (const r of apiResponses) {
      console.log(`  ${r.status} ${r.url}`);
      console.log(`  ${r.text.substring(0, 200)}`);
      console.log();
    }
    
  } finally {
    await browser.close();
    console.log("\nDiagnóstico concluído.");
  }
}

main().catch(console.error);
