/**
 * Scraper para extrair faturamento do Avec
 * Acessa o painel de relatórios e extrai dados de faturamento por dia
 */

import puppeteer, { Browser, Page } from "puppeteer";

interface FaturamentoDia {
  data: string;
  totalFaturamento: number;
  quantidadeTransacoes: number;
  ticketMedio: number;
  detalhes?: Record<string, unknown>;
}

interface ResultadoAvec {
  unidade: string;
  data: string;
  faturamento: FaturamentoDia[];
  sucesso: boolean;
  mensagem?: string;
}

let browser: Browser | null = null;

/**
 * Inicializa o browser Puppeteer
 */
async function inicializarBrowser(): Promise<Browser> {
  if (browser) return browser;

  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  return browser;
}

/**
 * Fecha o browser
 */
export async function fecharBrowserAvec(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Faz login no Avec
 */
async function fazerLoginAvec(page: Page, email: string, senha: string): Promise<void> {
  console.log("[Avec] Acessando painel de login...");

  await page.goto("https://admin.avec.beauty/admin/relatorio/0184", {
    waitUntil: "networkidle2",
  });

  // Verificar se precisa fazer login
  const loginButton = await page.$('button[type="submit"]');
  if (!loginButton) {
    console.log("[Avec] Já está autenticado");
    return;
  }

  // Preencher email
  await page.type('input[type="email"]', email, { delay: 50 });

  // Preencher senha
  await page.type('input[type="password"]', senha, { delay: 50 });

  // Clicar em login
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

  console.log("[Avec] Login realizado com sucesso");
}

/**
 * Extrai faturamento do dia específico
 */
async function extrairFaturamentoDia(
  page: Page,
  dia: number,
  mes: number,
  ano: number
): Promise<FaturamentoDia | null> {
  try {
    // Formatar data
    const dataFormatada = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;

    console.log(`[Avec] Extraindo faturamento de ${dataFormatada}...`);

    // Procurar pela data na tabela
    const linhas = await page.$$("table tbody tr");

    for (const linha of linhas) {
      const colunas = await linha.$$("td");
      if (colunas.length === 0) continue;

      // Extrair data da primeira coluna
      const dataCell = await colunas[0].evaluate((el) => el.textContent);

      if (dataCell?.includes(dataFormatada)) {
        // Extrair valores
        const faturamentoText = await colunas[1]?.evaluate((el) => el.textContent);
        const transacoesText = await colunas[2]?.evaluate((el) => el.textContent);
        const ticketText = await colunas[3]?.evaluate((el) => el.textContent);

        // Limpar e converter valores
        const faturamento = parseFloat(
          faturamentoText?.replace(/[^0-9,]/g, "").replace(",", ".") || "0"
        );
        const transacoes = parseInt(transacoesText?.replace(/[^0-9]/g, "") || "0");
        const ticket = parseFloat(ticketText?.replace(/[^0-9,]/g, "").replace(",", ".") || "0");

        return {
          data: dataFormatada,
          totalFaturamento: faturamento,
          quantidadeTransacoes: transacoes,
          ticketMedio: ticket,
        };
      }
    }

    console.log(`[Avec] Data ${dataFormatada} não encontrada na tabela`);
    return null;
  } catch (erro) {
    console.error(`[Avec] Erro ao extrair faturamento:`, erro);
    return null;
  }
}

/**
 * Extrai faturamento do Avec para uma unidade e data específica
 */
export async function extrairFaturamentoAvec(
  email: string,
  senha: string,
  dia: number,
  mes: number,
  ano: number
): Promise<ResultadoAvec> {
  let page: Page | null = null;

  try {
    const br = await inicializarBrowser();
    page = await br.newPage();

    // Fazer login
    await fazerLoginAvec(page, email, senha);

    // Extrair faturamento
    const faturamento = await extrairFaturamentoDia(page, dia, mes, ano);

    if (!faturamento) {
      return {
        unidade: "SERAPHINE",
        data: `${dia}/${mes}/${ano}`,
        faturamento: [],
        sucesso: false,
        mensagem: "Não foi possível extrair faturamento para a data especificada",
      };
    }

    return {
      unidade: "SERAPHINE",
      data: `${dia}/${mes}/${ano}`,
      faturamento: [faturamento],
      sucesso: true,
      mensagem: `Faturamento extraído com sucesso: R$ ${faturamento.totalFaturamento.toFixed(2)}`,
    };
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    console.error("[Avec] Erro geral:", erroMsg);

    return {
      unidade: "SERAPHINE",
      data: `${dia}/${mes}/${ano}`,
      faturamento: [],
      sucesso: false,
      mensagem: `Erro ao extrair faturamento: ${erroMsg}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Extrai faturamento de um período
 */
export async function extrairFaturamentoAvecPeriodo(
  email: string,
  senha: string,
  dataInicio: Date,
  dataFim: Date
): Promise<ResultadoAvec> {
  let page: Page | null = null;

  try {
    const br = await inicializarBrowser();
    page = await br.newPage();

    // Fazer login
    await fazerLoginAvec(page, email, senha);

    const faturamentos: FaturamentoDia[] = [];

    // Iterar por cada dia do período
    const dataAtual = new Date(dataInicio);
    while (dataAtual <= dataFim) {
      const dia = dataAtual.getDate();
      const mes = dataAtual.getMonth() + 1;
      const ano = dataAtual.getFullYear();

      const faturamento = await extrairFaturamentoDia(page, dia, mes, ano);
      if (faturamento) {
        faturamentos.push(faturamento);
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    if (faturamentos.length === 0) {
      return {
        unidade: "SERAPHINE",
        data: `${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`,
        faturamento: [],
        sucesso: false,
        mensagem: "Nenhum faturamento encontrado para o período",
      };
    }

    const totalFaturamento = faturamentos.reduce((acc, f) => acc + f.totalFaturamento, 0);

    return {
      unidade: "SERAPHINE",
      data: `${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`,
      faturamento: faturamentos,
      sucesso: true,
      mensagem: `${faturamentos.length} dia(s) extraído(s) com sucesso. Total: R$ ${totalFaturamento.toFixed(2)}`,
    };
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    console.error("[Avec] Erro geral:", erroMsg);

    return {
      unidade: "SERAPHINE",
      data: `${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`,
      faturamento: [],
      sucesso: false,
      mensagem: `Erro ao extrair faturamento: ${erroMsg}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
