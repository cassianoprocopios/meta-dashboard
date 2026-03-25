/**
 * Script: Executar fluxo completo do Dpote usando dados reais do CashBarber
 * - Busca agendamentos realizados no mês via API
 * - Preenche fichas por serviço automaticamente
 * - Valor total das assinaturas: R$ 145.000,00
 * - Porcentagem barbearia: 65%
 */

import puppeteer from "puppeteer-core";

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_API = "https://api.cashbarber.com.br";
const CB_PAINEL = "https://painel.cashbarber.com.br";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

// Março 2026
const MES_INICIO = "2026-03-01";
const MES_FIM = "2026-03-31";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/dpote-cb-${name}.png`, fullPage: false });
  console.log(`📸 /tmp/dpote-cb-${name}.png`);
}

async function loginAPI() {
  const resp = await fetch(`${CB_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA }),
  });
  const data = await resp.json();
  const setCookie = resp.headers.get("set-cookie") ?? "";
  const tokenMatch = setCookie.match(/token=([^;]+)/);
  const token = tokenMatch?.[1] ?? data?.data?.token ?? data?.token;
  if (!token) throw new Error("Token não encontrado no login");
  return token;
}

async function apiGet(token, path) {
  const resp = await fetch(`${CB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GET ${path} → ${resp.status}: ${text.substring(0, 200)}`);
  }
  return resp.json();
}

