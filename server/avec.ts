/**
 * Módulo de integração com a API do Avec (admin.avec.beauty)
 *
 * O Avec usa autenticação via cookie de sessão.
 * Os dados de faturamento por categoria/dia são obtidos via
 * endpoint de histórico de caixas e relatório financeiro.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AvecLoginResult {
  sessionCookie: string;
  salaoId: string;
  salaoNome: string;
}

export interface AvecCaixaDia {
  data: string; // YYYY-MM-DD
  totalFaturado: number;
}

export interface AvecFaturamentoPorCategoria {
  data: string; // YYYY-MM-DD
  cabelo: number;
  manicurePedicure: number;
  sobrancelha: number;
  pacote: number;
  recorrencia: number;
  total: number;
}

export interface AvecServico {
  nome: string;
  categoria: string;
  faturamento: number;
  quantidade: number;
}

// ─── Cache de sessão ──────────────────────────────────────────────────────────

let _sessionCache: { cookie: string; expiry: number; salaoSlug: string } | null = null;

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Faz login no Avec e retorna o cookie de sessão.
 * Reutiliza sessão em cache por até 30 minutos.
 */
export async function avecLogin(email: string, senha: string): Promise<string> {
  const agora = Date.now();
  if (_sessionCache && agora < _sessionCache.expiry) {
    return _sessionCache.cookie;
  }

  // Passo 1: descobrir o slug do salão pelo email
  const searchRes = await fetch("https://www.avec.app/api/salao/buscar-por-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  let salaoSlug = "";
  if (searchRes.ok) {
    const data = await searchRes.json() as any;
    salaoSlug = data?.slug ?? "";
  }

  if (!salaoSlug) {
    // Tentar via URL de login do terminal
    const terminalRes = await fetch(`https://terminal.avec.beauty/login/${email.replace("@", "-").replace(".", "-")}`, {
      method: "GET",
      redirect: "follow",
    });
    const url = terminalRes.url;
    const match = url.match(/\/login\/([^/]+)/);
    if (match) salaoSlug = match[1];
  }

  // Passo 2: fazer login no admin
  const loginRes = await fetch(`https://admin.avec.beauty/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": `https://admin.avec.beauty/login/${salaoSlug}`,
      "Origin": "https://admin.avec.beauty",
    },
    body: JSON.stringify({ email, password: senha }),
    redirect: "manual",
  });

  // Extrair cookie de sessão
  const setCookieHeader = loginRes.headers.get("set-cookie") ?? "";
  const sessionMatch = setCookieHeader.match(/avec_session=[^;]+/);
  const sessionCookie = sessionMatch ? sessionMatch[0] : "";

  if (sessionCookie) {
    _sessionCache = { cookie: sessionCookie, expiry: agora + 30 * 60 * 1000, salaoSlug };
    return sessionCookie;
  }

  // Fallback: tentar via terminal.avec.beauty
  const terminalLoginRes = await fetch(`https://terminal.avec.beauty/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": `https://terminal.avec.beauty/login/${salaoSlug}`,
      "Origin": "https://terminal.avec.beauty",
    },
    body: JSON.stringify({ email, password: senha }),
    redirect: "manual",
  });

  const terminalCookies = terminalLoginRes.headers.get("set-cookie") ?? "";
  const terminalSession = terminalCookies.match(/[a-zA-Z_]+=([^;]+)/)?.[0] ?? "";

  if (terminalSession) {
    _sessionCache = { cookie: terminalSession, expiry: agora + 30 * 60 * 1000, salaoSlug };
    return terminalSession;
  }

  throw new Error(`[Avec] Falha no login para ${email}. Verifique as credenciais.`);
}

/**
 * Invalida o cache de sessão (força novo login na próxima chamada).
 */
export function avecInvalidarSessao(): void {
  _sessionCache = null;
}

// ─── Busca de faturamento por dia ─────────────────────────────────────────────

/**
 * Busca o faturamento total de um dia específico via histórico de caixas.
 */
