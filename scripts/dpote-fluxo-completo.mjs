/**
 * Script: Executar fluxo completo do Dpote
 * - Valor total das assinaturas: R$ 145.000,00
 * - Porcentagem barbeiros: 35%, barbearia: 65%
 * - Filiais: Morumbi/Vila Andrade e Vila Mascote
 * - Capturar Comissão Bruta por filial
 */

import puppeteer from "puppeteer-core";

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_PAINEL = "https://painel.cashbarber.com.br";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";
// Para máscara de moeda: digitar os centavos (14500000 = R$ 145.000,00)
const VALOR_ASSINATURAS_CENTAVOS = "14500000";
const PORCENTAGEM_COMISSAO = "65";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshot(page, name) {
  await page.screenshot({ path: `/tmp/dpote-full-${name}.png`, fullPage: false });
  console.log(`📸 /tmp/dpote-full-${name}.png`);
}

async function preencherCampoMoeda(page, x, y, valor) {
  // Clicar no campo para focar
  await page.mouse.click(x, y);
  await sleep(300);
  // Selecionar tudo e deletar
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await sleep(200);
  await page.keyboard.press("Delete");
  await sleep(200);
  // Digitar os dígitos um por um (máscara de moeda processa da direita para esquerda)
  for (const char of valor) {
    await page.keyboard.press(char);
    await sleep(80);
  }
  await sleep(300);
}

