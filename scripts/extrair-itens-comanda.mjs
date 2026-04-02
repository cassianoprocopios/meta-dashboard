/**
 * Extrai os itens realizados de uma comanda via endpoint /admin/financeiro/comanda/abrir
 * e verifica se há dados de categoria de serviço.
 * 
 * Também testa o endpoint /admin/financeiro/comanda/exel para exportar dados por categoria.
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
    
    // ===== PASSO 1: OBTER LISTA DE COMANDAS DO DIA 01/04/2026 =====
    console.log("\n2. Obtendo lista de comandas do dia 01/04/2026...");
    
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
    
    // Extrair tokens de comandas
    const tokenMatches = listaResp.match(/abrirComanda\('([^']+)'/g) || [];
    const tokens = tokenMatches.map(m => m.match(/abrirComanda\('([^']+)'/)[1]);
    
    console.log(`Total de comandas encontradas: ${tokens.length}`);
    
    // Extrair valores das comandas
    let listaData;
    try {
      listaData = JSON.parse(listaResp);
    } catch (e) {
      console.log("Erro ao parsear lista:", e.message);
      listaData = { aaData: [] };
    }
    
    console.log("Primeiras 5 comandas:");
    for (let i = 0; i < Math.min(5, listaData.aaData?.length || 0); i++) {
      const row = listaData.aaData[i];
      console.log(`  ${row[0]} - ${row[1]} - ${row[4]}`);
    }
    
    // ===== PASSO 2: ABRIR CADA COMANDA E EXTRAIR ITENS =====
    console.log("\n3. Abrindo comandas e extraindo itens...");
    
    const resultadoPorCategoria = {
      cabelo: 0,
      manicurePedicure: 0,
      sobrancelha: 0,
      pacote: 0,
      recorrencia: 0,
      outros: 0,
      total: 0
    };
    
    const detalhesComandas = [];
    
    // Processar primeiras 10 comandas para teste
    const tokensTeste = tokens.slice(0, 10);
    
    for (let i = 0; i < tokensTeste.length; i++) {
      const token = tokensTeste[i];
      const valorStr = listaData.aaData?.[i]?.[4] || "R$ 0,00";
      const valor = parseFloat(valorStr.replace("R$ ", "").replace(".", "").replace(",", ".")) || 0;
      
      try {
        const abrirResp = await page.evaluate(async (url, token) => {
          const r = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json"
            },
            body: `token=${encodeURIComponent(token)}&tipo=comanda`
          });
          return await r.text();
        }, `${ADMIN_URL}/admin/financeiro/comanda/abrir`, token);
        
        // Extrair itens realizados da comanda
        // Procurar por 'historicoUtil.add' com dados de serviço
        const historicoMatches = abrirResp.match(/historicoUtil\.add\((\d+),\s*(\{[\s\S]*?\})\)/g) || [];
        
        // Procurar por dados de serviços realizados no HTML
        // O HTML contém elementos com classe 'item-comanda' ou similar
        const servicosRealizados = [];
        
        // Extrair itens do HTML da comanda
        // Procurar por elementos com dados de serviço e categoria
        const itemMatches = abrirResp.match(/\"servico\":\"([^\"]+)\"[^}]*\"categoria\":\"([^\"]*)\"/g) || [];
        
        // Procurar por itens realizados (não o catálogo de serviços)
        // Os itens realizados têm 'comandaItemId' ou similar
        const comandaItemMatches = abrirResp.match(/comandaItemId[^;]+/g) || [];
        
        // Procurar por 'add(' com dados de item realizado
        const addMatches = abrirResp.match(/\.add\(\d+,\s*\{[^}]+servico[^}]+\}/g) || [];
        
        // Extrair valor total da comanda do HTML
        const totalMatch = abrirResp.match(/\"valor_total\":\"([^\"]+)\"/);
        const totalComanda = totalMatch ? parseFloat(totalMatch[1].replace(",", ".")) : valor;
        
        // Procurar por itens realizados com categoria
        const itensRealizados = [];
        
        // Tentar extrair do HTML os serviços realizados
        // Procurar por padrão: servico + valor + categoria nos itens da comanda
        const htmlMatch = abrirResp.match(/"dados":"([\s\S]+?)","sucesso"/);
        
        // Procurar por 'data-servico' ou 'data-categoria' nos elementos HTML
        const dataServico = abrirResp.match(/data-servico="([^"]+)"/g) || [];
        const dataCategoria = abrirResp.match(/data-categoria="([^"]+)"/g) || [];
        const dataValor = abrirResp.match(/data-valor="([^"]+)"/g) || [];
        
        // Extrair itens da comanda do JSON embutido
        // Procurar por 'itens' no JSON
        const itensJsonMatch = abrirResp.match(/"itens":\s*\[([^\]]+)\]/g) || [];
        
        // Procurar por 'servico_id' e 'categoria' nos itens
        const servicoIdMatches = abrirResp.match(/"servico_id":"(\d+)"/g) || [];
        
        // Extrair dados do JSON de configuração da comanda
        const configMatch = abrirResp.match(/financeiroComanda\.dadosPadrao\s*=\s*(\{[\s\S]+?\});\s*\n/);
        
        // Procurar por itens realizados com valor
        // Padrão: {"id":"...","servico":"...","valor":"...","categoria":"..."}
        const itensPattern = /\{"id":"(\d+)","servico":"([^"]+)","[^}]*"valor":"([^"]+)"[^}]*"categoria":"([^"]*)"[^}]*\}/g;
        let match;
        while ((match = itensPattern.exec(abrirResp)) !== null) {
          itensRealizados.push({
            id: match[1],
            servico: match[2],
            valor: parseFloat(match[3].replace(",", ".")),
            categoria: match[4]
          });
        }
        
        // Tentar outro padrão
        const itensPattern2 = /"servico":"([^"]+)"[^}]*"valor":"([^"]+)"[^}]*"catId":"([^"]*)"[^}]*"categoria":"([^"]*)"/g;
        while ((match = itensPattern2.exec(abrirResp)) !== null) {
          itensRealizados.push({
            servico: match[1],
            valor: parseFloat(match[2].replace(",", ".")),
            catId: match[3],
            categoria: match[4]
          });
        }
        
        const comanda = {
          numero: listaData.aaData?.[i]?.[0] || `Comanda ${i+1}`,
          cliente: listaData.aaData?.[i]?.[1] || "",
          valor: totalComanda,
          itensRealizados: itensRealizados.length,
          dataServico: dataServico.length,
          dataCategoria: dataCategoria.length,
          historicoMatches: historicoMatches.length,
          addMatches: addMatches.length,
          comandaItemMatches: comandaItemMatches.length
        };
        
        detalhesComandas.push(comanda);
        console.log(`  ${comanda.numero} - ${comanda.cliente} - R$ ${totalComanda} - itens: ${itensRealizados.length} - dataServico: ${dataServico.length}`);
        
        if (dataServico.length > 0) {
          console.log("    data-servico:", dataServico.slice(0, 3));
          console.log("    data-categoria:", dataCategoria.slice(0, 3));
          console.log("    data-valor:", dataValor.slice(0, 3));
        }
        
        // Salvar primeira comanda para análise
        if (i === 0) {
          fs.writeFileSync("/tmp/avec-comanda-0-raw.txt", abrirResp.substring(0, 50000));
          console.log("  Primeira comanda salva em /tmp/avec-comanda-0-raw.txt");
        }
        
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.log(`  Erro na comanda ${i+1}:`, e.message);
      }
    }
    
    // ===== PASSO 3: TESTAR ENDPOINT EXEL (EXPORTAR) =====
    console.log("\n4. Testando endpoint de exportação Excel...");
    
    const exelResp = await page.evaluate(async (url) => {
      const r = await fetch(url, { 
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json"
        }
      });
      const text = await r.text();
      return { status: r.status, text: text.substring(0, 2000) };
    }, `${ADMIN_URL}/admin/financeiro/comanda/exel?parDataIni=01/04/2026&parDataFim=01/04/2026&status=2`);
    
    console.log(`Status exel: ${exelResp.status}`);
    console.log(`Resposta exel: ${exelResp.text.substring(0, 500)}`);
    
    // ===== PASSO 4: VERIFICAR RELATÓRIO DE SERVIÇOS =====
    console.log("\n5. Testando relatório de serviços por categoria...");
    
    const relatorioEndpoints = [
      `/admin/relatorio/servico/listar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/relatorio/servico/buscar?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/relatorio/servico/relatorio?dataInicio=01/04/2026&dataFim=01/04/2026`,
      `/admin/relatorio/servico/dados?dataInicio=01/04/2026&dataFim=01/04/2026`,
    ];
    
    for (const ep of relatorioEndpoints) {
      try {
        const resp = await page.evaluate(async (url) => {
          const r = await fetch(url, { 
            credentials: "include",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Accept": "application/json"
            }
          });
          const text = await r.text();
          return { status: r.status, text: text.substring(0, 1000) };
        }, `${ADMIN_URL}${ep}`);
        
        console.log(`  ${resp.status} ${ep}`);
        if (resp.text && !resp.text.includes("<!DOCTYPE") && resp.text.length > 10) {
          console.log(`  Resposta: ${resp.text.substring(0, 300)}`);
        }
      } catch (e) {}
    }
    
    // ===== PASSO 5: VERIFICAR RELATÓRIO DE SERVIÇOS VIA BROWSER =====
    console.log("\n6. Acessando relatório de serviços via browser...");
    
    const apiLog2 = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("admin.avec.beauty") && !url.includes(".js") && !url.includes(".css") && 
          !url.includes(".png") && !url.includes("google") && !url.includes("facebook")) {
        try {
          const text = await response.text();
          if (text.length > 5 && (text.startsWith("{") || text.startsWith("["))) {
            apiLog2.push({ url, status: response.status(), body: text.substring(0, 3000) });
            console.log(`[JSON] ${response.status()} ${url.substring(0, 100)}`);
            console.log(`  ${text.substring(0, 300)}`);
          }
        } catch (e) {}
      }
    });
    
    await page.goto(`${ADMIN_URL}/admin/relatorio/servico`, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Preencher datas e filtrar
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']"));
      for (const input of inputs) {
        const name = input.name || input.id || "";
        if (name.toLowerCase().includes("ini") || name.toLowerCase().includes("inicio")) {
          input.value = "01/04/2026";
          input.dispatchEvent(new Event("change"));
        }
        if (name.toLowerCase().includes("fim") || name.toLowerCase().includes("final")) {
          input.value = "01/04/2026";
          input.dispatchEvent(new Event("change"));
        }
      }
    });
    
    const btnFiltrar = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button, input[type='submit']"));
      return btns.find(b => {
        const text = (b.textContent || "").toLowerCase();
        return text.includes("filtrar") || text.includes("buscar") || text.includes("pesquisar");
      });
    });
    
    if (btnFiltrar) {
      await btnFiltrar.click();
      await new Promise(r => setTimeout(r, 5000));
    }
    
    await page.screenshot({ path: "/tmp/avec-relatorio-servicos-filtrado.png", fullPage: true });
    
    const textoRelatorio = await page.evaluate(() => document.body.innerText);
    console.log("Texto relatório de serviços (primeiros 3000):", textoRelatorio.substring(0, 3000));
    
    // Verificar inputs disponíveis
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("input, select")).map(el => ({
        type: el.type,
        name: el.name || el.id,
        value: el.value,
        placeholder: el.placeholder
      }));
    });
    console.log("Inputs:", JSON.stringify(inputs.filter(i => i.name), null, 2));
    
    fs.writeFileSync("/tmp/avec-api-relatorio-servicos.json", JSON.stringify(apiLog2, null, 2));
    
  } finally {
    await browser.close();
    console.log("\nScript concluído.");
  }
}

main().catch(console.error);
