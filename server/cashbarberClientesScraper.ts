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

  await page.goto(`${CASHBARBER_URL}/auth/login`, { waitUntil: "networkidle2" });

  // Preencher email
  await page.type('input[type="email"]', CASHBARBER_EMAIL);

  // Preencher senha
  await page.type('input[type="password"]', CASHBARBER_SENHA);

  // Clicar em login
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  console.log("[CashBarber Clientes] Login realizado com sucesso");
}

/**
 * Navega até a seção de relatório de clientes por período
 */
async function navegarParaRelatorioClientes(page: Page): Promise<void> {
  console.log("[CashBarber Clientes] Navegando para relatório de clientes...");

  // Tentar acessar diretamente a URL de relatório
  try {
    await page.goto(`${CASHBARBER_URL}/relatorios/clientes-periodo`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
  } catch (erro) {
    console.log("[CashBarber Clientes] URL direta não funcionou, tentando navegação pelo menu");

    // Fallback: navegar pelo menu
    await page.goto(`${CASHBARBER_URL}/relatorios`, { waitUntil: "networkidle2" });

    // Procurar pelo link de "Cliente por Período e Serviço"
    await page.waitForSelector("a, button", { timeout: 5000 });
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button"));
      const clienteLink = links.find(
        (l) =>
          l.textContent?.toLowerCase().includes("cliente") &&
          l.textContent?.toLowerCase().includes("período")
      );
      if (clienteLink) {
        (clienteLink as HTMLElement).click();
      }
    });

    await page.waitForNavigation({ waitUntil: "networkidle2" });
  }
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
    // Selecionar mês e ano nos filtros
    const mesStr = String(mes).padStart(2, "0");
    const anoStr = String(ano);

    // Procurar pelos campos de filtro
    const filtros = await page.evaluate(() => {
      const inputs = document.querySelectorAll("input, select");
      const result: any = {};

      inputs.forEach((input: any) => {
        const label = (input as any).placeholder || (input as any).name || "";
        if (label.toLowerCase().includes("mês") || label.toLowerCase().includes("month")) {
          result.mesInput = input;
        }
        if (label.toLowerCase().includes("ano") || label.toLowerCase().includes("year")) {
          result.anoInput = input;
        }
      });

      return result;
    });

    // Preencher filtros se encontrados
    const mesInputs = await page.$$('input[placeholder*="ês"], input[name*="mes"], select');
    if (mesInputs.length > 0) {
      await mesInputs[0].type(mesStr);
    }

    const anoInputs = await page.$$('input[placeholder*="no"], input[name*="ano"], select');
    if (anoInputs.length > 0) {
      await anoInputs[0].type(anoStr);
    }

    // Clicar em buscar/filtrar
    const botaoBuscar = await page.$('button:contains("Buscar"), button:contains("Filtrar")');
    if (botaoBuscar) {
      await botaoBuscar.click();
      await page.waitForNavigation({ waitUntil: "networkidle2" });
    }

    // Extrair dados da tabela
    const dados = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tbody tr");
      const clientes: any = {
        totalClientesDistintos: 0,
        clientesPorServico: {},
      };

      // Procurar pelo total de clientes distintos
      const totalText = document.body.innerText;
      const totalMatch = totalText.match(/(\d+)\s*(?:clientes|cliente)/i);
      if (totalMatch) {
        clientes.totalClientesDistintos = parseInt(totalMatch[1]);
      }

      // Extrair dados por serviço
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 2) {
          const servico = cells[0]?.textContent?.trim() || "Sem serviço";
          const quantidade = parseInt(cells[1]?.textContent?.trim() || "0");

          if (quantidade > 0) {
            clientes.clientesPorServico[servico] = quantidade;
          }
        }
      });

      return clientes;
    });

    return {
      empresaSlug: "consolidado", // Será atualizado conforme necessário
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
 * Extrai clientes por período para uma unidade específica
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

    // Navegar para relatório
    await navegarParaRelatorioClientes(page);

    // Selecionar unidade (se necessário)
    const unidadeSelects = await page.$$("select");
    for (const select of unidadeSelects) {
      const options = await select.$$eval("option", (opts: any[]) =>
        opts.map((o) => ({ value: o.value, text: o.textContent }))
      );

      const empresaOption = options.find(
        (opt) =>
          opt.text?.toLowerCase().includes(empresaSlug.toLowerCase()) ||
          opt.value?.toLowerCase().includes(empresaSlug.toLowerCase())
      );

      if (empresaOption) {
        await select.select(empresaOption.value);
        await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
        break;
      }
    }

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