async function main() {
  console.log("🚀 Iniciando browser...");
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

  const resultados = {};

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Interceptar chamadas da API para capturar dados
    await page.setRequestInterception(true);
    page.on("request", (req) => req.continue());

    page.on("response", async (response) => {
      const url = response.url();
      if (!url.includes("api.cashbarber.com.br/api/painel/dpote")) return;
      try {
        const ct = response.headers()["content-type"] ?? "";
        if (!ct.includes("json")) return;
        const body = await response.json();
        const shortUrl = url.replace("https://api.cashbarber.com.br", "");
        const method = response.request().method();
        console.log(`🌐 ${method} ${shortUrl} → ${response.status()}`);

        // Capturar resultado do POST final
        if (method === "POST" && url.includes("/dpote/historico/") && !url.includes("list")) {
          const data = body?.data ?? body;
          console.log("  Resposta POST:", JSON.stringify(data)?.substring(0, 500));
          if (Array.isArray(data)) {
            data.forEach((filial) => {
              if (filial.filial?.fil_bairro) {
                const nome = filial.filial.fil_bairro;
                const comissao = filial.comissao_bruta_filial ?? filial.comissao_bruta ?? 0;
                resultados[nome] = comissao;
                console.log(`  💰 ${nome}: R$ ${comissao}`);
              }
            });
          }
        }
      } catch {}
    });

    // ===== LOGIN =====
    console.log("\n🔐 Fazendo login...");
    await page.goto(`${CB_PAINEL}/auth/login`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000);
    await page.waitForSelector("input", { timeout: 10000 });
    const inputs = await page.$$("input");
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(CB_EMAIL, { delay: 80 });
      await sleep(200);
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type(CB_SENHA, { delay: 80 });
    }
    await page.keyboard.press("Enter");
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
    await sleep(3000);
    if (page.url().includes("login")) throw new Error("Login falhou");
    console.log("✅ Login OK");

    // ===== NAVEGAR PARA HISTÓRICOS =====
    await page.goto(`${CB_PAINEL}/dpote/historicos`, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(5000);
    await screenshot(page, "01-lista");

    // ===== CLICAR NO BOTÃO VERDE (EDITAR) DO PRIMEIRO HISTÓRICO =====
    console.log("\n✏️  Clicando no botão verde (editar) do primeiro histórico...");
    await page.mouse.click(757, 557);
    await sleep(5000);
    await screenshot(page, "02-wizard-passo1");

    // ===== PASSO 1: SELECIONAR FILIAIS =====
    console.log("\n📋 Passo 1: Selecionando filiais...");

    // Abrir o dropdown de filiais
    await page.mouse.click(780, 307);
    await sleep(2000);
    await screenshot(page, "03-dropdown-aberto");

    // Verificar as opções disponíveis
    const opcoes = await page.evaluate(() => {
      const items = Array.from(
        document.querySelectorAll(".p-dropdown-item, .p-multiselect-item, li[role='option']")
      );
      return items.map((i) => ({
        text: i.textContent?.trim(),
        y: i.getBoundingClientRect().y,
        x: i.getBoundingClientRect().x,
      }));
    });
    console.log("Opções no dropdown:", JSON.stringify(opcoes));

    if (opcoes.length > 0) {
      for (const opcao of opcoes) {
        console.log(`  Selecionando: ${opcao.text} (y=${Math.round(opcao.y)})`);
        await page.mouse.click(opcao.x + 50, opcao.y + 8);
        await sleep(800);
        // Verificar se dropdown ainda está aberto
        const aindaAberto = await page.evaluate(
          () => !!document.querySelector(".p-dropdown-panel, .p-dropdown-items")
        );
        if (!aindaAberto && opcoes.indexOf(opcao) < opcoes.length - 1) {
          // Reabrir para próxima opção
          await page.mouse.click(780, 307);
          await sleep(1500);
        }
      }
    } else {
      // Fallback: coordenadas fixas baseadas nos screenshots
      await page.mouse.click(780, 292); // Morumbi/Vila Andrade
      await sleep(800);
    }

    // Fechar dropdown clicando fora
    await page.keyboard.press("Escape");
    await sleep(500);
    await page.mouse.click(640, 200);
    await sleep(1000);
    await screenshot(page, "04-filiais-selecionadas");

    // Verificar botão Continuar passo 1
    const btnCont1 = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.trim() === "Continuar");
      return { found: !!btn, disabled: btn?.disabled };
    });
    console.log("Botão Continuar passo 1:", JSON.stringify(btnCont1));

    // Se ainda desabilitado, tentar selecionar via evaluate direto
    if (btnCont1.disabled) {
      console.log("  Botão ainda desabilitado, tentando selecionar via JS...");
      const selecionou = await page.evaluate(() => {
        // Tentar encontrar o dropdown component e forçar seleção
        const dropdownItems = document.querySelectorAll(".p-dropdown-item, li[role='option']");
        if (dropdownItems.length > 0) {
          dropdownItems.forEach((item) => {
            item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          });
          return `Clicou em ${dropdownItems.length} itens`;
        }
        return "Nenhum item encontrado";
      });
      console.log("  Resultado:", selecionou);
      await sleep(1000);
    }

    // Clicar em Continuar (passo 1) - mesmo que desabilitado, tentar
    console.log("\n▶️  Continuar passo 1...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.trim() === "Continuar");
      if (btn) btn.click();
    });
    await sleep(8000);
    await screenshot(page, "05-passo2");

    // ===== PASSO 2: SERVIÇOS POR BARBEIROS =====
    console.log("\n📋 Passo 2: Serviços por barbeiros...");

    // Abrir dropdown do passo 2
    await page.mouse.click(780, 347);
    await sleep(2000);
    await screenshot(page, "06-dropdown2-aberto");

    const opcoes2 = await page.evaluate(() => {
      const items = Array.from(
        document.querySelectorAll(".p-dropdown-item, .p-multiselect-item, li[role='option']")
      );
      return items.map((i) => ({
        text: i.textContent?.trim(),
        y: i.getBoundingClientRect().y,
        x: i.getBoundingClientRect().x,
      }));
    });
    console.log("Opções passo 2:", JSON.stringify(opcoes2));

    if (opcoes2.length > 0) {
      for (const opcao of opcoes2) {
        console.log(`  Selecionando: ${opcao.text}`);
        await page.mouse.click(opcao.x + 50, opcao.y + 8);
        await sleep(800);
        const aindaAberto = await page.evaluate(
          () => !!document.querySelector(".p-dropdown-panel, .p-dropdown-items")
        );
        if (!aindaAberto && opcoes2.indexOf(opcao) < opcoes2.length - 1) {
          await page.mouse.click(780, 347);
          await sleep(1500);
        }
      }
      await page.keyboard.press("Escape");
      await sleep(500);
      await page.mouse.click(640, 200);
      await sleep(1000);
    }

    // Clicar em Continuar (passo 2)
    console.log("\n▶️  Continuar passo 2...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => b.textContent?.trim() === "Continuar" && !b.disabled);
      if (btn) btn.click();
    });
    await sleep(8000);
    await screenshot(page, "07-passo3");

    // ===== PASSO 3: FATURAMENTO MENSAL =====
    console.log("\n📋 Passo 3: Faturamento mensal das assinaturas...");

    const campos3 = await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input[type='number'], input[type='text'], input:not([type='hidden'])")
      );
      return inputs
        .map((i) => ({
          name: i.name || i.id || i.placeholder,
          type: i.type,
          value: i.value,
          y: i.getBoundingClientRect().y,
          x: i.getBoundingClientRect().x,
          width: i.getBoundingClientRect().width,
        }))
        .filter((i) => i.width > 0);
    });
    console.log("Campos passo 3:", JSON.stringify(campos3, null, 2));

    // Preencher "Valor ganho em assinaturas" = R$ 145.000,00
    const campoValor = campos3.find(
      (c) => c.name?.includes("valor") || c.name?.includes("assinatura")
    ) ?? campos3[0];
    if (campoValor) {
      console.log(`\n💰 Preenchendo valor das assinaturas: R$ 145.000,00`);
      await preencherCampoMoeda(page, campoValor.x + 50, campoValor.y + 10, VALOR_ASSINATURAS_CENTAVOS);
      await screenshot(page, "08a-valor-preenchido");

      // Verificar valor digitado
      const valorAtual = await page.evaluate((name) => {
        const inputs = Array.from(document.querySelectorAll("input"));
        const input = inputs.find((i) => (i.name || i.id || i.placeholder) === name);
        return input?.value;
      }, campoValor.name);
      console.log("  Valor atual no campo:", valorAtual);
    }

    // Preencher "Porcentagem de comissão" = 65 (barbearia)
    const campoPorcentagem = campos3.find(
      (c) => c.name?.includes("porcentagem") || c.name?.includes("comissao")
    ) ?? campos3[1];
    if (campoPorcentagem) {
      console.log(`\n📊 Preenchendo porcentagem de comissão: ${PORCENTAGEM_COMISSAO}%`);
      await preencherCampoMoeda(page, campoPorcentagem.x + 50, campoPorcentagem.y + 10, PORCENTAGEM_COMISSAO);
      await screenshot(page, "08b-porcentagem-preenchida");

      const porcAtual = await page.evaluate((name) => {
        const inputs = Array.from(document.querySelectorAll("input"));
        const input = inputs.find((i) => (i.name || i.id || i.placeholder) === name);
        return input?.value;
      }, campoPorcentagem.name);
      console.log("  Porcentagem atual no campo:", porcAtual);
    }

    // Verificar "Valor total do pote" atualizado
    await sleep(500);
    const valorPote = await page.evaluate(() => {
      const allText = document.body.innerText;
      const match = allText.match(/Valor total do pote[:\s]*(R\$\s*[\d.,]+)/i);
      return match?.[1];
    });
    console.log("Valor total do pote:", valorPote);

    // Verificar botões
    const btns3 = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button"))
        .map((b) => ({ text: b.textContent?.trim(), disabled: b.disabled }))
        .filter((b) => b.text)
    );
    console.log("Botões passo 3:", JSON.stringify(btns3));

    // Clicar em Enviar
    console.log("\n📤 Enviando...");
    const enviou = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => {
        const t = b.textContent?.trim().toLowerCase();
        return (
          (t?.includes("enviar") ||
            t?.includes("confirmar") ||
            t?.includes("finalizar") ||
            t?.includes("salvar")) &&
          !b.disabled
        );
      });
      if (btn) {
        btn.click();
        return btn.textContent?.trim();
      }
      return null;
    });
    console.log("Clicou em:", enviou);
    await sleep(12000);
    await screenshot(page, "09-resultado");

    // ===== CAPTURAR RESULTADO FINAL =====
    console.log("\n📊 Capturando resultado final da página...");
    const resultado = await page.evaluate(() => document.body.innerText);

    // Extrair dados por filial
    const linhas = resultado.split("\n").filter((l) => l.trim());
    
    // Encontrar seções por filial
    const filiais = ["Morumbi/Vila Andrade", "Vila Mascote"];
    for (const filial of filiais) {
      const idx = linhas.findIndex((l) => l.includes(filial));
      if (idx >= 0) {
        console.log(`\n=== ${filial} ===`);
        const secao = linhas.slice(idx, idx + 15);
        secao.forEach((l) => console.log(`  ${l}`));
        
        // Extrair comissão bruta
        const idxComissao = secao.findIndex((l) => l.toLowerCase().includes("comissão bruta filial"));
        if (idxComissao >= 0 && idxComissao + 1 < secao.length) {
          const valorStr = secao[idxComissao + 1];
          resultados[filial] = valorStr;
          console.log(`  💰 Comissão bruta: ${valorStr}`);
        }
      }
    }

    // Informações gerais
    const idxGeral = linhas.findIndex((l) => l.includes("Informações gerais"));
    if (idxGeral >= 0) {
      console.log("\n=== Informações Gerais ===");
      linhas.slice(idxGeral, idxGeral + 12).forEach((l) => console.log(`  ${l}`));
    }

    console.log("\n\n✅ RESULTADOS FINAIS:");
    console.log(JSON.stringify(resultados, null, 2));

  } finally {
    await browser.close();
    console.log("\n✅ Browser fechado.");
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
