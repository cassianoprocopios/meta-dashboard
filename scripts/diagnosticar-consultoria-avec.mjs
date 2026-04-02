/**
 * Diagnóstico do endpoint de consultoria do Avec.
 * Usa page.goto para acessar os endpoints diretamente.
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
    
    // Login via URL direta
    const loginUrl = `${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`;
    console.log("1. Login:", loginUrl);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', SENHA);
    
    const botao = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find(b => b.textContent?.trim().toLowerCase().includes("entrar"));
    });
    if (botao) await botao.click();
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    console.log("   URL após login:", page.url());
    
    // Testar endpoint de consultoria via page.goto
    const dataHifen = "2026-04-01";
    const consultoriaUrl = `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=${dataHifen}&dataFim=${dataHifen}`;
    console.log("\n2. Consultoria:", consultoriaUrl);
    
    const respConsultoria = await page.goto(consultoriaUrl, { waitUntil: "networkidle2", timeout: 30000 });
    const statusConsultoria = respConsultoria?.status();
    const textConsultoria = await page.content();
    console.log("   Status:", statusConsultoria);
    console.log("   Conteúdo (primeiros 1000 chars):", textConsultoria.substring(0, 1000));
    
    // Testar endpoint de histórico de caixa
    const caixaUrl = `${ADMIN_URL}/admin/financeiro/caixa/historico?fechamento=01%2F04%2F2026`;
    console.log("\n3. Histórico de caixa:", caixaUrl);
    
    await page.goto(caixaUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000)); // aguardar carregamento dinâmico
    
    const htmlCaixa = await page.content();
    console.log("   Conteúdo HTML (primeiros 3000 chars):", htmlCaixa.substring(0, 3000));
    
    // Extrair valores monetários
    const valores = htmlCaixa.match(/R\$\s*[\d.,]+/g);
    console.log("\n   Valores monetários encontrados:", valores?.slice(0, 20));
    
    // Tentar extrair tabela de categorias
    const linhasTabela = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tr, .table tr, [class*='row']");
      return Array.from(rows).slice(0, 20).map(r => r.textContent?.trim().replace(/\s+/g, " ")).filter(Boolean);
    });
    console.log("\n   Linhas encontradas:", linhasTabela);
    
    await page.screenshot({ path: "/tmp/avec-caixa-01-04.png", fullPage: true });
    console.log("\n   Screenshot: /tmp/avec-caixa-01-04.png");
    
    // Testar endpoint de comandas finalizadas
    const comandasUrl = `${ADMIN_URL}/admin/financeiro/comanda/finalizadas?dataInicio=01%2F04%2F2026&dataFim=01%2F04%2F2026`;
    console.log("\n4. Comandas finalizadas:", comandasUrl);
    
    await page.goto(comandasUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const htmlComandas = await page.content();
    const valoresComandas = htmlComandas.match(/R\$\s*[\d.,]+/g);
    console.log("   Valores monetários:", valoresComandas?.slice(0, 20));
    
    await page.screenshot({ path: "/tmp/avec-comandas-01-04.png", fullPage: true });
    console.log("   Screenshot: /tmp/avec-comandas-01-04.png");
    
  } finally {
    await browser.close();
    console.log("\nDiagnóstico concluído.");
  }
}

main().catch(console.error);
