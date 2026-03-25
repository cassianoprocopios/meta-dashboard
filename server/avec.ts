/**
 * Serviço de integração com a API do Avec (admin.avec.beauty)
 *
 * O Avec usa autenticação via cookie de sessão (ci_session).
 * O endpoint principal de faturamento é:
 *   GET /admin/relatorios/listar?relatorio=0184&salao={salaoId}&inicio=DD%2FMM%2FAAAA&fim=DD%2FMM%2FAAAA
 * Retorna faturamento total por categoria: Serviços, Produtos, Caixinha, Pacotes.
 *
 * Para faturamento diário, usamos o relatório 0100 (pagamentos por comanda)
 * que contém a data de cada comanda e o valor, permitindo agrupar por dia.
 */

export interface AvecCategoriaFaturamento {
  categoria: string; // ex: "Serviços", "Produtos", "Caixinha", "Pacotes"
  quantidade: number;
  valor: number;     // valor em reais (float)
  percentual: number;
}

export interface AvecFaturamentoMensal {
  categorias: AvecCategoriaFaturamento[];
  totalGeral: number;
}

export interface AvecComanda {
  descricao: string;   // ex: "Comanda Nº1 - Lorena Begot (1/1)"
  formaPagamento: string;
  dataAbertura: string; // "YYYY-MM-DD HH:MM:SS"
  dataFechamento: string;
  profissional: string;
  caixa: string;
  valor?: number;       // extraído do relatório 0100 (pode não estar presente)
}

export interface AvecFaturamentoDiario {
  data: string;  // "YYYY-MM-DD"
  total: number; // valor total do dia em reais
}

/**
 * Faz login no Avec e retorna o cookie de sessão.
 * O Avec usa autenticação via formulário POST com redirect.
 */
export async function avecLogin(email: string, senha: string): Promise<string> {
  // Primeiro, acessar a página de login para obter o cookie inicial
  const loginPageResp = await fetch("https://admin.avec.beauty/admin/login", {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
    },
  });

  // Extrair cookies da página de login
  const initialCookies = loginPageResp.headers.get("set-cookie") || "";

  // Fazer o POST de autenticação
  const authResp = await fetch("https://admin.avec.beauty/admin/login/autenticar", {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
      "Cookie": extractCookieString(initialCookies),
      "Referer": "https://admin.avec.beauty/admin/login",
    },
    body: new URLSearchParams({
      email,
      senha,
    }).toString(),
  });

  // Capturar o cookie de sessão da resposta
  const setCookieHeader = authResp.headers.get("set-cookie") || "";
  const sessionCookie = extractCookieString(setCookieHeader);

  if (!sessionCookie) {
    throw new Error(`Avec: falha no login — cookie de sessão não encontrado (status: ${authResp.status})`);
  }

  // Verificar se o login foi bem-sucedido tentando acessar o painel
  const checkResp = await fetch("https://admin.avec.beauty/admin/financeiro", {
    method: "GET",
    redirect: "manual",
    headers: {
      "Cookie": sessionCookie,
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
    },
  });

  // Se redirecionar para login, as credenciais estão erradas
  const location = checkResp.headers.get("location") || "";
  if (location.includes("login") || checkResp.status === 302) {
    // Tentar abordagem alternativa: buscar o salão pelo email
    const salaoResp = await fetch("https://admin.avec.beauty/admin/login/buscar-salao", {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
        "Cookie": extractCookieString(initialCookies),
      },
      body: new URLSearchParams({ email }).toString(),
    });

    const salaoSetCookie = salaoResp.headers.get("set-cookie") || "";
    const salaoCookie = extractCookieString(salaoSetCookie) || extractCookieString(initialCookies);

    // Autenticar com o salão encontrado
    const authResp2 = await fetch("https://admin.avec.beauty/admin/login/autenticar", {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
        "Cookie": salaoCookie,
        "Referer": "https://admin.avec.beauty/admin/login",
      },
      body: new URLSearchParams({ email, senha }).toString(),
    });

    const setCookieHeader2 = authResp2.headers.get("set-cookie") || "";
    const sessionCookie2 = extractCookieString(setCookieHeader2);

    if (!sessionCookie2) {
      throw new Error(`Avec: falha no login — credenciais inválidas ou sessão não estabelecida`);
    }

    return sessionCookie2;
  }

  return sessionCookie;
}