export async function avecBuscarCaixaDia(
  sessionCookie: string,
  data: string // DD/MM/YYYY
): Promise<number> {
  const res = await fetch(
    `https://admin.avec.beauty/admin/financeiro/caixa/historico?fechamento=${encodeURIComponent(data)}`,
    {
      headers: {
        Cookie: sessionCookie,
        Accept: "text/html,application/xhtml+xml",
      },
    }
  );

  if (!res.ok) return 0;

  const html = await res.text();

  // Extrair TOTAL FATURADO da página HTML
  const matches = Array.from(html.matchAll(/TOTAL FATURADO[\s\S]*?<td[^>]*>([\d.,]+)<\/td>/gi));
  let total = 0;
  for (const match of matches) {
    const valor = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(valor)) total += valor;
  }

  return total;
}

// ─── Busca de faturamento por categoria via API do dashboard ──────────────────

/**
 * Busca os dados de faturamento por categoria para um período via API do Avec.
 * Usa o endpoint de consultoria/dashboard financeiro.
 */
export async function avecBuscarFaturamentoPorPeriodo(
  sessionCookie: string,
  dataInicio: string, // DD-MM-YYYY
  dataFim: string     // DD-MM-YYYY
): Promise<AvecServico[]> {
  const url = `https://admin.avec.beauty/admin/consultoria/dados?dashboard=262&periodo=periodo&dataInicio=${dataInicio}&dataFim=${dataFim}`;

  const res = await fetch(url, {
    headers: {
      Cookie: sessionCookie,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) return [];

  try {
    const data = await res.json() as any;
    const servicos: AvecServico[] = [];

    if (data?.servicos) {
      for (const s of data.servicos) {
        servicos.push({
          nome: s.nome ?? s.servico ?? "",
          categoria: s.categoria ?? "",
          faturamento: parseFloat(s.faturamento ?? s.valor ?? 0),
          quantidade: parseInt(s.quantidade ?? s.qtd ?? 0),
        });
      }
    }

    return servicos;
  } catch {
    return [];
  }
}

// ─── Busca de faturamento por dia via API interna ─────────────────────────────

/**
 * Busca o faturamento detalhado por categoria para um dia específico
 * usando a API de comandas finalizadas do Avec.
 */
export async function avecBuscarFaturamentoDia(
  sessionCookie: string,
  data: string // YYYY-MM-DD
): Promise<AvecFaturamentoPorCategoria> {
  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;

  // Buscar comandas finalizadas do dia
  const url = `https://admin.avec.beauty/admin/financeiro/comanda/finalizadas/dados?data=${dataFormatada}`;

  const res = await fetch(url, {
    headers: {
      Cookie: sessionCookie,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const resultado: AvecFaturamentoPorCategoria = {
    data,
    cabelo: 0,
    manicurePedicure: 0,
    sobrancelha: 0,
    pacote: 0,
    recorrencia: 0,
    total: 0,
  };

  if (!res.ok) return resultado;

  try {
    const json = await res.json() as any;
    const comandas = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

    for (const comanda of comandas) {
      const servicos = comanda.servicos ?? comanda.items ?? [];
      for (const s of servicos) {
        const categoria = (s.categoria ?? "").toLowerCase();
        const valor = parseFloat(s.valor ?? s.preco ?? 0);

        if (categoria.includes("cabelo") || categoria.includes("hair")) {
          resultado.cabelo += valor;
        } else if (categoria.includes("manicure") || categoria.includes("pedicure") || categoria.includes("unha")) {
          resultado.manicurePedicure += valor;
        } else if (categoria.includes("sobrancelha") || categoria.includes("design")) {
          resultado.sobrancelha += valor;
        } else if (categoria.includes("pacote") || categoria.includes("package")) {
          resultado.pacote += valor;
        } else if (categoria.includes("recorr") || categoria.includes("assinatura") || categoria.includes("plano")) {
          resultado.recorrencia += valor;
        }
      }
    }

    resultado.total = resultado.cabelo + resultado.manicurePedicure + resultado.sobrancelha + resultado.pacote + resultado.recorrencia;
  } catch {
    // Silenciar erros de parse
  }

  return resultado;
}

// ─── Busca via relatório financeiro por mês ───────────────────────────────────

/**
 * Busca o faturamento por categoria para cada dia de um mês
 * usando o relatório financeiro do Avec (endpoint de dashboard).
 *
 * Estratégia: para cada dia do mês, busca o histórico de caixas
 * e extrai o total faturado. Para a distribuição por categoria,
 * usa a proporção do mês inteiro aplicada ao dia.
 */
export async function avecBuscarFaturamentoMes(
  sessionCookie: string,
  mes: number,
  ano: number
): Promise<AvecFaturamentoPorCategoria[]> {
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const resultados: AvecFaturamentoPorCategoria[] = [];

  // Buscar proporções por categoria do mês inteiro
  const mesStr = String(mes).padStart(2, "0");
  const proporcoes = await avecBuscarProporcoesMes(sessionCookie, mes, ano);

  // Para cada dia do mês, buscar o total via histórico de caixas
  for (let d = 1; d <= ultimoDia; d++) {
    const diaStr = String(d).padStart(2, "0");
    const dataYMD = `${ano}-${mesStr}-${diaStr}`;
    const dataDMY = `${diaStr}/${mesStr}/${ano}`;

    const totalDia = await avecBuscarCaixaDia(sessionCookie, dataDMY);

    if (totalDia > 0) {
      resultados.push({
        data: dataYMD,
        cabelo: Math.round(totalDia * proporcoes.cabelo * 100) / 100,
        manicurePedicure: Math.round(totalDia * proporcoes.manicurePedicure * 100) / 100,
        sobrancelha: Math.round(totalDia * proporcoes.sobrancelha * 100) / 100,
        pacote: Math.round(totalDia * proporcoes.pacote * 100) / 100,
        recorrencia: Math.round(totalDia * proporcoes.recorrencia * 100) / 100,
        total: totalDia,
      });
    }
  }

  return resultados;
}

// ─── Proporções por categoria do mês ─────────────────────────────────────────

interface ProporcoesCategorias {
  cabelo: number;
  manicurePedicure: number;
  sobrancelha: number;
  pacote: number;
  recorrencia: number;
}

/**
 * Busca as proporções de faturamento por categoria para um mês inteiro.
 * Usa o dashboard financeiro do Avec.
 */
export async function avecBuscarProporcoesMes(
  sessionCookie: string,
  mes: number,
  ano: number
): Promise<ProporcoesCategorias> {
  const mesStr = String(mes).padStart(2, "0");
  const url = `https://admin.avec.beauty/admin/consultoria?dashboard=262&periodo=mes&mesFiltro=${mesStr}-${ano}`;

  const res = await fetch(url, {
    headers: {
      Cookie: sessionCookie,
      Accept: "text/html",
    },
  });

  // Proporções padrão baseadas nos dados históricos da Seraphine
  const propDefault: ProporcoesCategorias = {
    cabelo: 0.27,
    manicurePedicure: 0.55,
    sobrancelha: 0.10,
    pacote: 0.05,
    recorrencia: 0.03,
  };

  if (!res.ok) return propDefault;

  try {
    const html = await res.text();

    // Extrair dados de serviços mais vendidos por categoria
    const categorias: Record<string, number> = {
      cabelo: 0,
      manicurePedicure: 0,
      sobrancelha: 0,
      pacote: 0,
      recorrencia: 0,
    };

    // Extrair tabela de serviços mais vendidos
    const tabelaMatch = html.match(/Serviços mais vendidos[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
    if (tabelaMatch) {
      const linhas = Array.from(tabelaMatch[1].matchAll(/<tr[\s\S]*?<\/tr>/gi));
      for (const linha of linhas) {
        const cols = Array.from(linha[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
        if (cols.length >= 3) {
          const cat = cols[1]?.[1]?.replace(/<[^>]+>/g, "").trim().toLowerCase() ?? "";
          const val = parseFloat(cols[2]?.[1]?.replace(/<[^>]+>/g, "").replace(/\./g, "").replace(",", ".").trim() ?? "0");

          if (cat.includes("cabelo")) categorias.cabelo += val;
          else if (cat.includes("manicure") || cat.includes("pedicure")) categorias.manicurePedicure += val;
          else if (cat.includes("sobrancelha")) categorias.sobrancelha += val;
          else if (cat.includes("pacote")) categorias.pacote += val;
          else if (cat.includes("recorr") || cat.includes("assinatura")) categorias.recorrencia += val;
        }
      }
    }

    const totalCats = Object.values(categorias).reduce((a, b) => a + b, 0);
    if (totalCats > 0) {
      return {
        cabelo: categorias.cabelo / totalCats,
        manicurePedicure: categorias.manicurePedicure / totalCats,
        sobrancelha: categorias.sobrancelha / totalCats,
        pacote: categorias.pacote / totalCats,
        recorrencia: categorias.recorrencia / totalCats,
      };
    }
  } catch {
    // Silenciar erros
  }

  return propDefault;
}
