/**
 * Descobre qual dashboard do Avec tem dados financeiros por categoria de serviço.
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
    
    // Capturar todas as requisições de rede
    const requests = [];
    page.on("request", (req) => {
      if (req.url().includes("consultoria") || req.url().includes("dashboard") || req.url().includes("relatorio")) {
        requests.push(req.url());
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
    
    // Acessar a página de relatórios para ver os dashboards disponíveis
    const relatorioUrl = `${ADMIN_URL}/admin/consultoria`;
    await page.goto(relatorioUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Listar todos os dashboards disponíveis no select
    const dashboards = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return [];
      return Array.from(select.options).map(o => ({ value: o.value, text: o.textContent?.trim() }));
    });
    console.log("\nDashboards disponíveis:", JSON.stringify(dashboards, null, 2));
    
    // Testar cada dashboard para ver qual tem dados financeiros
    for (const dash of dashboards) {
      if (!dash.value) continue;
      const url = `${ADMIN_URL}/admin/consultoria?dashboard=${dash.value}&periodo=periodo&dataInicio=01-04-2026&dataFim=01-04-2026`;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      
      const texto = await page.evaluate(() => document.body.innerText);
      const temFaturamento = texto.includes("Faturamento") || texto.includes("Receita") || texto.includes("Serviço") || texto.includes("Cabelo") || texto.includes("Manicure");
      console.log(`\nDashboard ${dash.value} (${dash.text}): temFaturamento=${temFaturamento}`);
      if (temFaturamento) {
        console.log("  Texto (primeiros 500):", texto.substring(0, 500));
        await page.screenshot({ path: `/tmp/avec-dash-${dash.value}.png` });
        console.log(`  Screenshot: /tmp/avec-dash-${dash.value}.png`);
      }
    }
    
    // Também verificar o histórico de caixa com extração de serviços
    console.log("\n\n=== Verificando histórico de caixa com serviços ===");
    const caixaUrl = `${ADMIN_URL}/admin/financeiro/caixa/historico?fechamento=01%2F04%2F2026`;
    await page.goto(caixaUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Clicar no caixa da Sabrina para ver detalhes
    const linkCaixa = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll("a, button"));
      return links.find(l => l.textContent?.includes("Sabrina") || l.textContent?.includes("detalhe") || l.textContent?.includes("ver"));
    });
    if (linkCaixa) {
      console.log("Clicando no caixa...");
      await linkCaixa.click();
      await new Promise(r => setTimeout(r, 3000));
      const texto = await page.evaluate(() => document.body.innerText);
      console.log("Texto após clicar:", texto.substring(0, 1000));
    }
    
    // Verificar se há aba de serviços no caixa
    const abaServicos = await page.evaluateHandle(() => {
      const tabs = Array.from(document.querySelectorAll("a, button, li"));
      return tabs.find(t => t.textContent?.toLowerCase().includes("serviço") || t.textContent?.toLowerCase().includes("categoria"));
    });
    if (abaServicos) {
      console.log("Aba de serviços encontrada!");
      await abaServicos.click();
      await new Promise(r => setTimeout(r, 2000));
      const texto = await page.evaluate(() => document.body.innerText);
      console.log("Texto da aba serviços:", texto.substring(0, 1000));
    }
    
    await page.screenshot({ path: "/tmp/avec-caixa-detalhes.png", fullPage: true });
    console.log("Screenshot caixa detalhes: /tmp/avec-caixa-detalhes.png");
    
  } finally {
    await browser.close();
    console.log("\nDiagnóstico concluído.");
  }
}

main().catch(console.error);
