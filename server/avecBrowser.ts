/**
 * avecBrowser.ts
 *
 * Automação browser headless (Puppeteer) para autenticação no Avec.
 *
 * Fluxo de sincronização de faturamento por categoria:
 *   1. Login no admin.avec.beauty via browser headless
 *   2. Buscar lista de comandas finalizadas do dia via /admin/financeiro/comanda/lista
 *   3. Para cada comanda, buscar o print via /admin/financeiro/comanda/print?id=TOKEN
 *   4. Extrair os itens (serviço + valor) e mapear para categorias
 *   5. Somar os valores por categoria
 */

import puppeteer from "puppeteer-core";

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
 * Faz login no Avec via browser headless e retorna os cookies de sessão.
 * Reutiliza sessão em cache por até 50 minutos.
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

  const salaoSlug = "seraphine-beauty-ltda";
  const loginUrl = `${ADMIN_URL}/${salaoSlug}/admin/?email=${encodeURIComponent(email)}`;

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

    console.log(`[Avec Browser] Acessando ${loginUrl}...`);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    const senhaInput = await page.$('input[type="password"]');
    if (!senhaInput) throw new Error("[Avec Browser] Campo de senha não encontrado.");

    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

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
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
        page.keyboard.press("Enter"),
      ]);
    }
    await new Promise(r => setTimeout(r, 2000));

    const urlAposLogin = page.url();
    console.log(`[Avec Browser] URL após login: ${urlAposLogin}`);

    if (urlAposLogin.includes("/login/")) {
      const erros = await page.evaluate(() => {
        const els = document.querySelectorAll(".error, .alert-danger, [class*='error'], [class*='danger'], .toast");
        return Array.from(els).map(e => e.textContent?.trim()).filter(Boolean);
      });
      throw new Error(`[Avec Browser] Login falhou. Erros: ${erros.join(", ") || "Credenciais inválidas"}`);
    }

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

// ─── Mapeamento de serviços para categorias ───────────────────────────────────

/**
 * Mapeamento de nomes de serviços para categorias.
 * Baseado nos serviços reais da Seraphine Beauty.
 */
const MAPA_SERVICO_CATEGORIA: Array<{ palavras: string[]; categoria: "cabelo" | "manicurePedicure" | "sobrancelha" | "pacote" | "recorrencia" }> = [
  // Cabelo
  {
    palavras: ["escova", "corte", "tintura", "coloração", "tonalização", "botox", "progressiva", "relaxamento", "hidratação", "chapinha", "prancha", "mechas", "luzes", "ombré", "balayage", "capilar", "penteado", "finalização", "finaliz", "tratamento capilar", "keratina", "alisamento", "permanente", "descoloração", "descolorac"],
    categoria: "cabelo",
  },
  // Manicure e Pedicure
  {
    palavras: ["manicure", "pedicure", "unhas", "nail", "esmalt", "gel", "fibra", "acrigel", "acrílico", "acrilico", "mãos", "maos", "pés", "pes", "francesinha", "spa dos pés", "spa dos pes"],
    categoria: "manicurePedicure",
  },
  // Sobrancelha
  {
    palavras: ["sobrancelha", "design", "henna", "micropigmentação", "micropigmentacao", "brow", "cílios", "cilios", "lash", "depilação", "depilacao", "buço", "buco", "bigode"],
    categoria: "sobrancelha",
  },
  // Pacote
  {
    palavras: ["pacote", "combo", "clube", "kit", "plano", "assinatura"],
    categoria: "pacote",
  },
  // Recorrência
  {
    palavras: ["recorrência", "recorrencia", "mensalidade", "fidelidade", "dpote", "d-pote"],
    categoria: "recorrencia",
  },
];

/**
 * Mapeia o nome de um serviço para uma categoria.
 */
