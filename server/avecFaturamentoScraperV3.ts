/**
 * Scraper v3 para extrair faturamento do Avec
 * Aguarda elementos dinâmicos e trata conteúdo renderizado por JavaScript
 */

import puppeteer, { Browser, Page } from "puppeteer";

interface FaturamentoDia {
  data: string;
  totalFaturamento: number;
  quantidadeTransacoes: number;
  ticketMedio: number;
}

interface ResultadoAvec {
  unidade: string;
  data: string;
  faturamento: FaturamentoDia[];
  sucesso: boolean;
  mensagem?: string;
}

let browser: Browser | null = null;

async function inicializarBrowser(): Promise<Browser> {
  if (browser) return browser;

  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  return browser;
}

export async function fecharBrowserAvec(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function fazerLoginAvec(page: Page, email: string, senha: string): Promise<void> {
  console.log("[Avec] Acessando painel...");

  await page.goto("https://admin.avec.beauty/admin/relatorio/0184", {
    waitUntil: "networkidle0",
  });

  // Aguardar 3 segundos para JavaScript renderizar
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

  // Verificar se precisa fazer login
  const loginForm = await page.$("form");
  if (!loginForm) {
    console.log("[Avec] Já está autenticado");
    return;
  }

  console.log("[Avec] Fazendo login...");

  // Preencher email
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.type(email, { delay: 50 });
  }

  // Preencher senha
  const senhaInput = await page.$('input[type="password"]');
  if (senhaInput) {
    await senhaInput.type(senha, { delay: 50 });
  }

  // Clicar em login
  const submitButton = await page.$('button[type="submit"]');
  if (submitButton) {
    await submitButton.click();
  }

  // Aguardar redirecionamento
  try {
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 });
  } catch (e) {
    console.log("[Avec] Timeout na navegação, continuando...");
  }

  // Aguardar mais tempo para renderização
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 3000)));

  console.log("[Avec] Login concluído");
}

async function extrairFaturamentoAvecInterno(
  page: Page,
  dia: number,
  mes: number,
  ano: number
): Promise<FaturamentoDia | null> {
  try {
    const dataFormatada = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;

    console.log(`[Avec] Procurando faturamento de ${dataFormatada}...`);

    // Tentar múltiplos seletores possíveis
    const seletores = [
      "table tbody tr",
      "[role='row']",
      ".table-row",
      "[class*='row']",
      "tr[data-date]",
    ];

    let encontrou = false;

    for (const seletor of seletores) {
      const linhas = await page.$$(seletor);
      console.log(`[Avec] Seletor "${seletor}": ${linhas.length} linhas encontradas`);

      if (linhas.length > 0) {
        for (const linha of linhas) {
          const texto = await linha.evaluate((el) => el.textContent);

          if (texto?.includes(dataFormatada)) {
            console.log(`[Avec] Data encontrada! Extraindo valores...`);

            // Extrair valores da linha
            const valores = await linha.evaluate((el) => {
              const colunas = el.querySelectorAll("td, [role='cell']");
              return Array.from(colunas).map((col) => col.textContent?.trim());
            });

            console.log(`[Avec] Valores encontrados:`, valores);

            // Processar valores
            if (valores.length >= 2) {
              const faturamentoStr = valores[1]?.replace(/[^0-9,]/g, "").replace(",", ".") || "0";
              const transacoesStr = valores[2]?.replace(/[^0-9]/g, "") || "0";
              const ticketStr = valores[3]?.replace(/[^0-9,]/g, "").replace(",", ".") || "0";

              const faturamento = parseFloat(faturamentoStr);
              const transacoes = parseInt(transacoesStr);
              const ticket = parseFloat(ticketStr);

              if (faturamento > 0) {
                encontrou = true;
                return {
                  data: dataFormatada,
                  totalFaturamento: faturamento,
                  quantidadeTransacoes: transacoes,
                  ticketMedio: ticket,
                };
              }
            }
          }
        }
      }
    }

    if (!encontrou) {
      // Tentar extrair todo o conteúdo de texto para análise
      const todoTexto = await page.evaluate(() => document.body.innerText);
      console.log(`[Avec] Conteúdo da página (primeiros 500 chars):`);
      console.log(todoTexto.substring(0, 500));
    }

    return null;
  } catch (erro) {
    console.error(`[Avec] Erro ao extrair:`, erro);
    return null;
  }
}

export async function extrairFaturamentoAvecMelhorado(
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

    // Configurar viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Fazer login
    await fazerLoginAvec(page, email, senha);

    // Extrair faturamento
    const faturamento = await extrairFaturamentoAvecInterno(page, dia, mes, ano);

    if (!faturamento) {
      return {
        unidade: "SERAPHINE",
        data: `${dia}/${mes}/${ano}`,
        faturamento: [],
        sucesso: false,
        mensagem: "Não foi possível encontrar dados para a data especificada",
      };
    }

    return {
      unidade: "SERAPHINE",
      data: `${dia}/${mes}/${ano}`,
      faturamento: [faturamento],
      sucesso: true,
      mensagem: `Faturamento extraído: R$ ${faturamento.totalFaturamento.toFixed(2)}`,
    };
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    console.error("[Avec] Erro geral:", erroMsg);

    return {
      unidade: "SERAPHINE",
      data: `${dia}/${mes}/${ano}`,
      faturamento: [],
      sucesso: false,
      mensagem: `Erro: ${erroMsg}`,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}
