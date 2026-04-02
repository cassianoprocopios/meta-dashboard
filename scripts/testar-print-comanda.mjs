/**
 * Testa o endpoint de print da comanda para extrair itens realizados com categoria.
 * URL: /admin/financeiro/comanda/print?id=TOKEN_PRINT
 */
import puppeteer from "puppeteer-core";
import fs from "fs";

const EMAIL = "seraphinebeauty24@gmail.com";
const SENHA = "Dxj4oue@";
const SLUG = "seraphine-beauty-ltda";
const ADMIN_URL = "https://admin.avec.beauty";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    
    // Login
    const loginUrl = `${ADMIN_URL}/${SLUG}/admin/?email=${encodeURIComponent(EMAIL)}`;
    console.log("1. Login:", loginUrl);
    await page.goto(loginUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await page.type('input[type="password"]', SENHA);
      const botao = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find(b => b.textContent?.trim().toLowerCase().includes("entrar"));
      });
      if (botao) await botao.click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
    } catch (e) {
      console.log("Já logado");
    }
    
    console.log("URL após login:", page.url());
    await new Promise(r => setTimeout(r, 2000));
    
    // ===== PASSO 1: OBTER LISTA DE COMANDAS COM TOKENS DE PRINT =====
    console.log("\n2. Obtendo lista de comandas com tokens de print para 01/04/2026...");
    
    const listaResp = await page.evaluate(async (url) => {
      const r = await fetch(url, { 
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json"
        }
      });
      return await r.text();
    }, `${ADMIN_URL}/admin/financeiro/comanda/lista?status=2&parTipoComanda=1&parDataIni=01/04/2026&parDataFim=01/04/2026&draw=1&start=0&length=500`);
    
    // Extrair tokens de print das comandas
    const printTokenMatches = listaResp.match(/comanda\/print\?id=([^"]+)"/g) || [];
    const printTokens = printTokenMatches.map(m => {
      const match = m.match(/comanda\/print\?id=([^"]+)"/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    // Extrair tokens de abrir das comandas
    const abrirTokenMatches = listaResp.match(/abrirComanda\('([^']+)'/g) || [];
    const abrirTokens = abrirTokenMatches.map(m => m.match(/abrirComanda\('([^']+)'/)[1]);
    
    console.log(`Tokens de print: ${printTokens.length}`);
    console.log(`Tokens de abrir: ${abrirTokens.length}`);
    
    // Extrair dados das comandas
    let listaData;
    try {
      listaData = JSON.parse(listaResp);
    } catch (e) {
      // JSON truncado - extrair manualmente
      listaData = { aaData: [] };
    }
    
    // ===== PASSO 2: TESTAR PRINT DA PRIMEIRA COMANDA =====
    console.log("\n3. Testando print da primeira comanda (Nº0041 - Michele Evans - R$ 75,00)...");
    
    if (printTokens.length > 0) {
      const printToken = printTokens[1]; // Pular a primeira (R$ 0,00)
      const printUrl = `${ADMIN_URL}/admin/financeiro/comanda/print?id=${printToken}`;
      console.log("URL print:", printUrl.substring(0, 100) + "...");
      
      await page.goto(printUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ path: "/tmp/avec-comanda-print.png", fullPage: true });
      
      const textoPrint = await page.evaluate(() => document.body.innerText);
      console.log("Texto do print (primeiros 3000):", textoPrint.substring(0, 3000));
      
      // Salvar HTML do print
      const htmlPrint = await page.evaluate(() => document.body.innerHTML);
      fs.writeFileSync("/tmp/avec-comanda-print.html", htmlPrint.substring(0, 100000));
      console.log("HTML salvo em /tmp/avec-comanda-print.html");
    }
    
    // ===== PASSO 3: TESTAR PRINT VIA FETCH =====
    console.log("\n4. Testando print via fetch...");
    
    if (printTokens.length > 1) {
      const printToken = printTokens[1];
      const printResp = await page.evaluate(async (url) => {
        const r = await fetch(url, { credentials: "include" });
        return { status: r.status, text: (await r.text()).substring(0, 10000) };
      }, `${ADMIN_URL}/admin/financeiro/comanda/print?id=${printToken}`);
      
      console.log(`Status: ${printResp.status}`);
      fs.writeFileSync("/tmp/avec-comanda-print-fetch.html", printResp.text);
      
      // Extrair itens do HTML
      const { JSDOM } = await import("jsdom").catch(() => ({ JSDOM: null }));
      if (JSDOM) {
        const dom = new JSDOM(printResp.text);
        const doc = dom.window.document;
        const items = doc.querySelectorAll("tr, .item, .servico");
        console.log("Itens encontrados:", items.length);
      }
    }
    
    // ===== PASSO 4: ANALISAR HTML DO PRINT =====
    console.log("\n5. Analisando HTML do print para extrair itens...");
    
    const htmlPrint = fs.readFileSync("/tmp/avec-comanda-print.html", "utf8");
    
    // Procurar por padrões de serviços no HTML
    const { JSDOM } = await import("jsdom").catch(() => ({ JSDOM: null }));
    
    if (JSDOM) {
      const dom = new JSDOM(htmlPrint);
      const doc = dom.window.document;
      
      // Procurar por tabelas
      const tables = doc.querySelectorAll("table");
      console.log("Tabelas encontradas:", tables.length);
      
      for (let i = 0; i < tables.length; i++) {
        const rows = tables[i].querySelectorAll("tr");
        console.log(`Tabela ${i+1}: ${rows.length} linhas`);
        for (let j = 0; j < Math.min(5, rows.length); j++) {
          console.log(`  Linha ${j+1}: ${rows[j].textContent?.trim().substring(0, 100)}`);
        }
      }
      
      // Procurar por elementos com texto de serviço
      const allText = doc.body.textContent || "";
      console.log("\nTexto completo (primeiros 2000):", allText.substring(0, 2000));
    } else {
      // Fallback: usar regex
      const { parse } = await import("node-html-parser").catch(() => ({ parse: null }));
      
      if (parse) {
        const root = parse(htmlPrint);
        const tables = root.querySelectorAll("table");
        console.log("Tabelas encontradas:", tables.length);
        for (const table of tables.slice(0, 3)) {
          const rows = table.querySelectorAll("tr");
          console.log(`Tabela: ${rows.length} linhas`);
          for (const row of rows.slice(0, 5)) {
            console.log(`  ${row.text?.trim().substring(0, 100)}`);
          }
        }
      } else {
        // Usar regex simples
        const trMatches = htmlPrint.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        console.log("Linhas de tabela:", trMatches.length);
        for (const tr of trMatches.slice(0, 10)) {
          const text = tr.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (text.length > 5) console.log(`  ${text.substring(0, 100)}`);
        }
      }
    }
    
    // ===== PASSO 5: TESTAR ENDPOINT DE RELATÓRIO DE SERVIÇOS =====
    console.log("\n6. Testando relatório de serviços com filtro de data...");
    
    await page.goto(`${ADMIN_URL}/admin/relatorio/servico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Verificar inputs disponíveis
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        type: el.type,
        name: el.name || el.id,
        value: el.value,
        placeholder: el.placeholder
      })).filter(i => i.name);
    });
    console.log("Inputs disponíveis:", JSON.stringify(inputs, null, 2));
    
    // Preencher datas
    await page.evaluate(() => {
      const inputs = document.querySelectorAll("input");
      for (const input of inputs) {
        const name = (input.name || input.id || "").toLowerCase();
        if (name.includes("ini") || name.includes("inicio") || name.includes("start")) {
          input.value = "01/04/2026";
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (name.includes("fim") || name.includes("final") || name.includes("end")) {
          input.value = "01/04/2026";
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    });
    
    // Clicar em filtrar
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, input[type='submit']"));
      const btn = btns.find(b => {
        const text = (b.textContent || b.value || "").toLowerCase();
        return text.includes("filtrar") || text.includes("buscar") || text.includes("pesquisar") || text.includes("gerar");
      });
      if (btn) btn.click();
    });
    
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: "/tmp/avec-relatorio-servicos-01-04.png", fullPage: true });
    
    const textoRelatorio = await page.evaluate(() => document.body.innerText);
    console.log("Texto relatório (primeiros 3000):", textoRelatorio.substring(0, 3000));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