function mapearServicoParaCategoria(nomeServico: string): "cabelo" | "manicurePedicure" | "sobrancelha" | "pacote" | "recorrencia" | "outros" {
  const nomeLower = nomeServico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const mapa of MAPA_SERVICO_CATEGORIA) {
    for (const palavra of mapa.palavras) {
      const palavraNorm = palavra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nomeLower.includes(palavraNorm)) {
        return mapa.categoria;
      }
    }
  }

  return "outros";
}

// ─── Extração de faturamento via lista de comandas ────────────────────────────

/**
 * Extrai os tokens de print das comandas a partir da resposta da lista de comandas.
 * A lista retorna HTML com links no formato:
 * <a href="https://admin.avec.beauty/admin/financeiro/comanda/print?id=TOKEN">
 */
function extrairTokensPrintDaLista(htmlLista: string): string[] {
  const tokens: string[] = [];
  // Regex para capturar tokens de print no JSON escapado
  const regex = /comanda\\\/print\?id=([^"\\]+)/g;
  let match;
  while ((match = regex.exec(htmlLista)) !== null) {
    tokens.push(match[1]);
  }
  // Regex alternativa para HTML não escapado
  const regex2 = /comanda\/print\?id=([^"&\s]+)/g;
  while ((match = regex2.exec(htmlLista)) !== null) {
    if (!tokens.includes(match[1])) {
      tokens.push(match[1]);
    }
  }
  return tokens;
}

/**
 * Extrai os itens de uma comanda a partir do HTML do print.
 * O print retorna uma tabela com: Qtd | Item | Profissional | Valor
 */
function extrairItensDoPrint(htmlPrint: string): Array<{ servico: string; valor: number }> {
  const itens: Array<{ servico: string; valor: number }> = [];

  // Extrair linhas de tabela com itens
  // Padrão: <tr><td>1</td><td>Manicure</td><td>Bia</td><td>43,00</td></tr>
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(htmlPrint)) !== null) {
    const trContent = trMatch[1];

    // Extrair células
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      const texto = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      tds.push(texto);
    }

    // Verificar se é uma linha de item (4 células: Qtd, Item, Profissional, Valor)
    if (tds.length >= 4) {
      const qtd = parseInt(tds[0], 10);
      const servico = tds[1].trim();
      const valorStr = tds[tds.length - 1].replace(/[^\d,]/g, "").replace(",", ".");
      const valor = parseFloat(valorStr) || 0;

      // Filtrar linhas de cabeçalho e total
      if (!isNaN(qtd) && qtd > 0 && servico && !servico.toLowerCase().includes("item") && !servico.toLowerCase().includes("total")) {
        itens.push({ servico, valor });
      }
    }
  }

  return itens;
}

// ─── Busca de faturamento via lista de comandas ───────────────────────────────

/**
 * Busca o faturamento por categoria para um dia específico via admin.avec.beauty.
 *
 * Estratégia:
 * 1. Buscar lista de comandas finalizadas do dia via /admin/financeiro/comanda/lista
 * 2. Para cada comanda, buscar o print via /admin/financeiro/comanda/print?id=TOKEN
 * 3. Extrair os itens (serviço + valor) e mapear para categorias
 * 4. Somar os valores por categoria
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
  outros: number;
  total: number;
}> {
  const resultado = {
    cabelo: 0,
    manicurePedicure: 0,
    sobrancelha: 0,
    pacote: 0,
    recorrencia: 0,
    outros: 0,
    total: 0,
  };

  const { cookies } = await avecBrowserLogin(email, senha);

  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;

  console.log(`[Avec Browser] Buscando faturamento de ${dataFormatada}...`);

  // ── 1. Buscar lista de comandas finalizadas do dia ────────────────────────────
  const listaUrl = `${ADMIN_URL}/admin/financeiro/comanda/lista?status=2&parTipoComanda=1&parDataIni=${dataFormatada}&parDataFim=${dataFormatada}&draw=1&start=0&length=500`;

  let listaHtml: string;
  try {
    const listaRes = await fetch(listaUrl, {
      headers: {
        Cookie: cookies,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
    });

    if (!listaRes.ok) {
      console.warn(`[Avec Browser] Lista de comandas retornou ${listaRes.status} para ${dataFormatada}`);
      return resultado;
    }

    listaHtml = await listaRes.text();
  } catch (e) {
    console.error(`[Avec Browser] Erro ao buscar lista de comandas para ${dataFormatada}:`, e);
    return resultado;
  }

  // ── 2. Extrair tokens de print das comandas ───────────────────────────────────
  const printTokens = extrairTokensPrintDaLista(listaHtml);

  if (printTokens.length === 0) {
    console.log(`[Avec Browser] Nenhuma comanda encontrada para ${dataFormatada}`);
    return resultado;
  }

  console.log(`[Avec Browser] ${printTokens.length} comandas encontradas para ${dataFormatada}`);

  // ── 3. Para cada comanda, buscar o print e extrair itens ──────────────────────
  let totalComandas = 0;
  let errosConsecutivos = 0;

  for (const token of printTokens) {
    try {
      const printUrl = `${ADMIN_URL}/admin/financeiro/comanda/print?id=${encodeURIComponent(token)}`;

      const printRes = await fetch(printUrl, {
        headers: {
          Cookie: cookies,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        },
      });

      if (!printRes.ok) {
        console.warn(`[Avec Browser] Print retornou ${printRes.status} para token ${token.substring(0, 20)}...`);
        errosConsecutivos++;
        if (errosConsecutivos >= 5) {
          console.error("[Avec Browser] Muitos erros consecutivos, abortando.");
          break;
        }
        continue;
      }

      errosConsecutivos = 0;
      const printHtml = await printRes.text();

      // Extrair itens do print
      const itens = extrairItensDoPrint(printHtml);

      for (const item of itens) {
        const categoria = mapearServicoParaCategoria(item.servico);
        resultado[categoria] += item.valor;
        totalComandas++;
      }

      // Pequena pausa para não sobrecarregar o servidor
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.warn(`[Avec Browser] Erro ao processar comanda:`, e);
      errosConsecutivos++;
    }
  }

  resultado.total = resultado.cabelo + resultado.manicurePedicure + resultado.sobrancelha + resultado.pacote + resultado.recorrencia + resultado.outros;

  console.log(
    `[Avec Browser] Faturamento de ${dataFormatada}: ` +
    `Cabelo R$${resultado.cabelo.toFixed(2)}, ` +
    `Manicure R$${resultado.manicurePedicure.toFixed(2)}, ` +
    `Sobrancelha R$${resultado.sobrancelha.toFixed(2)}, ` +
    `Pacote R$${resultado.pacote.toFixed(2)}, ` +
    `Recorrência R$${resultado.recorrencia.toFixed(2)}, ` +
    `Outros R$${resultado.outros.toFixed(2)}, ` +
    `Total R$${resultado.total.toFixed(2)} ` +
    `(${totalComandas} itens em ${printTokens.length} comandas)`
  );

  return resultado;
}

// ─── Busca de faturamento via Relatório 0184 ─────────────────────────────────

/**
 * Resultado do Relatório 0184 - Faturamento por tipos de venda.
 * Mapeado para as categorias da Seraphine:
 *   cat1 = Serviços, cat2 = Pacotes, cat3 = Produtos, cat4 = Caixinha
 */
export interface Relatorio0184Resultado {
  servicos: number;   // cat1
  pacotes: number;    // cat2
  produtos: number;   // cat3
  caixinha: number;   // cat4
  total: number;
}

/**
 * Busca o faturamento do Relatório 0184 (Faturamento por tipos de venda)
 * para um dia específico via browser headless.
 *
 * Estratégia:
 * 1. Fazer login no Avec via browser headless
 * 2. Navegar para /admin/relatorio/0184 com as datas filtradas
 * 3. Extrair os valores da tabela (Serviços, Pacotes, Produtos, Caixinha)
 */
export async function avecBrowserBuscarRelatorio0184(
  email: string,
  senha: string,
  data: string // YYYY-MM-DD
): Promise<Relatorio0184Resultado> {
  const resultado: Relatorio0184Resultado = {
    servicos: 0,
    pacotes: 0,
    produtos: 0,
    caixinha: 0,
    total: 0,
  };

  const [ano, mes, dia] = data.split("-");
  const dataFormatada = `${dia}/${mes}/${ano}`;

  console.log(`[Avec Rel0184] Buscando relatório 0184 para ${dataFormatada}...`);

  const salaoSlug = "seraphine-beauty-ltda";
  const loginUrl = `${ADMIN_URL}/${salaoSlug}/admin/?email=${encodeURIComponent(email)}`;

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

    // ── 1. Login ────────────────────────────────────────────────────────────────
    console.log(`[Avec Rel0184] Fazendo login...`);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    const senhaInput = await page.$('input[type="password"]');
    if (!senhaInput) throw new Error("[Avec Rel0184] Campo de senha não encontrado.");

    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha, { delay: 50 });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll<HTMLElement>('button, input[type="submit"]'));
      const botao = botoes.find(b => b.textContent?.includes('Entrar') || (b as HTMLInputElement).value?.includes('Entrar') || (b as HTMLButtonElement).type === 'submit');
      if (botao) botao.click();
    });

    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const urlAposLogin = page.url();
    if (urlAposLogin.includes("/login/")) {
      throw new Error("[Avec Rel0184] Login falhou — credenciais inválidas.");
    }
    console.log(`[Avec Rel0184] Login OK. URL: ${urlAposLogin}`);

    // ── 2. Navegar para o Relatório 0184 ────────────────────────────────────────
    const relUrl = `${ADMIN_URL}/admin/relatorio/0184`;
    console.log(`[Avec Rel0184] Navegando para ${relUrl}...`);
    await page.goto(relUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // ── 3. Preencher datas e buscar ─────────────────────────────────────────────
    // Preencher data de início
    await page.evaluate((dataFmt: string) => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="date"]'));
      // Procurar campo de data início (geralmente o primeiro campo de data)
      const campoDataIni = inputs.find(i =>
        i.name?.toLowerCase().includes('inicio') ||
        i.id?.toLowerCase().includes('inicio') ||
        i.placeholder?.toLowerCase().includes('início') ||
        i.placeholder?.toLowerCase().includes('data ini')
      ) || inputs[0];
      if (campoDataIni) {
        campoDataIni.value = dataFmt;
        campoDataIni.dispatchEvent(new Event('input', { bubbles: true }));
        campoDataIni.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Preencher data fim com a mesma data
      const campoDataFim = inputs.find(i =>
        i.name?.toLowerCase().includes('fim') ||
        i.id?.toLowerCase().includes('fim') ||
        i.placeholder?.toLowerCase().includes('fim') ||
        i.placeholder?.toLowerCase().includes('data fim')
      ) || inputs[1];
      if (campoDataFim && campoDataFim !== campoDataIni) {
        campoDataFim.value = dataFmt;
        campoDataFim.dispatchEvent(new Event('input', { bubbles: true }));
        campoDataFim.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, dataFormatada);

    await new Promise(r => setTimeout(r, 500));

    // Clicar em Buscar
    await page.evaluate(() => {
      const botoes = Array.from(document.querySelectorAll<HTMLElement>('button, input[type="submit"]'));
      const botao = botoes.find(b =>
        b.textContent?.toLowerCase().includes('buscar') ||
        b.textContent?.toLowerCase().includes('pesquisar') ||
        b.textContent?.toLowerCase().includes('filtrar') ||
        (b as HTMLInputElement).value?.toLowerCase().includes('buscar')
      );
      if (botao) botao.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // ── 4. Extrair valores da tabela ────────────────────────────────────────────
    const dadosExtraidos = await page.evaluate(() => {
      const dados: Record<string, number> = {};

      // Procurar por linhas de tabela com tipo de venda e valor
      // O relatório 0184 tem colunas: Tipo de venda | Quantidade | Total | Percentual
      // Usamos o índice 2 (Total) em vez da última coluna (Percentual)
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td, th'));
        if (cells.length >= 3) {
          const label = cells[0].textContent?.trim().toLowerCase() || '';
          // Usar coluna Total (índice 2) se disponível, senão a última
          const valorCell = cells.length >= 4 ? cells[2] : cells[cells.length - 1];
          const valorStr = valorCell.textContent?.trim() || '';
          const valor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || 0;

          if (label.includes('servi')) dados['servicos'] = (dados['servicos'] || 0) + valor;
          else if (label.includes('pacote')) dados['pacotes'] = (dados['pacotes'] || 0) + valor;
          else if (label.includes('produto')) dados['produtos'] = (dados['produtos'] || 0) + valor;
          else if (label.includes('caixinha') || label.includes('gorjeta') || label.includes('tip')) dados['caixinha'] = (dados['caixinha'] || 0) + valor;
        }
      }

      // Fallback: procurar por elementos com texto de categoria
      if (Object.keys(dados).length === 0) {
        const allText = document.body.innerText;
        const linhas = allText.split('\n').map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < linhas.length; i++) {
          const linha = linhas[i].toLowerCase();
          const proxLinha = linhas[i + 1] || '';
          const valor = parseFloat(proxLinha.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          if (linha.includes('servi') && !linha.includes('pacote')) dados['servicos'] = valor;
          else if (linha.includes('pacote')) dados['pacotes'] = valor;
          else if (linha.includes('produto')) dados['produtos'] = valor;
          else if (linha.includes('caixinha')) dados['caixinha'] = valor;
        }
      }

      return dados;
    });

    console.log(`[Avec Rel0184] Dados extraídos:`, dadosExtraidos);

    resultado.servicos = dadosExtraidos['servicos'] || 0;
    resultado.pacotes = dadosExtraidos['pacotes'] || 0;
    resultado.produtos = dadosExtraidos['produtos'] || 0;
    resultado.caixinha = dadosExtraidos['caixinha'] || 0;
    resultado.total = resultado.servicos + resultado.pacotes + resultado.produtos + resultado.caixinha;

    // Se não extraiu nada via tabela, tirar screenshot para debug
    if (resultado.total === 0) {
      await page.screenshot({ path: `/tmp/avec-rel0184-debug-${data}.png` });
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      console.warn(`[Avec Rel0184] Nenhum dado extraído. Texto da página: ${pageText}`);
    } else {
      console.log(
        `[Avec Rel0184] Faturamento ${dataFormatada}: ` +
        `Serviços R$${resultado.servicos.toFixed(2)}, ` +
        `Pacotes R$${resultado.pacotes.toFixed(2)}, ` +
        `Produtos R$${resultado.produtos.toFixed(2)}, ` +
        `Caixinha R$${resultado.caixinha.toFixed(2)}, ` +
        `Total R$${resultado.total.toFixed(2)}`
      );
    }

    return resultado;
  } finally {
    await browser.close();
  }
}

/**
 * Busca o faturamento por categoria para um mês inteiro.
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
  outros: number;
  total: number;
}>> {
  const resultado = new Map<string, {
    cabelo: number;
    manicurePedicure: number;
    sobrancelha: number;
    pacote: number;
    recorrencia: number;
    outros: number;
    total: number;
  }>();

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const mesStr = String(mes).padStart(2, "0");
  const hoje = new Date();

  for (let d = 1; d <= ultimoDia; d++) {
    const diaStr = String(d).padStart(2, "0");
    const dataYMD = `${ano}-${mesStr}-${diaStr}`;

    // Não sincronizar dias futuros
    const dataDia = new Date(`${dataYMD}T12:00:00Z`);
    if (dataDia > hoje) break;

    try {
      const dadosDia = await avecBrowserBuscarFaturamentoDia(email, senha, dataYMD);
      resultado.set(dataYMD, dadosDia);
    } catch (e) {
      console.error(`[Avec Browser] Erro ao buscar dia ${dataYMD}:`, e);
    }
  }

  return resultado;
}
