/**
 * avecBrowser.ts
 *
 * Automação browser headless (Puppeteer) para autenticação no Avec.
 *
 * Fluxo:
 *   1. Acessa terminal.avec.beauty e busca o salão pelo email
 *   2. Preenche email e senha na tela de login do salão
 *   3. Extrai os cookies de sessão após login bem-sucedido
 *   4. Usa os cookies para acessar os endpoints de faturamento do admin
 */

import puppeteer from "puppeteer-core";

const TERMINAL_URL = "https://terminal.avec.beauty";
const ADMIN_URL = "https://admin.avec.beauty";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

// ─── Cache de sessão ──────────────────────────────────────────────────────────

interface AvecSessao {
  cookies: string;
  salaoSlug: string;
  expiry: number;
}

let _sessaoCache: AvecSessao | null = null;

// ─── Login via Browser Headless ───────────────────────────────────────────────

/**
 * Faz login no Avec via browser headless (terminal.avec.beauty) e retorna
 * os cookies de sessão. Reutiliza sessão em cache por até 50 minutos.
 */
export async function avecBrowserLogin(
  email: string,
  senha: string
): Promise<{ cookies: string; salaoSlug: string }> {
  const agora = Date.now();
  if (_sessaoCache && agora < _sessaoCache.expiry) {
    console.log("[Avec Browser] Reutilizando sessão em cache.");
    return { cookies: _sessaoCache.cookies, salaoSlug: _sessaoCache.salaoSlug };
  }

  console.log(`[Avec Browser] Iniciando login para ${email}...`);

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

    // ── 1. Buscar salão pelo email ────────────────────────────────────────────
    console.log("[Avec Browser] Acessando terminal.avec.beauty...");
    await page.goto(TERMINAL_URL, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForSelector('input[type="text"], input[name="text"]', { timeout: 10000 });
    const searchInput = await page.$('input[type="text"], input[name="text"]');
    if (!searchInput) throw new Error("[Avec Browser] Campo de busca não encontrado.");

    await searchInput.click({ clickCount: 3 });
    await searchInput.type(email, { delay: 50 });
    await page.keyboard.press("Enter");
    await new Promise(r => setTimeout(r, 2000));

    // Extrair o slug do salão da URL
    const urlAposBusca = page.url();
    const slugMatch = urlAposBusca.match(/\/login\/([^/?]+)/);
    const salaoSlug = slugMatch ? slugMatch[1] : "seraphine-beauty-ltda";
    console.log(`[Avec Browser] Slug do salão: ${salaoSlug}`);

    // ── 2. Preencher email na tela de login ───────────────────────────────────
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) throw new Error("[Avec Browser] Campo de email não encontrado.");

    // Limpar campo e digitar email (triple-click + Ctrl+A para garantir limpeza)
    await emailInput.click({ clickCount: 3 });
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await emailInput.type(email, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // ── 3. Preencher senha ────────────────────────────────────────────────────
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    const senhaInput = await page.$('input[type="password"]');
    if (!senhaInput) throw new Error("[Avec Browser] Campo de senha não encontrado.");

    await senhaInput.click({ clickCount: 3 });
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await senhaInput.type(senha, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    // ── 4. Clicar no botão Entrar ─────────────────────────────────────────────
    // Buscar botão Entrar via evaluate e clicar via click() direto
    const botaoClicado = await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll<HTMLElement>('button, input[type="submit"]'));
      const botao = botoes.find(b => b.textContent?.includes('Entrar') || (b as HTMLInputElement).value?.includes('Entrar') || (b as HTMLButtonElement).type === 'submit');
      if (botao) {
        botao.click();
        return true;
      }
      return false;
    });
    
    if (botaoClicado) {
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    } else {
      // Fallback: pressionar Enter na senha
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
        page.keyboard.press("Enter"),
      ]);
    }
    await new Promise(r => setTimeout(r, 2000));

    const urlAposLogin = page.url();
    console.log(`[Avec Browser] URL após login: ${urlAposLogin}`);

    if (urlAposLogin.includes("/login/")) {
      // Verificar mensagens de erro
      const erros = await page.evaluate(() => {
        const els = document.querySelectorAll(".error, .alert-danger, [class*='error'], [class*='danger'], .toast");
        return Array.from(els).map(e => e.textContent?.trim()).filter(Boolean);
      });
      throw new Error(`[Avec Browser] Login falhou. Erros: ${erros.join(", ") || "Credenciais inválidas"}`);
    }

    // ── 4. Extrair cookies ────────────────────────────────────────────────────
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");

    console.log(`[Avec Browser] Login bem-sucedido! ${cookies.length} cookies extraídos.`);

    _sessaoCache = {
      cookies: cookieStr,
      salaoSlug,
      expiry: agora + 50 * 60 * 1000,
    };

    return { cookies: cookieStr, salaoSlug };
  } finally {
    await browser.close();
  }
}

