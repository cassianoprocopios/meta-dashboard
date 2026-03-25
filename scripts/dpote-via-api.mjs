/**
 * Script: Preencher histórico Dpote via API usando dados de agendamentos do CashBarber
 * 
 * Fluxo:
 * 1. Login na API
 * 2. Buscar filiais
 * 3. Buscar agendamentos/serviços realizados por filial em março/2026
 * 4. Calcular fichas por filial
 * 5. Criar histórico Dpote e preencher via POST com os dados
 * 6. Calcular comissão bruta por filial
 */

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_API = "https://api.cashbarber.com.br";

const MES_INICIO = "2026-03-01";
const MES_FIM = "2026-03-31";
const VALOR_ASSINATURAS = 145000; // R$ 145.000,00
const PORCENTAGEM_BARBEARIA = 65; // 65%

async function loginAPI() {
  const resp = await fetch(`${CB_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
  });

  if (resp.status === 409) {
    const setCookie409 = resp.headers.get("set-cookie") ?? "";
    const m409 = setCookie409.match(/access_token_painel=([^;]+)/);
    if (m409) return m409[1];
    // Forçar logout
    await fetch(`${CB_API}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, ctx: "painel" }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const resp2 = await fetch(`${CB_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
    });
    const setCookie2 = resp2.headers.get("set-cookie") ?? "";
    const m2 = setCookie2.match(/access_token_painel=([^;]+)/);
    if (!m2) throw new Error("Token não encontrado após re-login");
    return m2[1];
  }

  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const setCookie = resp.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error("Token não encontrado");
  return m[1];
}

async function apiGet(token, path) {
  const resp = await fetch(`${CB_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`GET ${path} → ${resp.status}: ${text.substring(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function apiPost(token, path, body) {
  const resp = await fetch(`${CB_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) {
    console.warn(`  POST ${path} → ${resp.status}: ${text.substring(0, 200)}`);
    return null;
  }
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  console.log("🔐 Login...");
  const token = await loginAPI();
  console.log("✅ Token obtido\n");

  // ===== BUSCAR FILIAIS =====
  console.log("📋 Buscando filiais...");
  const filiais = await apiGet(token, "/api/painel/filiais/simpleList");
  const filiaisArr = Array.isArray(filiais) ? filiais : filiais?.data ?? [];
  console.log(`Filiais (${filiaisArr.length}):`);
  filiaisArr.forEach(f => console.log(`  [${f.id}] ${f.fil_bairro}`));

  // ===== BUSCAR HISTÓRICO DPOTE EXISTENTE =====
  console.log("\n📊 Buscando histórico Dpote existente...");
  const historicoListResp = await apiPost(token, "/api/painel/dpote/historico/list", {
    data: null, rows: 10, totalRecords: 0, first: 0, last: 0, page: 0,
    loading: false, first_visit: true, globalFilter: null, mostrar_inativos: null,
  });
  const historicos = historicoListResp?.data?.data ?? [];
  console.log(`Históricos encontrados: ${historicos.length}`);
  
  if (historicos.length > 0) {
    const h = historicos[0];
    console.log(`Último histórico: ID=${h.id}, mes=${h.mes}, ano=${h.ano}, alterado=${h.alterado}`);
    
    // Buscar detalhes do histórico
    const detalhes = await apiGet(token, `/api/painel/dpote/historico/${h.id}`);
    console.log("\nDetalhes do histórico:", JSON.stringify(detalhes, null, 2));
    
    // Se o histórico já tem dados, usar esses dados
    if (detalhes?.faturamento?.valor_ganho_assinaturas > 0) {
      console.log("\n✅ Histórico já tem dados! Calculando comissão...");
      const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = detalhes.faturamento;
      let totalFichas = 0;
      const fichasPorFilial = {};
      
      for (const f of (detalhes.filiais_servicos ?? [])) {
        const fichas = (f.servicos ?? []).reduce((acc, s) => acc + (s.fichas || 0), 0);
        totalFichas += fichas;
        fichasPorFilial[f.filial.fil_bairro] = fichas;
        console.log(`  ${f.filial.fil_bairro}: ${fichas} fichas`);
      }
      
      console.log(`\nTotal fichas: ${totalFichas}`);
      console.log(`Valor assinaturas: R$ ${valor_ganho_assinaturas}`);
      console.log(`% barbearia: ${porcentagem_comissao_barbearias}%`);
      
      const comissaoBrutaTotal = valor_ganho_assinaturas * (porcentagem_comissao_barbearias / 100);
      console.log(`Comissão bruta total: R$ ${comissaoBrutaTotal}`);
      
      for (const [nome, fichas] of Object.entries(fichasPorFilial)) {
        if (totalFichas > 0) {
          const comissao = Math.round(comissaoBrutaTotal * (fichas / totalFichas));
          console.log(`  💰 ${nome}: R$ ${comissao} (${fichas}/${totalFichas} fichas = ${((fichas/totalFichas)*100).toFixed(1)}%)`);
        }
      }
      return;
    }
  }

  // ===== BUSCAR DADOS DE AGENDAMENTOS POR FILIAL =====
  console.log("\n📅 Buscando agendamentos por filial...");
  
  // Tentar relatório 15 por filial para obter quantidade de atendimentos
  const fichasPorFilial = {};
  
  for (const filial of filiaisArr) {
    try {
      const rel = await apiPost(token, "/api/painel/relatorios/15", {
        data_inicial: MES_INICIO,
        data_final: MES_FIM,
        filial: filial.id,
      });
      
      if (rel) {
        const servicos = rel?.servicos ?? [];
        const totalAtendimentos = servicos.reduce((acc, s) => acc + (s.count || 0), 0);
        fichasPorFilial[filial.id] = {
          nome: filial.fil_bairro,
          fichas: totalAtendimentos,
          servicos: servicos.length,
        };
        console.log(`  [${filial.id}] ${filial.fil_bairro}: ${totalAtendimentos} atendimentos`);
      }
    } catch (e) {
      console.log(`  [${filial.id}] ${filial.fil_bairro}: erro - ${e.message.substring(0, 60)}`);
    }
  }

  // ===== TENTAR ENDPOINT DE FICHAS DO DPOTE =====
  console.log("\n🎯 Tentando endpoints específicos do Dpote para fichas...");
  
  const dpoteEndpoints = [
    "/api/painel/dpote/fichas",
    "/api/painel/dpote/servicos",
    "/api/painel/dpote/atendimentos",
    "/api/painel/dpote/relatorio/fichas",
    "/api/painel/dpote/calcular",
  ];
  
  for (const ep of dpoteEndpoints) {
    try {
      const resp = await apiPost(token, ep, {
        data_inicio: MES_INICIO,
        data_fim: MES_FIM,
        mes: 3,
        ano: 2026,
      });
      if (resp) {
        console.log(`✅ ${ep}:`, JSON.stringify(resp)?.substring(0, 300));
      } else {
        console.log(`  ❌ ${ep}: null`);
      }
    } catch (e) {
      console.log(`  ❌ ${ep}: ${e.message.substring(0, 60)}`);
    }
  }

  // ===== CRIAR HISTÓRICO E PREENCHER VIA API =====
  console.log("\n📝 Criando novo histórico Dpote...");
  const novoId = await apiPost(token, "/api/painel/dpote/historico", {});
  console.log("Novo histórico ID:", novoId);
  
  if (typeof novoId === "number") {
    // Montar estrutura de filiais_servicos com fichas do relatório 15
    const filiaisServicos = filiaisArr.map(f => {
      const dados = fichasPorFilial[f.id];
      return {
        filial: { id: f.id, fil_bairro: f.fil_bairro },
        servicos: dados ? [{ fichas: dados.fichas }] : [{ fichas: 0 }],
      };
    });
    
    const payload = {
      faturamento: {
        valor_ganho_assinaturas: VALOR_ASSINATURAS,
        porcentagem_comissao_barbearias: PORCENTAGEM_BARBEARIA,
        porcentagem_comissao_barbeiros: 100 - PORCENTAGEM_BARBEARIA,
      },
      filiais_servicos: filiaisServicos,
      barbeiros_servicos: [],
    };
    
    console.log("\nPayload:", JSON.stringify(payload, null, 2));
    
    const resultado = await apiPost(token, `/api/painel/dpote/historico/${novoId}`, payload);
    console.log("\nResultado:", JSON.stringify(resultado, null, 2));
    
    if (Array.isArray(resultado)) {
      console.log("\n✅ COMISSÃO BRUTA POR FILIAL:");
      resultado.forEach(r => {
        const nome = r.filial?.fil_bairro ?? "?";
        const comissao = r.comissao_bruta_filial ?? r.comissao_bruta ?? 0;
        console.log(`  💰 ${nome}: R$ ${comissao}`);
      });
    }
  }
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
