/**
 * Teste de integração completo para validar o faturamento real do dia 01/04/2026.
 * Usa a nova implementação do avecBrowser.ts.
 */
import puppeteer from "puppeteer-core";
import fs from "fs";

const EMAIL = "seraphinebeauty24@gmail.com";
const SENHA = "Dxj4oue@";
const SLUG = "seraphine-beauty-ltda";
const ADMIN_URL = "https://admin.avec.beauty";

// ─── Funções copiadas do avecBrowser.ts ───────────────────────────────────────

const MAPA_SERVICO_CATEGORIA = [
  { palavras: ["escova", "corte", "tintura", "coloração", "tonalização", "botox", "progressiva", "relaxamento", "hidratação", "chapinha", "prancha", "mechas", "luzes", "ombré", "balayage", "capilar", "penteado", "finalização", "finaliz", "tratamento capilar", "keratina", "alisamento", "permanente", "descoloração", "descolorac"], categoria: "cabelo" },
  { palavras: ["manicure", "pedicure", "unhas", "nail", "esmalt", "gel", "fibra", "acrigel", "acrílico", "acrilico", "mãos", "maos", "pés", "pes"], categoria: "manicurePedicure" },
  { palavras: ["sobrancelha", "design", "henna", "micropigmentação", "micropigmentacao", "brow", "cílios", "cilios", "lash", "depilação", "depilacao", "buço", "buco", "bigode"], categoria: "sobrancelha" },
  { palavras: ["pacote", "combo", "clube", "kit", "plano", "assinatura"], categoria: "pacote" },
  { palavras: ["recorrência", "recorrencia", "mensalidade", "fidelidade", "dpote", "d-pote"], categoria: "recorrencia" },
];

function mapearServicoParaCategoria(nomeServico) {
  const nomeLower = nomeServico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const mapa of MAPA_SERVICO_CATEGORIA) {
    for (const palavra of mapa.palavras) {
      const palavraNorm = palavra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (nomeLower.includes(palavraNorm)) return mapa.categoria;
    }
  }
  return "outros";
}