/**
 * Invalida o cache de sessão (força novo login na próxima chamada).
 */
export function avecBrowserInvalidarSessao(): void {
  _sessaoCache = null;
  console.log("[Avec Browser] Cache de sessão invalidado.");
}

// ─── Busca de faturamento via admin.avec.beauty ───────────────────────────────

/**
 * Busca o faturamento por categoria para um dia específico via admin.avec.beauty.
 * Usa o Puppeteer para navegar até a página de histórico de caixas e extrair os dados.
 */
export async function avecBrowserBuscarFaturamentoDia(
  email: string,
  senha: string,
  data: string // YYYY-MM-DD
): Promise<{
  cabelo: number;
  manicurePedicure: number;
  sobrancelha: number;
  pacote: number;
  recorrencia: number;
  total: number;
}> {
  const resultado = {
    cabelo: 0,
    manicurePedicure: 0,
    sobrancelha: 0,
    pacote: 0,
    recorrencia: 0,
    total: 0,
  };

  const { cookies, salaoSlug } = await avecBrowserLogin(email, senha);

  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;
  const dataHifen = `${dia}-${mes}-${ano}`;

  // Tentar endpoint de consultoria por dia (retorna dados por categoria)
  const consultoriaUrl = `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=${dataHifen}&dataFim=${dataHifen}`;

  const consultoriaRes = await fetch(consultoriaUrl, {
    headers: {
      Cookie: cookies,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });

  if (consultoriaRes.ok) {
    try {
      const json = await consultoriaRes.json() as any;
      const servicos = json?.servicos ?? json?.data?.servicos ?? json?.data ?? [];

      if (Array.isArray(servicos) && servicos.length > 0) {
        for (const s of servicos) {
          const nome = (s.nome ?? s.servico ?? s.categoria ?? s.name ?? "").toLowerCase();
          const valor = parseFloat(s.faturamento ?? s.valor ?? s.total ?? s.revenue ?? 0);

          if (nome.includes("cabelo") || nome.includes("hair")) {
            resultado.cabelo += valor;
          } else if (nome.includes("manicure") || nome.includes("pedicure") || nome.includes("unha")) {
            resultado.manicurePedicure += valor;
          } else if (nome.includes("sobrancelha") || nome.includes("design")) {
            resultado.sobrancelha += valor;
          } else if (nome.includes("pacote") || nome.includes("package")) {
            resultado.pacote += valor;
          } else if (nome.includes("recorr") || nome.includes("assinatura") || nome.includes("plano")) {
            resultado.recorrencia += valor;
          }
        }
        resultado.total = resultado.cabelo + resultado.manicurePedicure + resultado.sobrancelha + resultado.pacote + resultado.recorrencia;
        return resultado;
      }
    } catch {
      // Silenciar erros de parse
    }
  }

  // Fallback: buscar via histórico de caixas (HTML scraping)
  const caixaUrl = `${ADMIN_URL}/admin/financeiro/caixa/historico?fechamento=${encodeURIComponent(dataFormatada)}`;
  const caixaRes = await fetch(caixaUrl, {
    headers: {
      Cookie: cookies,
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });

  if (caixaRes.ok) {
    const html = await caixaRes.text();

    // Extrair total geral
    const totalMatch = html.match(/TOTAL FATURADO[\s\S]*?R\$\s*([\d.,]+)/i);
    if (totalMatch) {
      resultado.total = parseFloat(totalMatch[1].replace(/\./g, "").replace(",", "."));
    }
  }

  return resultado;
}

/**
 * Busca o faturamento por categoria para um mês inteiro usando o dashboard do Avec.
 * Retorna um mapa de data (YYYY-MM-DD) para valores por categoria.
 */
export async function avecBrowserBuscarFaturamentoMes(
  email: string,
  senha: string,
  mes: number,
  ano: number
): Promise<Map<string, {
  cabelo: number;
  manicurePedicure: number;
  sobrancelha: number;
  pacote: number;
  recorrencia: number;
  total: number;
}>> {
  const { cookies } = await avecBrowserLogin(email, senha);
  const resultado = new Map<string, { cabelo: number; manicurePedicure: number; sobrancelha: number; pacote: number; recorrencia: number; total: number }>();

  const mesStr = String(mes).padStart(2, "0");
  const ultimoDia = new Date(ano, mes, 0).getDate();

  // Buscar dados do mês inteiro via dashboard de consultoria
  const dataInicio = `01-${mesStr}-${ano}`;
  const dataFim = `${String(ultimoDia).padStart(2, "0")}-${mesStr}-${ano}`;

  const url = `${ADMIN_URL}/admin/consultoria/dados?dashboard=262&periodo=mes&mesFiltro=${mesStr}-${ano}`;
  console.log(`[Avec Browser] Buscando faturamento do mês ${mes}/${ano}...`);

  const res = await fetch(url, {
    headers: {
      Cookie: cookies,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });

  if (res.ok) {
    try {
      const json = await res.json() as any;
      console.log(`[Avec Browser] Resposta consultoria mês:`, JSON.stringify(json).substring(0, 300));

      // Processar dados por dia
      const diasData = json?.dias ?? json?.data?.dias ?? json?.porDia ?? [];
      if (Array.isArray(diasData)) {
        for (const dia of diasData) {
          const dataStr = dia.data ?? dia.date ?? "";
          if (!dataStr) continue;

          // Normalizar para YYYY-MM-DD
          let dataFormatada = dataStr;
          if (dataStr.includes("/")) {
            const [d, m, a] = dataStr.split("/");
            dataFormatada = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }

          const servicos = dia.servicos ?? dia.categorias ?? [];
          const diaResult = { cabelo: 0, manicurePedicure: 0, sobrancelha: 0, pacote: 0, recorrencia: 0, total: 0 };

          for (const s of servicos) {
            const nome = (s.nome ?? s.categoria ?? "").toLowerCase();
            const valor = parseFloat(s.faturamento ?? s.valor ?? 0);

            if (nome.includes("cabelo")) diaResult.cabelo += valor;
            else if (nome.includes("manicure") || nome.includes("pedicure")) diaResult.manicurePedicure += valor;
            else if (nome.includes("sobrancelha")) diaResult.sobrancelha += valor;
            else if (nome.includes("pacote")) diaResult.pacote += valor;
            else if (nome.includes("recorr")) diaResult.recorrencia += valor;
          }

          diaResult.total = diaResult.cabelo + diaResult.manicurePedicure + diaResult.sobrancelha + diaResult.pacote + diaResult.recorrencia;
          resultado.set(dataFormatada, diaResult);
        }
      }
    } catch {
      // Silenciar erros de parse
    }
  }

  return resultado;
}
