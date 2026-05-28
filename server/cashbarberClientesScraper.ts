import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Scraper para extrair dados de clientes por período do CashBarber
 * Acessa: Relatório > Gestão > Cliente por Período e Serviço
 */

const CASHBARBER_URL = "https://painel.cashbarber.com.br";
const CASHBARBER_EMAIL = "barbierobarbearia@gmail.com";
const CASHBARBER_SENHA = "2@Barbiero";

interface ClientesPeriodo {
  empresaSlug: string;
  mes: number;
  ano: number;
  totalClientesDistintos: number;
  clientesPorServico: Record<string, number>;
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
 * Faz login no CashBarber
 */
async function fazerLoginCashBarber(page: Page): Promise<void> {
  console.log("[CashBarber Clientes] Acessando painel de login...");

  await page.goto(`${CASHBARBER_URL}/auth/login`, { waitUntil: "networkidle2", timeout: 30000 });

  // Aguardar campo de email
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Preencher email
  const emailInputs = await page.$$('input[type="email"], input[name="email"]');
  if (emailInputs.length > 0) {
    await emailInputs[0].type(CASHBARBER_EMAIL);
  }

  // Preencher senha
  const senhaInputs = await page.$$('input[type="password"], input[name="password"]');
  if (senhaInputs.length > 0) {
    await senhaInputs[0].type(CASHBARBER_SENHA);
  }

  // Clicar em login
  const botoes = await page.$$('button[type="submit"], button');
  if (botoes.length > 0) {
    await botoes[0].click();
  }

  // Aguardar redirecionamento
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});

  console.log("[CashBarber Clientes] Login realizado com sucesso");
}

/**
 * Extrai dados de clientes por período
 */
async function extrairClientesPeriodo(
  page: Page,
  mes: number,
  ano: number
): Promise<ClientesPeriodo | null> {
  console.log(`[CashBarber Clientes] Extraindo clientes para ${mes}/${ano}`);

  try {
    // Navegar para relatório
    await page.goto(`${CASHBARBER_URL}/relatorios`, { waitUntil: "networkidle2", timeout: 30000 });

    // Procurar por links/botões de relatório de clientes
    await page.waitForSelector("a, button", { timeout: 5000 }).catch(() => {});

    // Tentar clicar em link de "Cliente por Período"
    const links = await page.$$("a");
    let encontrou = false;

    for (const link of links) {
      const texto = await page.evaluate((el) => el.textContent, link);
      if (
        texto?.toLowerCase().includes("cliente") &&
        texto?.toLowerCase().includes("período")
      ) {
        await link.click();
        encontrou = true;
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
        break;
      }
    }

    if (!encontrou) {
      console.log("[CashBarber Clientes] Link de cliente por período não encontrado, tentando URL direta");
      await page.goto(`${CASHBARBER_URL}/relatorios/clientes-periodo`, {
        waitUntil: "networkidle2",
        timeout: 30000,
      }).catch(() => {});
    }

    // Extrair dados da página
    const dados = await page.evaluate(() => {
      const resultado: any = {
        totalClientesDistintos: 0,
        clientesPorServico: {},
      };

      // Procurar por números na página
      const textoCompleto = document.body.innerText;

      // Tentar extrair total de clientes
      const regexTotal = /(\d+)\s*(?:clientes?|cliente)/i;
      const matchTotal = textoCompleto.match(regexTotal);
      if (matchTotal) {
        resultado.totalClientesDistintos = parseInt(matchTotal[1]);
      }

      // Procurar por tabelas
      const tabelas = document.querySelectorAll("table");
      if (tabelas.length > 0) {
        const linhas = tabelas[0].querySelectorAll("tbody tr");
        linhas.forEach((linha) => {
          const colunas = linha.querySelectorAll("td");
          if (colunas.length >= 2) {
            const servico = colunas[0]?.textContent?.trim() || "Sem serviço";
            const quantidade = parseInt(colunas[1]?.textContent?.trim() || "0");

            if (quantidade > 0 && servico !== "Sem serviço") {
              resultado.clientesPorServico[servico] = quantidade;
            }
          }
        });
      }

      return resultado;
    });

    return {
      empresaSlug: "consolidado",
      mes,
      ano,
      totalClientesDistintos: dados.totalClientesDistintos,
      clientesPorServico: dados.clientesPorServico,
    };
  } catch (erro) {
    console.error("[CashBarber Clientes] Erro ao extrair dados:", erro);
    return null;
  }
}

/**
 * Extrai clientes de uma unidade específica
 */
export async function extrairClientesPorPeriodoUnidade(
  empresaSlug: string,
  mes: number,
  ano: number
): Promise<ClientesPeriodo | null> {
  let page: Page | null = null;

  try {
    const browser = await inicializarBrowser();
    page = await browser.newPage();

    // Fazer login
    await fazerLoginCashBarber(page);

    // Extrair dados
    const resultado = await extrairClientesPeriodo(page, mes, ano);

    if (resultado) {
      resultado.empresaSlug = empresaSlug;
    }

    return resultado;
  } catch (erro) {
    console.error(`[CashBarber Clientes] Erro ao extrair clientes de ${empresaSlug}:`, erro);
    return null;
  } finally {
    if (page) await page.close();
  }
}

/**
 * Extrai clientes de todas as unidades para um período
 */
export async function extrairClientesTodosUnidades(
  mes: number,
  ano: number
): Promise<Record<string, ClientesPeriodo>> {
  const unidades = ["MASCOTE", "MORUMBI", "SERAPHINE"];
  const resultado: Record<string, ClientesPeriodo> = {};

  for (const unidade of unidades) {
    console.log(`[CashBarber Clientes] Extraindo clientes de ${unidade}...`);

    const dados = await extrairClientesPorPeriodoUnidade(unidade, mes, ano);

    if (dados) {
      resultado[unidade] = dados;
      console.log(
        `[CashBarber Clientes] ${unidade}: ${dados.totalClientesDistintos} clientes distintos`
      );
    }
  }

  return resultado;
}

/**
 * Fecha o browser
 */
export async function fecharBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
