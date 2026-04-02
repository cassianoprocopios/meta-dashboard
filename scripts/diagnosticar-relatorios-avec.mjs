/**
 * Diagnóstico da tela de Relatórios do Avec para extrair dados por categoria.
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
    
    // Interceptar respostas de rede para capturar dados da API
    const apiResponses = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("consultoria") || url.includes("relatorio") || url.includes("categoria") || url.includes("servico")) {
        try {
          const text = await response.text();
          apiResponses.push({ url, status: response.status(), text: text.substring(0, 500) });
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
    
    // Acessar a página de consultoria/relatórios com período de 01/04/2026
    const relatorioUrl = `${ADMIN_URL}/admin/consultoria?dashboard=262&periodo=periodo&dataInicio=01-04-2026&dataFim=01-04-2026`;
    console.log("\nAcessando relatório:", relatorioUrl);
    await page.goto(relatorioUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000)); // aguardar carregamento dos gráficos
    
    // Screenshot
    await page.screenshot({ path: "/tmp/avec-relatorio-01-04.png", fullPage: true });
    console.log("Screenshot: /tmp/avec-relatorio-01-04.png");
    
    // Extrair texto da página
    const texto = await page.evaluate(() => document.body.innerText);
    console.log("\nTexto da página (primeiros 3000 chars):\n", texto.substring(0, 3000));
    
    // Verificar respostas de API capturadas
    console.log("\nRespostas de API capturadas:", apiResponses.length);
    for (const r of apiResponses) {
      console.log(`  ${r.status} ${r.url}`);
      console.log(`  ${r.text.substring(0, 200)}`);
    }
    
    // Tentar acessar o endpoint de dados da consultoria diretamente via page.goto
    const dadosUrl = `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=01-04-2026&dataFim=01-04-2026`;
    console.log("\nAcessando dados diretamente:", dadosUrl);
    const respDados = await page.goto(dadosUrl, { waitUntil: "networkidle2", timeout: 30000 });
    const dadosText = await page.content();
    console.log("Status:", respDados?.status());
    console.log("Dados (primeiros 2000 chars):", dadosText.substring(0, 2000));
    
    // Tentar com formato de data diferente
    const dadosUrl2 = `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=2026-04-01&dataFim=2026-04-01`;
    console.log("\nAcessando dados (formato 2):", dadosUrl2);
    const respDados2 = await page.goto(dadosUrl2, { waitUntil: "networkidle2", timeout: 30000 });
    const dadosText2 = await page.content();
    console.log("Status:", respDados2?.status());
    console.log("Dados (primeiros 2000 chars):", dadosText2.substring(0, 2000));
    
  } finally {
    await browser.close();
    console.log("\nDiagnóstico concluído.");
  }
}

main().catch(console.error);