/**
 * Extrai a string de cookies de um header Set-Cookie
 */
function extractCookieString(setCookieHeader: string): string {
  if (!setCookieHeader) return "";

  // Extrair apenas o nome=valor de cada cookie (sem atributos como Path, HttpOnly, etc.)
  const cookies = setCookieHeader
    .split(/,(?=[^;]+=[^;]+)/)
    .map(c => c.trim().split(";")[0].trim())
    .filter(c => c.includes("="))
    .join("; ");

  return cookies;
}

/**
 * Busca o faturamento mensal total por categoria do Avec.
 * Usa o relatório 0184 que retorna: Serviços, Produtos, Caixinha, Pacotes.
 *
 * @param sessionCookie - Cookie de sessão obtido via avecLogin
 * @param salaoId - ID do salão no Avec (ex: "95687")
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2026)
 */
export async function avecBuscarFaturamentoMensal(
  sessionCookie: string,
  salaoId: string,
  mes: number,
  ano: number
): Promise<AvecFaturamentoMensal> {
  const inicio = formatarDataAvec(1, mes, ano);
  const fim = formatarDataAvec(ultimoDiaDoMes(mes, ano), mes, ano);

  const url = `https://admin.avec.beauty/admin/relatorios/listar?relatorio=0184&salao=${salaoId}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": sessionCookie,
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
      "Referer": "https://admin.avec.beauty/admin/relatorios",
    },
  });

  if (!resp.ok) {
    throw new Error(`Avec: erro ao buscar faturamento mensal (status: ${resp.status})`);
  }

  const data = await resp.json() as {
    aaData: Array<[string, string, string, string]>;
    total: string;
  };

  // Extrair total geral do HTML do campo total
  const totalMatch = data.total?.match(/([\d.,]+)/);
  const totalGeral = totalMatch ? parseAvecValor(totalMatch[1]) : 0;

  const categorias: AvecCategoriaFaturamento[] = (data.aaData || []).map(row => ({
    categoria: row[0],
    quantidade: parseInt(row[1]) || 0,
    valor: parseAvecValor(row[2]),
    percentual: parseFloat(row[3]?.replace(",", ".")) || 0,
  }));

  return { categorias, totalGeral };
}

/**
 * Busca o faturamento diário do Avec usando o relatório 0100 (pagamentos por comanda).
 * Agrupa os pagamentos por dia para obter o total de cada dia.
 *
 * @param sessionCookie - Cookie de sessão obtido via avecLogin
 * @param salaoId - ID do salão no Avec (ex: "95687")
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2026)
 */
export async function avecBuscarFaturamentoDiario(
  sessionCookie: string,
  salaoId: string,
  mes: number,
  ano: number
): Promise<AvecFaturamentoDiario[]> {
  const inicio = formatarDataAvec(1, mes, ano);
  const fim = formatarDataAvec(ultimoDiaDoMes(mes, ano), mes, ano);

  const url = `https://admin.avec.beauty/admin/relatorios/listar?relatorio=0100&salao=${salaoId}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": sessionCookie,
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
      "Referer": "https://admin.avec.beauty/admin/relatorios",
    },
  });

  if (!resp.ok) {
    throw new Error(`Avec: erro ao buscar faturamento diário (status: ${resp.status})`);
  }

  const data = await resp.json() as {
    aaData: Array<[string, string, string, string, string, string]>;
    total: string;
  };

  // Relatório 0100: [descricao, formaPagamento, dataAbertura, dataFechamento, profissional, caixa]
  // A data está em formato "YYYY-MM-DD HH:MM:SS"
  // O valor não está diretamente disponível neste relatório, precisamos usar o relatório mensal
  // e distribuir proporcionalmente, ou usar o relatório 0184 por dia

  // Agrupar por dia usando a data de fechamento
  const porDia = new Map<string, number>();

  for (const row of (data.aaData || [])) {
    const dataFechamento = row[3]; // "YYYY-MM-DD HH:MM:SS"
    if (!dataFechamento) continue;

    const dia = dataFechamento.substring(0, 10); // "YYYY-MM-DD"
    if (!porDia.has(dia)) {
      porDia.set(dia, 0);
    }
    porDia.set(dia, (porDia.get(dia) || 0) + 1);
  }

  // Como o relatório 0100 não tem valor por comanda, vamos usar o relatório 0184 por dia
  // Buscar o faturamento de cada dia individualmente
  const diasComAtendimento = Array.from(porDia.keys()).sort();
  const resultado: AvecFaturamentoDiario[] = [];

  for (const dia of diasComAtendimento) {
    const [anoStr, mesStr, diaStr] = dia.split("-");
    const diaNum = parseInt(diaStr);
    const mesNum = parseInt(mesStr);
    const anoNum = parseInt(anoStr);

    const dataFormatada = formatarDataAvec(diaNum, mesNum, anoNum);
    const urlDia = `https://admin.avec.beauty/admin/relatorios/listar?relatorio=0184&salao=${salaoId}&inicio=${encodeURIComponent(dataFormatada)}&fim=${encodeURIComponent(dataFormatada)}`;

    try {
      const respDia = await fetch(urlDia, {
        method: "GET",
        headers: {
          "Cookie": sessionCookie,
          "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
        },
      });

      if (!respDia.ok) continue;

      const dataDia = await respDia.json() as {
        aaData: Array<[string, string, string, string]>;
        total: string;
      };

      const totalMatch = dataDia.total?.match(/([\d.,]+)/);
      const totalDia = totalMatch ? parseAvecValor(totalMatch[1]) : 0;

      if (totalDia > 0) {
        resultado.push({ data: dia, total: totalDia });
      }
    } catch {
      // Ignorar erros por dia individual
    }
  }

  return resultado;
}

