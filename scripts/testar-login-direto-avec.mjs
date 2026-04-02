/**
 * Teste do login do Avec usando a URL direta do admin com email como parâmetro.
 * Usa puppeteer-core diretamente (sem importar o módulo TS).
 */

import puppeteer from "puppeteer-core";

const ADMIN_URL = "https://admin.avec.beauty";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";
const email = "seraphinebeauty24@gmail.com";
const senha = "Dxj4oue@";
const salaoSlug = "seraphine-beauty-ltda";
const loginUrl = `${ADMIN_URL}/${salaoSlug}/admin/?email=${encodeURIComponent(email)}`;

console.log(`\n[Teste] Testando login com URL direta: ${loginUrl}\n`);

const browser = await puppeteer.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log("[Teste] Navegando para URL direta...");
  await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  const urlAtual = page.url();
  console.log(`[Teste] URL atual: ${urlAtual}`);

  // Screenshot para diagnóstico
  await page.screenshot({ path: "/tmp/avec-login-direto-1.png" });
  console.log("[Teste] Screenshot salvo em /tmp/avec-login-direto-1.png");

  // Verificar se há campo de senha
  const temSenha = await page.$('input[type="password"]');
  console.log(`[Teste] Campo de senha encontrado: ${!!temSenha}`);

  if (temSenha) {
    await temSenha.click({ clickCount: 3 });
    await temSenha.type(senha, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // Clicar no botão Entrar
    const clicou = await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const botao = botoes.find(b => b.textContent?.includes('Entrar') || b.type === 'submit');
      if (botao) { botao.click(); return true; }
      return false;
    });
    console.log(`[Teste] Botão Entrar clicado: ${clicou}`);

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const urlFinal = page.url();
    console.log(`[Teste] URL final: ${urlFinal}`);
    await page.screenshot({ path: "/tmp/avec-login-direto-2.png" });
    console.log("[Teste] Screenshot final salvo em /tmp/avec-login-direto-2.png");

    const cookies = await page.cookies();
    console.log(`[Teste] Cookies extraídos: ${cookies.length}`);
    cookies.forEach(c => console.log(`  - ${c.name}: ${c.value.substring(0, 30)}...`));

    if (!urlFinal.includes("/login")) {
      console.log("\n✅ Login bem-sucedido!");
    } else {
      console.log("\n❌ Login falhou — ainda na página de login");
    }
  } else {
    console.log("[Teste] Campo de senha não encontrado. Verificando conteúdo da página...");
    const texto = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log("[Teste] Conteúdo da página:", texto);
  }
} finally {
  await browser.close();
}