async function apiPost(token, path, body) {
  const resp = await fetch(`${CB_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.warn(`POST ${path} → ${resp.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return resp.json();
}

async function main() {
  console.log("🔐 Fazendo login na API...");
  const token = await loginAPI();
  console.log("✅ Token obtido");

  // ===== BUSCAR FILIAIS =====
  console.log("\n📋 Buscando filiais...");
  const filiaisResp = await apiGet(token, "/api/painel/filial/list");
  const filiais = filiaisResp?.data ?? filiaisResp ?? [];
  const filiaisArr = Array.isArray(filiais) ? filiais : filiais?.data ?? [];
  console.log(`Filiais encontradas: ${filiaisArr.length}`);
  filiaisArr.forEach((f) => console.log(`  [${f.id}] ${f.fil_bairro}`));

  // ===== BUSCAR AGENDAMENTOS POR FILIAL =====
  // Tentar endpoint de agendamentos/serviços realizados
  console.log("\n📅 Buscando agendamentos realizados em março/2026...");

  const endpoints = [
    `/api/painel/agendamento/list`,
    `/api/painel/caixa/list`,
    `/api/painel/relatorio/servicos`,
    `/api/painel/relatorio/faturamento`,
  ];

  let agendamentosData = null;
  for (const ep of endpoints) {
    try {
      const resp = await apiPost(token, ep, {
        data_inicio: MES_INICIO,
        data_fim: MES_FIM,
        rows: 9999,
        first: 0,
        page: 0,
        totalRecords: 0,
        loading: false,
        globalFilter: null,
      });
      if (resp) {
        console.log(`✅ ${ep} → OK`);
        const data = resp?.data?.data ?? resp?.data ?? resp;
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   ${data.length} registros`);
          agendamentosData = { endpoint: ep, data };
          break;
        }
      }
    } catch (e) {
      console.log(`  ❌ ${ep}: ${e.message.substring(0, 60)}`);
    }
  }

  // ===== BUSCAR HISTÓRICO DPOTE EXISTENTE PARA VER ESTRUTURA =====
  console.log("\n🔍 Buscando histórico Dpote existente para ver estrutura de dados...");
  const historicoResp = await apiPost(token, "/api/painel/dpote/historico/list", {
    data: null,
    rows: 10,
    totalRecords: 0,
    first: 0,
    last: 0,
    page: 0,
    loading: false,
    first_visit: true,
    globalFilter: null,
    mostrar_inativos: null,
  });
  const historicos = historicoResp?.data?.data ?? [];
  console.log(`Históricos encontrados: ${historicos.length}`);

  // Pegar o histórico com "Alterado: Sim" (já editado)
  const historicoEditado = historicos.find((h) => h.alterado === 1);
  if (historicoEditado) {
    console.log(`\nHistórico editado: ID ${historicoEditado.id}`);
    const detalhes = await apiGet(token, `/api/painel/dpote/historico/${historicoEditado.id}`);
    console.log("Detalhes:", JSON.stringify(detalhes, null, 2));
  }

  // ===== BUSCAR DADOS DE SERVIÇOS VIA RELATÓRIO DPOTE =====
  console.log("\n📊 Tentando buscar dados via relatório Dpote...");
  const relatorioEndpoints = [
    `/api/painel/dpote/relatorio`,
    `/api/painel/dpote/servicos`,
    `/api/painel/dpote/fichas`,
    `/api/painel/dpote/historico/dados`,
  ];

  for (const ep of relatorioEndpoints) {
    try {
      const resp = await apiPost(token, ep, {
        data_inicio: MES_INICIO,
        data_fim: MES_FIM,
      });
      if (resp) {
        console.log(`✅ ${ep}:`, JSON.stringify(resp)?.substring(0, 300));
      }
    } catch (e) {
      console.log(`  ❌ ${ep}: ${e.message.substring(0, 60)}`);
    }
  }

  // ===== TENTAR BUSCAR DADOS DO RELATÓRIO 17 (DPOTE) =====
  console.log("\n📊 Tentando relatório 17 (Dpote)...");
  try {
    const rel17 = await apiPost(token, "/api/painel/relatorio/relatorio17", {
      data_inicio: MES_INICIO,
      data_fim: MES_FIM,
      rows: 9999,
      first: 0,
    });
    if (rel17) {
      console.log("Relatório 17:", JSON.stringify(rel17)?.substring(0, 500));
    }
  } catch (e) {
    console.log("Relatório 17 erro:", e.message.substring(0, 100));
  }

  // ===== BUSCAR DADOS DE SERVIÇOS VIA CAIXA/FATURAMENTO =====
  console.log("\n💰 Buscando faturamento por filial em março...");
  for (const filial of filiaisArr.slice(0, 5)) {
    try {
      const resp = await apiPost(token, "/api/painel/caixa/list", {
        data_inicio: MES_INICIO,
        data_fim: MES_FIM,
        filial_id: filial.id,
        rows: 9999,
        first: 0,
        page: 0,
        totalRecords: 0,
        loading: false,
        globalFilter: null,
      });
      if (resp) {
        const data = resp?.data?.data ?? resp?.data ?? resp;
        const total = Array.isArray(data) ? data.length : "?";
        console.log(`  [${filial.id}] ${filial.fil_bairro}: ${total} registros`);
        if (Array.isArray(data) && data.length > 0) {
          console.log("    Exemplo:", JSON.stringify(data[0])?.substring(0, 200));
        }
      }
    } catch (e) {
      console.log(`  [${filial.id}] ${filial.fil_bairro}: ${e.message.substring(0, 60)}`);
    }
  }

  // ===== USAR BROWSER PARA PREENCHER COM DADOS REAIS =====
  console.log("\n\n🚀 Iniciando browser para preencher Dpote com dados reais...");
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
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Interceptar para capturar dados que o frontend carrega
    const capturedData = {};
    await page.setRequestInterception(true);
    page.on("request", (req) => req.continue());
    page.on("response", async (response) => {
      const url = response.url();
      if (!url.includes("api.cashbarber.com.br")) return;
      try {
        const ct = response.headers()["content-type"] ?? "";
        if (!ct.includes("json")) return;
        const body = await response.json();
        const shortUrl = url.replace("https://api.cashbarber.com.br", "");
        if (url.includes("dpote")) {
          console.log(`🌐 ${response.request().method()} ${shortUrl} → ${response.status()}`);
          capturedData[shortUrl] = body;
        }
      } catch {}
    });

    // Login
    await page.goto(`${CB_PAINEL}/auth/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000);
    const inputs = await page.$$("input");
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(CB_EMAIL, { delay: 80 });
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type(CB_SENHA, { delay: 80 });
    }
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await sleep(3000);
    if (page.url().includes("login")) throw new Error("Login falhou");
    console.log("✅ Login OK");

    // Navegar para históricos
    await page.goto(`${CB_PAINEL}/dpote/historicos`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(5000);

    // Clicar no botão editar do primeiro histórico
    await page.mouse.click(757, 557);
    await sleep(5000);
    await screenshot(page, "01-passo1");

    // Verificar o que o frontend carregou para o histórico
    console.log("\n📊 Dados carregados pelo frontend para o histórico:");
    for (const [url, data] of Object.entries(capturedData)) {
      if (url.includes("/historico/") && !url.includes("list")) {
        console.log(`  ${url}:`, JSON.stringify(data)?.substring(0, 500));
      }
    }

    // Verificar os campos de serviço disponíveis no passo 1
    const servicosCampos = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input[type='number'], input[type='text']"));
      return inputs
        .filter((i) => {
          const rect = i.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((i) => {
          const label = i.closest(".p-float-label, .field, .form-group")?.querySelector("label, .p-label");
          return {
            name: i.name || i.id,
            label: label?.textContent?.trim() || i.placeholder,
            value: i.value,
            y: Math.round(i.getBoundingClientRect().y),
            x: Math.round(i.getBoundingClientRect().x),
          };
        });
    });
    console.log("\nCampos de serviço no passo 1:", JSON.stringify(servicosCampos, null, 2));

    // Verificar estrutura do componente Angular para entender como preencher
    const angularData = await page.evaluate(() => {
      // Tentar acessar dados do Angular
      const el = document.querySelector("[ng-version], [_nghost-ng-c]");
      if (!el) return "Angular não detectado";
      
      // Verificar se há ng-reflect nos inputs
      const inputs = Array.from(document.querySelectorAll("input[ng-reflect-model], input[ng-reflect-name]"));
      return inputs.slice(0, 5).map(i => ({
        ngModel: i.getAttribute("ng-reflect-model"),
        ngName: i.getAttribute("ng-reflect-name"),
        value: i.value,
      }));
    });
    console.log("\nDados Angular:", JSON.stringify(angularData));

    // Verificar o dropdown de filiais
    const dropdownEl = await page.evaluate(() => {
      const dropdowns = Array.from(document.querySelectorAll("p-dropdown, p-multiselect"));
      return dropdowns.map(d => ({
        tag: d.tagName,
        ngModel: d.getAttribute("ng-reflect-model") || d.getAttribute("ng-reflect-options"),
        class: d.className?.substring(0, 50),
        y: Math.round(d.getBoundingClientRect().y),
        x: Math.round(d.getBoundingClientRect().x),
      }));
    });
    console.log("\nDropdowns Angular:", JSON.stringify(dropdownEl, null, 2));

    // Tentar selecionar via clique no elemento p-dropdown
    if (dropdownEl.length > 0) {
      const dd = dropdownEl[0];
      console.log(`\n🖱️  Clicando no p-dropdown em (${dd.x + 50}, ${dd.y + 15})...`);
      await page.mouse.click(dd.x + 50, dd.y + 15);
      await sleep(2000);
      await screenshot(page, "02-dropdown-pclick");

      // Verificar opções
      const opcoes = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll(
          "p-dropdownitem li, .p-dropdown-item, li.p-dropdown-item"
        ));
        return items.map(i => ({
          text: i.textContent?.trim(),
          y: Math.round(i.getBoundingClientRect().y),
          x: Math.round(i.getBoundingClientRect().x),
          class: i.className?.substring(0, 50),
        }));
      });
      console.log("Opções dropdown:", JSON.stringify(opcoes, null, 2));

      if (opcoes.length > 0) {
        // Selecionar cada opção
        for (const opcao of opcoes) {
          console.log(`  Selecionando: ${opcao.text} (${opcao.x + 10}, ${opcao.y + 8})`);
          await page.mouse.click(opcao.x + 10, opcao.y + 8);
          await sleep(1000);
          
          // Verificar se o dropdown fechou
          const fechou = await page.evaluate(() => {
            return !document.querySelector("p-dropdownitem li, .p-dropdown-item");
          });
          
          if (fechou && opcoes.indexOf(opcao) < opcoes.length - 1) {
            // Reabrir para próxima opção
            await page.mouse.click(dd.x + 50, dd.y + 15);
            await sleep(1500);
          }
        }
        await page.mouse.click(640, 200);
        await sleep(1000);
        await screenshot(page, "03-filiais-selecionadas");
      }
    }

    // Verificar estado após seleção
    const estadoApos = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const cont = btns.find(b => b.textContent?.trim() === "Continuar");
      const totalFichas = document.body.innerText.match(/Total fichas\s*(\d+)/i)?.[1];
      const dropdownValue = document.querySelector(".p-dropdown-label")?.textContent?.trim();
      return {
        continuarDesabilitado: cont?.disabled,
        totalFichas,
        dropdownValue,
      };
    });
    console.log("\nEstado após seleção:", JSON.stringify(estadoApos));

    await screenshot(page, "04-estado-final");

  } finally {
    await browser.close();
    console.log("\n✅ Browser fechado.");
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