/**
 * Busca o faturamento de um dia específico no Avec.
 * Mais eficiente que buscar o mês inteiro quando só precisamos de um dia.
 */
export async function avecBuscarFaturamentoDia(
  sessionCookie: string,
  salaoId: string,
  dia: number,
  mes: number,
  ano: number
): Promise<number> {
  const dataFormatada = formatarDataAvec(dia, mes, ano);
  const url = `https://admin.avec.beauty/admin/relatorios/listar?relatorio=0184&salao=${salaoId}&inicio=${encodeURIComponent(dataFormatada)}&fim=${encodeURIComponent(dataFormatada)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": sessionCookie,
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
    },
  });

  if (!resp.ok) {
    throw new Error(`Avec: erro ao buscar faturamento do dia ${dia}/${mes}/${ano} (status: ${resp.status})`);
  }

  const data = await resp.json() as {
    aaData: Array<[string, string, string, string]>;
    total: string;
  };

  const totalMatch = data.total?.match(/([\d.,]+)/);
  return totalMatch ? parseAvecValor(totalMatch[1]) : 0;
}

/**
 * Busca o faturamento por categoria de um dia específico no Avec.
 * Retorna um objeto com as categorias e seus valores para mapeamento.
 */
export async function avecBuscarFaturamentoDiaPorCategoria(
  sessionCookie: string,
  salaoId: string,
  dia: number,
  mes: number,
  ano: number
): Promise<AvecCategoriaFaturamento[]> {
  const dataFormatada = formatarDataAvec(dia, mes, ano);
  const url = `https://admin.avec.beauty/admin/relatorios/listar?relatorio=0184&salao=${salaoId}&inicio=${encodeURIComponent(dataFormatada)}&fim=${encodeURIComponent(dataFormatada)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": sessionCookie,
      "User-Agent": "Mozilla/5.0 (compatible; MetaDashboard/1.0)",
    },
  });

  if (!resp.ok) {
    throw new Error(`Avec: erro ao buscar faturamento por categoria do dia ${dia}/${mes}/${ano} (status: ${resp.status})`);
  }

  const data = await resp.json() as {
    aaData: Array<[string, string, string, string]>;
    total: string;
  };

  return (data.aaData || []).map(row => ({
    categoria: row[0],
    quantidade: parseInt(row[1]) || 0,
    valor: parseAvecValor(row[2]),
    percentual: parseFloat(row[3]?.replace(",", ".")) || 0,
  }));
}

/**
 * Formata uma data para o formato esperado pelo Avec: DD/MM/AAAA
 */
function formatarDataAvec(dia: number, mes: number, ano: number): string {
  const d = String(dia).padStart(2, "0");
  const m = String(mes).padStart(2, "0");
  return `${d}/${m}/${ano}`;
}

/**
 * Retorna o último dia do mês
 */
function ultimoDiaDoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Converte um valor monetário do formato brasileiro (ex: "95.154,25") para float
 */
export function parseAvecValor(valor: string): number {
  if (!valor) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  return parseFloat(limpo) || 0;
}
