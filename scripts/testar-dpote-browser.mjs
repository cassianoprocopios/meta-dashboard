/**
 * Script: executa o fluxo Dpote completo
 * Estratégia: login → criar histórico via API → navegar para lista → clicar editar → wizard Continuar/Enviar
 */

import puppeteer from "puppeteer-core";

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_API = "https://api.cashbarber.com.br";
const CB_PAINEL = "https://painel.cashbarber.com.br";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiCall(token, method, path, body) {
  const resp = await fetch(`${CB_API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  try { return { status: resp.status, body: JSON.parse(text) }; }
  catch { return { status: resp.status, body: text }; }
}

async function main() {
  const mes = new Date().getMonth() + 1;
  const ano = new Date().getFullYear();
  console.log(`📅 Mês: ${mes}/${ano}`);

  // ── 1. Login via API ──────────────────────────────────────────────────────
  console.log("🔐 Login via API...");
  let loginResp = await fetch(`${CB_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
  });

  // Tratar 409 (sessão ativa): forçar logout e re-login
  if (loginResp.status === 409) {
    console.log("⚠️  409 sessão ativa, forçando logout...");
    await fetch(`${CB_API}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, ctx: "painel" }),
    }).catch(() => {});
    await sleep(1000);
    loginResp = await fetch(`${CB_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
    });
  }

  // Token está no cookie httpOnly Set-Cookie
  const setCookieHeader = loginResp.headers.get("set-cookie") || "";
  const tokenMatch = setCookieHeader.match(/access_token_painel=([^;]+)/);
  if (!tokenMatch) throw new Error("Token não encontrado no Set-Cookie: " + setCookieHeader.substring(0, 100));
  const token = tokenMatch[1];
  console.log("✅ Token:", token.substring(0, 20) + "...");

  // ── 2. Criar histórico via API ────────────────────────────────────────────
  console.log("\n📋 Criando histórico via API...");
  const createResp = await apiCall(token, "POST", "/api/painel/dpote/historico", { mes, ano });
  console.log("Criar:", JSON.stringify(createResp));
  const hId = typeof createResp.body === "number" ? createResp.body : createResp.body?.id;
  if (!hId) throw new Error("Não foi possível criar histórico");
  console.log("✅ Histórico ID:", hId);

  // ── 3. Browser ────────────────────────────────────────────────────────────
  console.log("\n🚀 Iniciando browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    // Capturar chamadas de rede
    const capturedRequests = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/painel/dpote")) {
        try {
          const ct = response.headers()["content-type"] ?? "";
          if (!ct.includes("json")) return;
          const body = await response.json();
          capturedRequests.push({ url, method: response.request().method(), status: response.status(), body });
          console.log(`🌐 ${response.request().method()} ${url} → ${response.status()}`);
          if (body?.faturamento) console.log("  Faturamento:", JSON.stringify(body.faturamento));
          if (body?.filiais_servicos?.length > 0) {
            body.filiais_servicos.forEach(f => {
              const fichas = (f.servicos ?? []).reduce((a, s) => a + (s.fichas || 0), 0);
              console.log(`    Filial: ${f.fil_bairro || f.fil_nome || f.id} | fichas: ${fichas}`);
            });
          }
        } catch {}
      }
    });

    // Login no browser
    console.log("🔐 Login no browser...");
    await page.goto(`${CB_PAINEL}/auth/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000);
    await page.waitForSelector("input", { timeout: 10000 });
    const allInputs = await page.$$("input");
    if (allInputs.length >= 2) {
      await allInputs[0].click({ clickCount: 3 });
      await allInputs[0].type(CB_EMAIL, { delay: 80 });
      await sleep(200);
      await allInputs[1].click({ clickCount: 3 });
      await allInputs[1].type(CB_SENHA, { delay: 80 });
    }
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await sleep(3000);
    if (page.url().includes("login")) throw new Error("Login browser falhou");
    console.log("✅ Login browser OK");

    // Navegar para a lista de históricos
    console.log("\n📋 Navegando para lista de históricos...");
    await page.goto(`${CB_PAINEL}/dpote/historicos`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(4000);
    await page.screenshot({ path: "/tmp/dpote-01-lista.png" });
    console.log("📸 /tmp/dpote-01-lista.png");

    // Aguardar a lista carregar com o novo histórico
    console.log("Aguardando lista carregar...");
    await sleep(3000);
    // Recarregar se necessário
    const listaText2 = await page.evaluate(() => document.body.innerText);
    if (!listaText2.includes(String(hId))) {
      console.log("Recarregando lista...");
      await page.reload({ waitUntil: "networkidle2" });
      await sleep(3000);
    }
    const listaText = await page.evaluate(() => document.body.innerText);
    console.log("Contém ID", hId, ":", listaText.includes(String(hId)));

    // Clicar no botão de editar (lápis verde) do histórico criado
    // Os botões são ícones sem texto. O verde (editar) é o primeiro, o rosa (excluir) o segundo.
    // Usar coordenadas baseadas no screenshot: botão verde da 1a linha fica em ~(757, 557)
    console.log(`\n✏️  Clicando no botão editar (verde) do histórico ${hId}...`);
    const editClicked = await page.evaluate((hId) => {
      // Encontrar todos os elementos que contêm o ID
      const allEls = Array.from(document.querySelectorAll("*"));
      const idEl = allEls.find(el => el.children.length === 0 && el.textContent?.trim() === String(hId));
      if (!idEl) return "id-not-found";

      // Subir na árvore até encontrar o container da linha
      let container = idEl.parentElement;
      for (let i = 0; i < 15; i++) {
        if (!container) break;
        const btns = Array.from(container.querySelectorAll("button"));
        // Filtrar botões de paginação e cabeçalho
        const actionBtns = btns.filter(b => {
          const cls = b.className || "";
          return !cls.includes("paginator") && !cls.includes("tableHeader") && !cls.includes("p-highlight");
        });
        if (actionBtns.length >= 2) {
          // O primeiro botão é o de editar (verde/success)
          actionBtns[0].click();
          return "edit-btn: " + actionBtns[0].className?.substring(0, 60);
        }
        container = container.parentElement;
      }
      return "no-action-btns-found";
    }, hId);
    console.log("Edit clicado:", editClicked);
    await sleep(4000);
    await page.screenshot({ path: "/tmp/dpote-02-pos-edit.png" });
    console.log("📸 /tmp/dpote-02-pos-edit.png");
    console.log("URL:", page.url());

    const posEditText = await page.evaluate(() => document.body.innerText?.substring(0, 600));
    console.log("Texto:", posEditText?.replace(/\n/g, " ").substring(0, 400));

    // Listar todos os botões visíveis
    const posEditBtns = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(el => ({
        text: el.textContent?.trim().substring(0, 60),
        disabled: el.disabled,
        class: el.className?.substring(0, 50),
      })).filter(b => b.text && b.text.length > 0 && !["1","2","3","4","5","CSV"].includes(b.text))
    );
    console.log("Botões:", JSON.stringify(posEditBtns, null, 2));

    // Tentar clicar em Continuar
    console.log("\n▶️  Continuar (1)...");
    const cont1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return t?.includes("continuar") || t?.includes("próximo") || t?.includes("proximo") || t?.includes("avançar") || t?.includes("next") || t?.includes("processar") || t?.includes("calcular");
      });
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Continuar 1:", cont1);
    await sleep(6000);
    await page.screenshot({ path: "/tmp/dpote-03-continuar1.png" });
    console.log("📸 /tmp/dpote-03-continuar1.png");

    const c1Text = await page.evaluate(() => document.body.innerText?.substring(0, 600));
    console.log("Texto:", c1Text?.replace(/\n/g, " ").substring(0, 400));
    const c1Btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(el => ({
        text: el.textContent?.trim().substring(0, 60),
        disabled: el.disabled,
      })).filter(b => b.text && !["1","2","3","4","5","CSV"].includes(b.text))
    );
    console.log("Botões:", JSON.stringify(c1Btns, null, 2));

    // Continuar (2)
    console.log("\n▶️  Continuar (2)...");
    const cont2 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return t?.includes("continuar") || t?.includes("próximo") || t?.includes("proximo") || t?.includes("avançar") || t?.includes("next") || t?.includes("processar") || t?.includes("calcular");
      });
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Continuar 2:", cont2);
    await sleep(6000);
    await page.screenshot({ path: "/tmp/dpote-04-continuar2.png" });
    console.log("📸 /tmp/dpote-04-continuar2.png");

    const c2Text = await page.evaluate(() => document.body.innerText?.substring(0, 600));
    console.log("Texto:", c2Text?.replace(/\n/g, " ").substring(0, 400));
    const c2Btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).map(el => ({
        text: el.textContent?.trim().substring(0, 60),
        disabled: el.disabled,
      })).filter(b => b.text && !["1","2","3","4","5","CSV"].includes(b.text))
    );
    console.log("Botões:", JSON.stringify(c2Btns, null, 2));

    // Enviar
    console.log("\n📤 Enviar...");
    const enviar = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => {
        const t = b.textContent?.trim().toLowerCase();
        return t?.includes("enviar") || t?.includes("confirmar") || t?.includes("finalizar") || t?.includes("salvar") || t?.includes("concluir");
      });
      if (btn) { btn.click(); return btn.textContent?.trim(); }
      return null;
    });
    console.log("Enviar:", enviar);
    await sleep(8000);
    await page.screenshot({ path: "/tmp/dpote-05-enviar.png" });
    console.log("📸 /tmp/dpote-05-enviar.png");

    const envText = await page.evaluate(() => document.body.innerText?.substring(0, 800));
    console.log("Texto final:", envText?.replace(/\n/g, " ").substring(0, 500));

    // Verificar resultado via API
    const finalResp = await apiCall(token, "GET", `/api/painel/dpote/historico/${hId}`);
    console.log("\n📊 === RESULTADO FINAL ===");
    console.log("Faturamento:", JSON.stringify(finalResp.body?.faturamento));
    if (finalResp.body?.filiais_servicos?.length > 0) {
      console.log("Filiais:");
      finalResp.body.filiais_servicos.forEach(f => {
        const fichas = (f.servicos ?? []).reduce((a, s) => a + (s.fichas || 0), 0);
        console.log(`  - ${f.fil_bairro || f.fil_nome || f.id}: fichas=${fichas}`);
      });
    }

    console.log("\n📊 === CHAMADAS CAPTURADAS ===");
    for (const req of capturedRequests) {
      console.log(`  ${req.method} ${req.url} → ${req.status}`);
      if (req.body?.faturamento) console.log("  Faturamento:", JSON.stringify(req.body.faturamento));
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
