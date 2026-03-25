/**
 * Script: completar o fluxo Dpote selecionando TODAS as filiais no dropdown
 * e capturando o POST final com os dados de faturamento
 */

import puppeteer from "puppeteer-core";

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_PAINEL = "https://painel.cashbarber.com.br";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/dpote-${name}.png` });
  console.log(`📸 /tmp/dpote-${name}.png`);
}

async function main() {
  console.log("🚀 Iniciando browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // Interceptar chamadas da API
    const apiCalls = [];
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("api.cashbarber.com.br")) {
        const postData = req.postData();
        apiCalls.push({
          type: "request",
          method: req.method(),
          url: url.replace("https://api.cashbarber.com.br", ""),
          body: postData ? postData : null,
        });
      }
      req.continue();
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("api.cashbarber.com.br")) {
        try {
          const ct = response.headers()["content-type"] ?? "";
          if (!ct.includes("json")) return;
          const body = await response.json();
          const shortUrl = url.replace("https://api.cashbarber.com.br", "");
          apiCalls.push({
            type: "response",
            method: response.request().method(),
            url: shortUrl,
            status: response.status(),
            body: JSON.stringify(body),
          });
          if (url.includes("dpote")) {
            console.log(`🌐 ${response.request().method()} ${shortUrl} → ${response.status()}`);
            const data = body?.data ?? body;
            if (data?.faturamento) {
              console.log("  Faturamento:", JSON.stringify(data.faturamento));
            }
            if (data?.filiais_servicos?.length > 0) {
              data.filiais_servicos.forEach(f => {
                const fichas = (f.servicos ?? []).reduce((a, s) => a + (s.fichas || 0), 0);
                console.log(`    Filial: ${f.filial?.fil_bairro || f.id} | fichas: ${fichas}`);
              });
            }
          }
        } catch {}
      }
    });

    // Login
    console.log("🔐 Login...");
    await page.goto(`${CB_PAINEL}/auth/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000);
    await page.waitForSelector("input", { timeout: 10000 });
    const inputs = await page.$$("input");
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(CB_EMAIL, { delay: 80 });
      await sleep(200);
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type(CB_SENHA, { delay: 80 });
    }
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await sleep(3000);
    if (page.url().includes("login")) throw new Error("Login falhou");
    console.log("✅ Login OK");

    // Navegar para Históricos
    await page.goto(`${CB_PAINEL}/dpote/historicos`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(5000);

    // Clicar no botão verde (editar) do primeiro histórico
    console.log("\n✏️  Clicando no botão verde (editar) do primeiro histórico...");
    await page.mouse.click(757, 557);
    await sleep(5000);
    await screenshot(page, "01-wizard");
    console.log("URL:", page.url());

    // === PASSO 1: Abrir dropdown e selecionar TODAS as filiais ===
    console.log("\n📋 Passo 1: Abrindo dropdown de filiais...");
    // Clicar no dropdown (posição baseada no screenshot anterior)
    await page.mouse.click(780, 307);
    await sleep(2000);
    await screenshot(page, "02-dropdown-aberto");

    // Listar as opções disponíveis no dropdown
    const opcoes = await page.evaluate(() => {
      // Tentar encontrar itens do dropdown aberto
      const selectors = [
        ".p-dropdown-item",
        ".p-dropdown-items li",
        ".ng-option",
        "p-dropdownitem li",
        ".p-dropdown-panel li",
        ".dropdown-item",
      ];
      for (const sel of selectors) {
        const items = Array.from(document.querySelectorAll(sel));
        if (items.length > 0) {
          return items.map(i => ({ sel, text: i.textContent?.trim(), class: i.className?.substring(0, 50) }));
        }
      }
      // Fallback: qualquer li visível com texto curto
      return Array.from(document.querySelectorAll("li")).filter(li => {
        const rect = li.getBoundingClientRect();
        const text = li.textContent?.trim();
        return rect.width > 0 && rect.height > 0 && text && text.length < 60;
      }).map(li => ({ sel: "li", text: li.textContent?.trim(), class: li.className?.substring(0, 50) }));
    });
    console.log("Opções encontradas:", JSON.stringify(opcoes, null, 2));

    // Selecionar TODAS as opções (multi-select)
    // Baseado no screenshot: "Morumbi/Vila Andrade" está em y≈307, "Vila Mascote" em y≈339
    console.log("\n✅ Selecionando Morumbi/Vila Andrade...");
    await page.mouse.click(780, 307);
    await sleep(1000);
    await screenshot(page, "03-morumbi-selecionado");

    // Verificar se o dropdown ainda está aberto para selecionar a segunda opção
    const dropdownAberto = await page.evaluate(() => {
      const panel = document.querySelector(".p-dropdown-panel, .p-multiselect-panel, .ng-dropdown-panel");
      return !!panel;
    });
    console.log("Dropdown ainda aberto:", dropdownAberto);

    if (dropdownAberto) {
      console.log("✅ Selecionando Vila Mascote...");
      await page.mouse.click(780, 339);
      await sleep(1000);
    }

    await screenshot(page, "04-filiais-selecionadas");

    // Verificar estado do botão Continuar
    const btnState = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(b => ({
        text: b.textContent?.trim(),
        disabled: b.disabled,
        class: b.className?.substring(0, 60),
      })).filter(b => b.text)
    );
    console.log("Estado dos botões:", JSON.stringify(btnState, null, 2));

    // Clicar em Continuar (passo 1) - o primeiro não-disabled
    console.log("\n▶️  Continuar (passo 1)...");
    const cont1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.textContent?.trim() === "Continuar" && !b.disabled);
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Clicou:", cont1);
    await sleep(8000);
    await screenshot(page, "05-passo2");

    // Verificar passo 2 e botões
    const btns2 = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(b => ({
        text: b.textContent?.trim(),
        disabled: b.disabled,
      })).filter(b => b.text)
    );
    console.log("Botões passo 2:", JSON.stringify(btns2, null, 2));

    // Clicar em Continuar (passo 2)
    console.log("\n▶️  Continuar (passo 2)...");
    const cont2 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.textContent?.trim() === "Continuar" && !b.disabled);
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Clicou:", cont2);
    await sleep(8000);
    await screenshot(page, "06-passo3");

    // Verificar passo 3
    const btns3 = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(b => ({
        text: b.textContent?.trim(),
        disabled: b.disabled,
      })).filter(b => b.text)
    );
    console.log("Botões passo 3:", JSON.stringify(btns3, null, 2));

    // Verificar conteúdo da página no passo 3
    const passo3Content = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input")).map(i => ({
        name: i.name || i.id,
        type: i.type,
        value: i.value,
        placeholder: i.placeholder,
      }));
      const labels = Array.from(document.querySelectorAll("label, h3, h4, .card-title")).map(l => l.textContent?.trim()).filter(t => t && t.length < 100);
      return { inputs, labels };
    });
    console.log("Passo 3 - inputs:", JSON.stringify(passo3Content.inputs, null, 2));
    console.log("Passo 3 - labels:", JSON.stringify(passo3Content.labels, null, 2));

    // Clicar em Enviar
    console.log("\n📤 Enviar...");
    const enviar = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return (t?.includes("enviar") || t?.includes("confirmar") || t?.includes("finalizar") || t?.includes("salvar")) && !b.disabled;
      });
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Clicou:", enviar);
    await sleep(10000);
    await screenshot(page, "07-final");

    // Verificar histórico após envio
    console.log("\n🔍 Verificando histórico após envio...");
    const historicoId = page.url().match(/id=(\d+)/)?.[1];
    if (historicoId) {
      const checkResp = await page.evaluate(async (id) => {
        const r = await fetch(`https://api.cashbarber.com.br/api/painel/dpote/historico/${id}`, {
          credentials: "include",
        });
        return r.json();
      }, historicoId);
      console.log("Histórico final:", JSON.stringify(checkResp, null, 2));
    }

    // Mostrar todas as chamadas capturadas
    console.log("\n\n📊 === CHAMADAS API DPOTE CAPTURADAS ===");
    for (const call of apiCalls) {
      if (!call.url.includes("dpote")) continue;
      if (call.type === "request") {
        console.log(`\n→ ${call.method} ${call.url}`);
        if (call.body) console.log("  Body:", call.body.substring(0, 1000));
      } else {
        console.log(`← ${call.method} ${call.url} → ${call.status}`);
        if (call.body) console.log("  Response:", call.body.substring(0, 800));
      }
    }

  } finally {
    await browser.close();
    console.log("\n✅ Browser fechado.");
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
