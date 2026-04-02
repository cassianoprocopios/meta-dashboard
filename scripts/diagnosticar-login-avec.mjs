/**
 * diagnosticar-login-avec.mjs
 * Testa o login no terminal.avec.beauty com screenshots em cada etapa
 */

import puppeteer from "puppeteer-core";
import { writeFileSync } from "fs";

const CHROMIUM_PATH = "/usr/bin/chromium-browser";
const TERMINAL_URL = "https://terminal.avec.beauty";
const EMAIL = "seraphinebeauty24@gmail.com";
const SENHA = "Dxj4oue@";

async function diagnosticar() {
  console.log("Iniciando diagnóstico de login do Avec...");

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

    // ── Passo 1: Acessar terminal.avec.beauty ────────────────────────────────
    console.log("Passo 1: Acessando terminal.avec.beauty...");
    await page.goto(TERMINAL_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await page.screenshot({ path: "/tmp/avec-diag-1-home.png" });
    console.log("Screenshot 1 salvo: /tmp/avec-diag-1-home.png");

    // Verificar HTML da página
    const html1 = await page.content();
    const inputs1 = html1.match(/<input[^>]*>/g) || [];
    console.log("Inputs encontrados na página inicial:", inputs1.slice(0, 5));

    // ── Passo 2: Buscar salão pelo email ─────────────────────────────────────
    console.log("Passo 2: Buscando salão pelo email...");
    const searchInput = await page.$('input[type="text"], input[type="email"], input[name="text"], input[placeholder*="email"], input[placeholder*="busca"], input[placeholder*="pesquisa"]');
    if (searchInput) {
      const placeholder = await page.evaluate(el => el.placeholder, searchInput);
      console.log("Campo de busca encontrado, placeholder:", placeholder);
      await searchInput.click({ clickCount: 3 });
      await searchInput.type(EMAIL, { delay: 50 });
      await page.screenshot({ path: "/tmp/avec-diag-2-email-digitado.png" });
      console.log("Screenshot 2 salvo: /tmp/avec-diag-2-email-digitado.png");
      await page.keyboard.press("Enter");
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log("ERRO: Campo de busca não encontrado!");
      const allInputs = await page.$$eval("input", els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
      console.log("Todos os inputs:", JSON.stringify(allInputs));
    }

    await page.screenshot({ path: "/tmp/avec-diag-3-apos-busca.png" });
    console.log("Screenshot 3 salvo: /tmp/avec-diag-3-apos-busca.png");
    console.log("URL após busca:", page.url());

    // ── Passo 3: Verificar se chegou na tela de login do salão ───────────────
    console.log("Passo 3: Verificando tela de login do salão...");
    const url3 = page.url();
    if (url3.includes("/login/")) {
      console.log("Chegou na tela de login do salão:", url3);

      // Verificar campos disponíveis
      const allInputs = await page.$$eval("input", els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })));
      console.log("Inputs na tela de login:", JSON.stringify(allInputs));

      // Tentar preencher email
      const emailInput = await page.$('input[type="email"]');
      if (emailInput) {
        console.log("Campo de email encontrado, preenchendo...");
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(EMAIL, { delay: 50 });
        await page.screenshot({ path: "/tmp/avec-diag-4-email-login.png" });
        console.log("Screenshot 4 salvo: /tmp/avec-diag-4-email-login.png");
        await page.keyboard.press("Enter");
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: "/tmp/avec-diag-5-apos-email.png" });
        console.log("Screenshot 5 salvo: /tmp/avec-diag-5-apos-email.png");
        console.log("URL após email:", page.url());

        // Verificar se apareceu campo de senha
        const senhaInput = await page.$('input[type="password"]');
        if (senhaInput) {
          console.log("Campo de senha encontrado, preenchendo...");
    await senhaInput.click({ clickCount: 3 });
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await senhaInput.type(SENHA, { delay: 50 });
    await page.screenshot({ path: "/tmp/avec-diag-6-senha.png" });
    console.log("Screenshot 6 salvo: /tmp/avec-diag-6-senha.png");
    
    // Clicar no botão Entrar
    const botaoEntrar = await page.$('button[type="submit"]');
    if (botaoEntrar) {
      console.log("Botão Entrar encontrado, clicando...");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
        botaoEntrar.click(),
      ]);
    } else {
      console.log("Botão Entrar não encontrado, pressionando Enter...");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
        page.keyboard.press("Enter"),
      ]);
    }
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: "/tmp/avec-diag-7-apos-senha.png" });
    console.log("Screenshot 7 salvo: /tmp/avec-diag-7-apos-senha.png");
    console.log("URL final:", page.url());
    const cookies = await page.cookies();
    console.log("Cookies extraídos:", cookies.length);
        } else {
          console.log("ERRO: Campo de senha não encontrado após email!");
          const allInputs2 = await page.$$eval("input", els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder })));
          console.log("Inputs disponíveis:", JSON.stringify(allInputs2));
        }
      } else {
        console.log("ERRO: Campo de email não encontrado na tela de login!");
      }
    } else {
      console.log("Não chegou na tela de login. URL atual:", url3);
    }

  } finally {
    await browser.close();
    console.log("Diagnóstico concluído.");
  }
}

diagnosticar().catch(console.error);
