/**
 * Testa o login no Avec via Puppeteer (browser headless)
 * Usa o terminal.avec.beauty que já funcionou anteriormente
 */
import puppeteer from "puppeteer-core";

const CHROMIUM_PATH = "/usr/bin/chromium-browser";
const email = "seraphinebeauty24@gmail.com";
const senha = "Dxj4oue@";

console.log("🌐 Iniciando browser headless para login no Avec...");

const browser = await puppeteer.launch({
  executablePath: CHROMIUM_PATH,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-zygote",
    "--single-process",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ── Passo 1: Buscar o salão pelo email no terminal.avec.beauty ────────────
  console.log("📍 Passo 1: Buscando salão pelo email...");
  await page.goto("https://terminal.avec.beauty", { waitUntil: "networkidle2", timeout: 30000 });
  console.log(`📍 URL: ${page.url()}`);
  await page.screenshot({ path: "/tmp/avec-step1.png" });

  // Verificar inputs disponíveis
  const inputs1 = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }))
  );
  console.log("📋 Inputs:", JSON.stringify(inputs1));

  // Preencher email de busca
  const searchInput = await page.$('input[type="email"], input[type="text"], input[name="email"]');
  if (searchInput) {
    await searchInput.click({ clickCount: 3 });
    await searchInput.type(email, { delay: 50 });
    console.log("✅ Email de busca preenchido");
    await page.keyboard.press("Enter");
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: "/tmp/avec-step2.png" });
    console.log(`📍 URL após busca: ${page.url()}`);
  }

  // ── Passo 2: Verificar se redirecionou para a página de login do salão ────
  const urlAtual = page.url();
  if (urlAtual.includes("/login/")) {
    console.log("✅ Redirecionado para página de login do salão!");
  } else {
    // Tentar clicar no resultado da busca
    const resultadoClicado = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const seraphine = links.find(el => {
        const txt = el.textContent?.toLowerCase() ?? "";
        return txt.includes("seraphine") || txt.includes("beauty");
      });
      if (seraphine) { seraphine.click(); return true; }
      return false;
    });
    if (resultadoClicado) {
      await new Promise(r => setTimeout(r, 2000));
      console.log(`📍 URL após clicar no resultado: ${page.url()}`);
    }
  }

  await page.screenshot({ path: "/tmp/avec-step3.png" });

  // ── Passo 3: Preencher email na tela de login do salão ───────────────────
  const inputs2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input")).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }))
  );
  console.log("📋 Inputs na tela de login:", JSON.stringify(inputs2));

  const emailInput = await page.$('input[type="email"], input[name="email"]');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(email, { delay: 50 });
    console.log("✅ Email preenchido na tela de login");
    await page.keyboard.press("Enter");
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: "/tmp/avec-step4.png" });
    console.log(`📍 URL: ${page.url()}`);
  }

  // ── Passo 4: Preencher senha ──────────────────────────────────────────────
  const senhaInput = await page.$('input[type="password"]');
  if (senhaInput) {
    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha, { delay: 50 });
    console.log("✅ Senha preenchida");
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
      page.keyboard.press("Enter"),
    ]);
    await new Promise(r => setTimeout(r, 3000));
    console.log(`📍 URL após login: ${page.url()}`);
    await page.screenshot({ path: "/tmp/avec-step5.png" });
  } else {
    console.log("⚠️  Campo de senha não encontrado");
    await page.screenshot({ path: "/tmp/avec-no-senha.png" });
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  const cookies = await page.cookies();
  console.log(`🍪 Cookies (${cookies.length}):`, cookies.map(c => `${c.name}=${c.value.substring(0, 20)}`).join(", "));

  if (page.url().includes("/agenda") || page.url().includes("/admin")) {
    console.log("✅ LOGIN BEM-SUCEDIDO!");
  } else {
    console.log("❌ Login pode ter falhado. URL:", page.url());
    // Verificar erros
    const erros = await page.evaluate(() => {
      const els = document.querySelectorAll(".error, .alert-danger, [class*='error'], [class*='danger']");
      return Array.from(els).map(e => e.textContent?.trim()).filter(Boolean);
    });
    if (erros.length) console.log("❌ Erros:", erros);
  }

} finally {
  await browser.close();
  console.log("🔒 Browser fechado.");
}
