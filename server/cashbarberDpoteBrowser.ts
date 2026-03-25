/**
 * cashbarberDpoteBrowser.ts
 *
 * Automação browser headless (Puppeteer) para executar o fluxo Dpote no CashBarber.
 *
 * O fluxo Dpote exige interação com o painel web:
 *   Assinaturas → Dpote → Relatório → Mês atual → Criar Histórico
 *   → Continuar → Continuar → Enviar
 *
 * Após o envio, os dados de Comissão Bruta por filial ficam disponíveis
 * via API REST: GET /api/painel/dpote/historico/:id
 */

import puppeteer from "puppeteer-core";

const CB_URL = "https://app.cashbarber.com.br";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

export interface DpoteFilialResultado {
  id: number;
  nome: string;
  fichas: number;
  percentual: string;
  comissaoBruta: number;
}

export interface DpoteResultado {
  historicoId: number;
  valorAssinaturas: number;
  porcentagemBarbearias: number;
  comissaoBrutaTotal: number;
  totalFichas: number;
  filiais: DpoteFilialResultado[];
}

/**
 * Executa o fluxo completo Dpote no CashBarber via browser headless.
 * Faz login, navega pelo painel, cria/processa o histórico do mês atual
 * e retorna os valores de Comissão Bruta por filial.
 */
