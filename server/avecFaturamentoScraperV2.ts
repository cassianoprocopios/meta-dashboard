/**
 * Scraper melhorado para extrair faturamento do Avec
 * Com debug e análise de estrutura HTML
 */

import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import path from "path";

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
  debugInfo?: Record<string, unknown>;
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
  console.log("[Avec] Acessando painel de login...");

  await page.goto("https://admin.avec.beauty/admin/relatorio/0184", {
    waitUntil: "networkidle2",
  });

  // Tirar screenshot para debug
  await page.screenshot({ path: "/tmp/avec-login.png" });
  console.log("[Avec] Screenshot salvo em /tmp/avec-login.png");

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
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

  console.log("[Avec] Login realizado");
}

async function analisarEstruturaPagina(page: Page): Promise<Record<string, unknown>> {
  console.log("[Avec] Analisando estrutura da página...");

  const estrutura = await page.evaluate(() => {
    const info: Record<string, unknown> = {};

    // Procurar por tabelas
    const tabelas = document.querySelectorAll("table");
    info.totalTabelas = tabelas.length;

    // Procurar por elementos com "faturamento"
    const elementos = document.querySelectorAll("[class*='faturamento'], [id*='faturamento']");
    info.elementosFaturamento = elementos.length;

    // Procurar por linhas de dados
    const linhas = document.querySelectorAll("tr");
    info.totalLinhas = linhas.length;

    // Extrair primeiras linhas para análise
    const primeirasLinhas: string[] = [];
    for (let i = 0; i < Math.min(5, linhas.length); i++) {
      const texto = linhas[i].textContent?.trim().substring(0, 100) || "";
      primeirasLinhas.push(texto);
    }
    info.primeirasLinhas = primeirasLinhas;

    // Procurar por inputs de data
    const inputsData = document.querySelectorAll('input[type="date"], input[placeholder*="data"], input[placeholder*="Data"]');
    info.inputsData = inputsData.length;

    // Procurar por selects
    const selects = document.querySelectorAll("select");
    info.selects = selects.length;

    return info;
  });

  console.log("[Avec] Estrutura encontrada:", JSON.stringify(estrutura, null, 2));

  // Tirar screenshot
  await page.screenshot({ path: "/tmp/avec-estrutura.png" });
  console.log("[Avec] Screenshot salvo em /tmp/avec-estrutura.png");

  return estrutura;
}

export async function extrairFaturamentoAvecDebug(
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

    // Analisar estrutura
    const debug = await analisarEstruturaPagina(page);

    // Tentar extrair dados
    const dados = await page.evaluate(() => {
      const resultado: Record<string, unknown> = {};

      // Procurar por texto com a data
      const dataStr = `28/05/2026`;
      const todoTexto = document.body.innerText;
      resultado.contemData = todoTexto.includes(dataStr);

      // Extrair conteúdo HTML da tabela
      const tabela = document.querySelector("table");
      if (tabela) {
        resultado.tabelaHTML = tabela.innerHTML.substring(0, 500);
      }

      // Procurar por valores monetários
      const valoresMonetarios = todoTexto.match(/R\$\s*[\d.,]+/g) || [];
      resultado.valoresMonetarios = valoresMonetarios.slice(0, 10);

      return resultado;
    });

    console.log("[Avec] Dados extraídos:", JSON.stringify(dados, null, 2));

    return {
      unidade: "SERAPHINE",
      data: `${dia}/${mes}/${ano}`,
      faturamento: [],
      sucesso: false,
      mensagem: "Análise de estrutura concluída. Verifique os screenshots.",
      debugInfo: { ...debug, ...dados },
    };
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    console.error("[Avec] Erro:", erroMsg);

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
