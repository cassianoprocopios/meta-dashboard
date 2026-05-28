import puppeteer, { Browser, Page } from "puppeteer";

/**
 * Integração com CashBarber para extrair dados de atendimentos
 * Usa Puppeteer para fazer scraping do painel CashBarber
 */

const CASHBARBER_URL = "https://painel.cashbarber.com.br";
const CASHBARBER_EMAIL = "barbierobarbearia@gmail.com";
const CASHBARBER_SENHA = "2@Barbiero";

interface AtendimentoCashBarber {
  id: string;
  dataAtendimento: string; // YYYY-MM-DD
  empresaSlug: string; // MASCOTE ou MORUMBI
  profissionalId: string;
  profissionalNome: string;
  clienteId: string;
  clienteNome: string;
  servico: string;
  valor: number;
  duracao: number; // em minutos
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
  console.log("[CashBarber Integration] Acessando painel de login...");

  await page.goto(`${CASHBARBER_URL}/auth/login`, { waitUntil: "networkidle2" });

  // Preencher email
  await page.type('input[type="email"]', CASHBARBER_EMAIL);

  // Preencher senha
  await page.type('input[type="password"]', CASHBARBER_SENHA);

  // Clicar em login
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento
  await page.waitForNavigation({ waitUntil: "networkidle2" });

  console.log("[CashBarber Integration] Login realizado com sucesso");
}

/**
 * Extrai atendimentos do CashBarber para um período específico
 */
async function extrairAtendimentosPeriodo(
  page: Page,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<AtendimentoCashBarber[]> {
  console.log(
    `[CashBarber Integration] Extraindo atendimentos de ${empresaSlug} entre ${dataInicio} e ${dataFim}`
  );

  const atendimentos: AtendimentoCashBarber[] = [];

  try {
    // Navegar para a página de relatórios
    await page.goto(`${CASHBARBER_URL}/relatorios`, { waitUntil: "networkidle2" });

    // Selecionar unidade (se aplicável)
    // Isso depende da estrutura do CashBarber

    // Filtrar por data
    await page.type('input[name="dataInicio"]', dataInicio);
    await page.type('input[name="dataFim"]', dataFim);

    // Executar filtro
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Extrair dados da tabela
    const dados = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tbody tr");
      const atendimentos: any[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length > 0) {
          atendimentos.push({
            id: cells[0]?.textContent?.trim() || "",
            data: cells[1]?.textContent?.trim() || "",
            profissional: cells[2]?.textContent?.trim() || "",
            cliente: cells[3]?.textContent?.trim() || "",
            servico: cells[4]?.textContent?.trim() || "",
            valor: parseFloat(cells[5]?.textContent?.replace("R$", "").trim() || "0"),
            duracao: parseInt(cells[6]?.textContent?.trim() || "0"),
          });
        }
      });

      return atendimentos;
    });

    // Mapear dados para o formato esperado
    dados.forEach((d) => {
      atendimentos.push({
        id: d.id,
        dataAtendimento: d.data,
        empresaSlug: empresaSlug,
        profissionalId: `prof_${d.profissional.toLowerCase().replace(/\s+/g, "_")}`,
        profissionalNome: d.profissional,
        clienteId: `cli_${d.cliente.toLowerCase().replace(/\s+/g, "_")}`,
        clienteNome: d.cliente,
        servico: d.servico,
        valor: d.valor,
        duracao: d.duracao,
      });
    });

    console.log(
      `[CashBarber Integration] ${atendimentos.length} atendimentos extraídos com sucesso`
    );
  } catch (erro) {
    console.error("[CashBarber Integration] Erro ao extrair atendimentos:", erro);
  }

  return atendimentos;
}

/**
 * Busca atendimentos do CashBarber para um período
 */
export async function buscarAtendimentosCashBarberReal(
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<AtendimentoCashBarber[]> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await inicializarBrowser();
    page = await browser.newPage();

    // Fazer login
    await fazerLoginCashBarber(page);

    // Extrair atendimentos
    const atendimentos = await extrairAtendimentosPeriodo(
      page,
      empresaSlug,
      dataInicio,
      dataFim
    );

    return atendimentos;
  } catch (erro) {
    console.error("[CashBarber Integration] Erro geral:", erro);
    return [];
  } finally {
    if (page) await page.close();
  }
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

/**
 * Sincroniza atendimentos para ambas as unidades
 */
export async function sincronizarAtendimentosCashBarber(
  dataInicio: string,
  dataFim: string
): Promise<{ mascote: AtendimentoCashBarber[]; morumbi: AtendimentoCashBarber[] }> {
  console.log(
    `[CashBarber Integration] Iniciando sincronização entre ${dataInicio} e ${dataFim}`
  );

  const mascote = await buscarAtendimentosCashBarberReal("MASCOTE", dataInicio, dataFim);
  const morumbi = await buscarAtendimentosCashBarberReal("MORUMBI", dataInicio, dataFim);

  console.log(
    `[CashBarber Integration] Sincronização concluída: ${mascote.length} (Mascote) + ${morumbi.length} (Morumbi)`
  );

  return { mascote, morumbi };
}