export async function executarFluxoDpote(
  email: string,
  senha: string
): Promise<DpoteResultado> {
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

    // ── 1. Login ──────────────────────────────────────────────────────────────
    console.log("[Dpote Browser] Navegando para login...");
    await page.goto(`${CB_URL}/login`, { waitUntil: "networkidle2", timeout: 30000 });

    // Preencher email e senha
    await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('input[placeholder*="email" i]');
    if (!emailInput) throw new Error("Campo de email não encontrado na tela de login");
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(email);

    const senhaInput = await page.$('input[type="password"]');
    if (!senhaInput) throw new Error("Campo de senha não encontrado");
    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha);

    // Submeter login
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
      page.keyboard.press("Enter"),
    ]);
    console.log("[Dpote Browser] Login realizado. URL:", page.url());

    // ── 2. Navegar para Assinaturas → Dpote ──────────────────────────────────
    console.log("[Dpote Browser] Navegando para Dpote...");
    await page.goto(`${CB_URL}/assinaturas/dpote`, { waitUntil: "networkidle2", timeout: 30000 });
    console.log("[Dpote Browser] URL Dpote:", page.url());

    // Aguardar o botão "Relatório" ou link para relatório
    await page.waitForSelector('a[href*="relatorio"], button:has-text("Relatório"), [data-testid*="relatorio"]', { timeout: 10000 }).catch(() => {});

    // Clicar em "Relatório"
    const relatorioClicado = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button"));
      const relatorio = links.find(
        (el) => el.textContent?.trim().toLowerCase().includes("relatório") ||
                el.textContent?.trim().toLowerCase().includes("relatorio")
      );
      if (relatorio) { (relatorio as HTMLElement).click(); return true; }
      return false;
    });
    if (!relatorioClicado) {
      // Tentar navegar diretamente
      await page.goto(`${CB_URL}/assinaturas/dpote/relatorio`, { waitUntil: "networkidle2", timeout: 30000 });
    } else {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    }
    console.log("[Dpote Browser] URL após Relatório:", page.url());

    // ── 3. Interceptar a chamada de API do histórico ──────────────────────────
    // Configurar interceptação de respostas para capturar o ID e os dados do histórico
    let historicoId: number | null = null;
    let historicoData: any = null;

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/painel/dpote/historico") && response.request().method() === "POST") {
        try {
          const body = await response.json();
          if (typeof body === "number") {
            historicoId = body;
            console.log(`[Dpote Browser] Histórico criado via interceptação: ID ${historicoId}`);
          }
        } catch {}
      }
      if (url.includes("/api/painel/dpote/historico/") && response.request().method() === "GET") {
        try {
          const body = await response.json();
          if (body?.faturamento && body?.filiais_servicos) {
            const totalFichas = body.filiais_servicos.reduce(
              (acc: number, f: any) => acc + (f.servicos?.reduce((a: number, s: any) => a + (s.fichas || 0), 0) || 0),
              0
            );
            if (totalFichas > 0 || body.faturamento.valor_ganho_assinaturas > 0) {
              historicoData = body;
              console.log(`[Dpote Browser] Dados do histórico capturados: ${totalFichas} fichas, R$ ${body.faturamento.valor_ganho_assinaturas}`);
            }
          }
        } catch {}
      }
    });

    // ── 4. Clicar em "Criar Histórico" / "Analisar" ───────────────────────────
    await new Promise((r) => setTimeout(r, 2000));

    // Tentar clicar em botão de criar/analisar
    const criarClicado = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const criar = buttons.find(
        (el) =>
          el.textContent?.trim().toLowerCase().includes("criar histórico") ||
          el.textContent?.trim().toLowerCase().includes("criar historico") ||
          el.textContent?.trim().toLowerCase().includes("analisar") ||
          el.textContent?.trim().toLowerCase().includes("gerar relatório") ||
          el.textContent?.trim().toLowerCase().includes("novo relatório")
      );
      if (criar) { (criar as HTMLElement).click(); return criar.textContent?.trim(); }
      return null;
    });
    console.log("[Dpote Browser] Botão clicado:", criarClicado);

    // Aguardar e avançar pelos passos "Continuar"
    for (let step = 1; step <= 3; step++) {
      await new Promise((r) => setTimeout(r, 3000));

      const continuarClicado = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const continuar = buttons.find(
          (el) =>
            el.textContent?.trim().toLowerCase() === "continuar" ||
            el.textContent?.trim().toLowerCase() === "próximo" ||
            el.textContent?.trim().toLowerCase() === "proximo" ||
            el.textContent?.trim().toLowerCase() === "enviar" ||
            el.textContent?.trim().toLowerCase() === "confirmar"
        );
        if (continuar) { (continuar as HTMLElement).click(); return continuar.textContent?.trim(); }
        return null;
      });
      console.log(`[Dpote Browser] Step ${step} - botão clicado:`, continuarClicado);

      if (!continuarClicado) break;
    }

    // Aguardar processamento
    await new Promise((r) => setTimeout(r, 5000));

    // ── 5. Extrair dados da página ────────────────────────────────────────────
    // Se já capturamos via interceptação, usar esses dados
    if (!historicoData && historicoId) {
      // Tentar buscar via API com o token do cookie
      const cookies = await page.cookies();
      const tokenCookie = cookies.find((c) => c.name === "access_token_painel");
      if (tokenCookie) {
        const resp = await fetch(`https://api.cashbarber.com.br/api/painel/dpote/historico/${historicoId}`, {
          headers: { Authorization: `Bearer ${tokenCookie.value}` },
        });
        if (resp.ok) {
          historicoData = await resp.json();
          console.log("[Dpote Browser] Dados buscados via API após fluxo");
        }
      }
    }

    // Se ainda não temos dados, tentar extrair da página
    if (!historicoData) {
      console.log("[Dpote Browser] Tentando extrair dados da página...");
      const pageData = await page.evaluate(() => {
        // Procurar dados em elementos da página
        const rows = Array.from(document.querySelectorAll("tr, [class*='filial'], [class*='row']"));
        const filiais: any[] = [];
        for (const row of rows) {
          const text = row.textContent ?? "";
          if (text.includes("fichas") || text.includes("Fichas")) {
            filiais.push(text.trim());
          }
        }

        // Procurar valores monetários
        const valorElements = Array.from(document.querySelectorAll("[class*='valor'], [class*='total'], [class*='comissao']"));
        const valores = valorElements.map((el) => el.textContent?.trim());

        return { filiais: filiais.slice(0, 10), valores: valores.slice(0, 10), url: window.location.href };
      });
      console.log("[Dpote Browser] Dados da página:", JSON.stringify(pageData).substring(0, 500));
    }

    // ── 6. Calcular resultado ─────────────────────────────────────────────────
    if (!historicoData) {
      throw new Error("Não foi possível obter os dados do histórico Dpote via browser. O fluxo pode ter mudado no painel do CashBarber.");
    }

    const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = historicoData.faturamento;
    const comissaoBrutaTotal = valor_ganho_assinaturas * (porcentagem_comissao_barbearias / 100);

    let totalFichas = 0;
    const filiais: DpoteFilialResultado[] = historicoData.filiais_servicos.map((f: any) => {
      const fichas = (f.servicos ?? []).reduce((acc: number, s: any) => acc + (s.fichas || 0), 0);
      totalFichas += fichas;
      return { id: f.filial.id, nome: f.filial.fil_bairro, fichas };
    });

    const filiaisComValor: DpoteFilialResultado[] = filiais
      .map((f) => ({
        ...f,
        percentual: totalFichas > 0 ? ((f.fichas / totalFichas) * 100).toFixed(2) : "0.00",
        comissaoBruta: totalFichas > 0 ? Math.round(comissaoBrutaTotal * (f.fichas / totalFichas)) : 0,
      }))
      .sort((a, b) => b.fichas - a.fichas);

    return {
      historicoId: historicoId ?? 0,
      valorAssinaturas: valor_ganho_assinaturas,
      porcentagemBarbearias: porcentagem_comissao_barbearias,
      comissaoBrutaTotal: Math.round(comissaoBrutaTotal),
      totalFichas,
      filiais: filiaisComValor,
    };
  } finally {
    await browser.close();
  }
}