function extrairTokensPrintDaLista(htmlLista) {
  const tokens = [];
  const regex = /comanda\\\/print\?id=([^"\\]+)/g;
  let match;
  while ((match = regex.exec(htmlLista)) !== null) {
    tokens.push(match[1]);
  }
  const regex2 = /comanda\/print\?id=([^"&\s]+)/g;
  while ((match = regex2.exec(htmlLista)) !== null) {
    if (!tokens.includes(match[1])) tokens.push(match[1]);
  }
  return tokens;
}

function extrairItensDoPrint(htmlPrint) {
  const itens = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(htmlPrint)) !== null) {
    const trContent = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      const texto = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      tds.push(texto);
    }

    if (tds.length >= 4) {
      const qtd = parseInt(tds[0], 10);
      const servico = tds[1].trim();
      const valorStr = tds[tds.length - 1].replace(/[^\d,]/g, "").replace(",", ".");
      const valor = parseFloat(valorStr) || 0;

      if (!isNaN(qtd) && qtd > 0 && servico && !servico.toLowerCase().includes("item") && !servico.toLowerCase().includes("total")) {
        itens.push({ servico, valor });
      }
    }
  }

  return itens;
}

// ─── Teste de integração ───────────────────────────────────────────────────────

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    
    // Login
    await page.goto(`${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`, { waitUntil: "networkidle2", timeout: 30000 });
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 8000 });
      await page.type('input[type="password"]', SENHA);
      const btn = await page.evaluateHandle(() => Array.from(document.querySelectorAll("button")).find(b => b.textContent?.toLowerCase().includes("entrar")));
      if (btn) await btn.click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });
    } catch(e) { console.log("Já logado"); }
    
    console.log("URL após login:", page.url());
    await new Promise(r => setTimeout(r, 2000));
    
    // Obter cookies
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
    
    // ── Buscar lista de comandas do dia 01/04/2026 ────────────────────────────
    const DATA = "01/04/2026";
    console.log(`\nBuscando comandas do dia ${DATA}...`);
    
    const listaUrl = `${ADMIN_URL}/admin/financeiro/comanda/lista?status=2&parTipoComanda=1&parDataIni=${DATA}&parDataFim=${DATA}&draw=1&start=0&length=500`;
    
    const listaResp = await page.evaluate(async (url) => {
      const r = await fetch(url, {
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json"
        }
      });
      return await r.text();
    }, listaUrl);
    
    const printTokens = extrairTokensPrintDaLista(listaResp);
    console.log(`Tokens de print encontrados: ${printTokens.length}`);
    
    // ── Para cada comanda, buscar o print e extrair itens ─────────────────────
    const resultado = {
      cabelo: 0,
      manicurePedicure: 0,
      sobrancelha: 0,
      pacote: 0,
      recorrencia: 0,
      outros: 0,
      total: 0,
    };
    
    const detalhes = [];
    let totalItens = 0;
    
    for (let i = 0; i < printTokens.length; i++) {
      const token = printTokens[i];
      try {
        const printUrl = `${ADMIN_URL}/admin/financeiro/comanda/print?id=${encodeURIComponent(token)}`;
        
        const printHtml = await page.evaluate(async (url) => {
          const r = await fetch(url, { credentials: "include" });
          return await r.text();
        }, printUrl);
        
        const itens = extrairItensDoPrint(printHtml);
        
        for (const item of itens) {
          const categoria = mapearServicoParaCategoria(item.servico);
          resultado[categoria] += item.valor;
          totalItens++;
          detalhes.push({ comanda: i + 1, servico: item.servico, valor: item.valor, categoria });
        }
        
        if (i < 5) {
          console.log(`  Comanda ${i+1}: ${itens.length} itens`);
          for (const item of itens) {
            const cat = mapearServicoParaCategoria(item.servico);
            console.log(`    ${item.servico} -> ${cat} (R$ ${item.valor})`);
          }
        }
        
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.warn(`  Erro na comanda ${i+1}:`, e.message);
      }
    }
    
    resultado.total = resultado.cabelo + resultado.manicurePedicure + resultado.sobrancelha + resultado.pacote + resultado.recorrencia + resultado.outros;
    
    console.log("\n=== RESULTADO FINAL ===");
    console.log(`Comandas processadas: ${printTokens.length}`);
    console.log(`Total de itens: ${totalItens}`);
    console.log(`Cabelo: R$ ${resultado.cabelo.toFixed(2)}`);
    console.log(`Manicure/Pedicure: R$ ${resultado.manicurePedicure.toFixed(2)}`);
    console.log(`Sobrancelha: R$ ${resultado.sobrancelha.toFixed(2)}`);
    console.log(`Pacote: R$ ${resultado.pacote.toFixed(2)}`);
    console.log(`Recorrência: R$ ${resultado.recorrencia.toFixed(2)}`);
    console.log(`Outros: R$ ${resultado.outros.toFixed(2)}`);
    console.log(`TOTAL: R$ ${resultado.total.toFixed(2)}`);
    
    // Mostrar itens não mapeados
    const naoMapeados = detalhes.filter(d => d.categoria === "outros");
    if (naoMapeados.length > 0) {
      console.log("\n=== SERVIÇOS NÃO MAPEADOS ===");
      const naoMapeadosUnicos = [...new Set(naoMapeados.map(d => d.servico))];
      for (const s of naoMapeadosUnicos) {
        const total = naoMapeados.filter(d => d.servico === s).reduce((acc, d) => acc + d.valor, 0);
        console.log(`  ${s}: R$ ${total.toFixed(2)}`);
      }
    }
    
    fs.writeFileSync("/tmp/avec-integracao-resultado.json", JSON.stringify({ resultado, detalhes }, null, 2));
    console.log("\nResultado salvo em /tmp/avec-integracao-resultado.json");
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
