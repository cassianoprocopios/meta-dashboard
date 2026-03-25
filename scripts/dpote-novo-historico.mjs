/**
 * Script: Criar novo histórico Dpote com ambas as filiais (Morumbi + Mascote)
 * e calcular comissão bruta por filial usando fichas ponderadas dos atendimentos
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
  });

  if (resp.status === 409) {
    const setCookie409 = resp.headers.get("set-cookie") ?? "";
    const m409 = setCookie409.match(/access_token_painel=([^;]+)/);
    if (m409) return m409[1];
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
  const filiais = await apiGet(token, "/api/painel/filiais/simpleList");
  const filiaisArr = Array.isArray(filiais) ? filiais : filiais?.data ?? [];
  console.log(`Filiais (${filiaisArr.length}):`);
  filiaisArr.forEach(f => console.log(`  [${f.id}] ${f.fil_bairro}`));

  // ===== BUSCAR CATÁLOGO DE SERVIÇOS =====
  console.log("\n📋 Buscando catálogo de serviços...");
  const servicosResp = await apiPost(token, "/api/painel/servicos/simpleList", {});
  const catalogoServicos = Array.isArray(servicosResp) ? servicosResp : servicosResp?.data ?? [];
  console.log(`Serviços no catálogo: ${catalogoServicos.length}`);
  
  // Mapear serviço ID → fichas por atendimento
  const fichasPorServico = new Map(
    catalogoServicos.map(s => [s.id, s.ser_valor_fichas || 0])
  );

  // ===== BUSCAR ATENDIMENTOS POR FILIAL =====
  console.log("\n📅 Buscando atendimentos por filial...");
  
  const atendimentosPorFilial = {};
  
  for (const filial of filiaisArr) {
    try {
      const rel = await apiPost(token, "/api/painel/relatorios/15", {
        data_inicial: MES_INICIO,
        data_final: MES_FIM,
        filial: filial.id,
      });
      
      if (rel?.servicos) {
        const servicos = rel.servicos;
        const totalAtendimentos = servicos.reduce((acc, s) => acc + (s.count || 0), 0);
        
        // Calcular fichas ponderadas
        let totalFichas = 0;
        const servicosComFichas = [];
        
        for (const s of servicos) {
          if (s.count > 0) {
            const fichasPorAtt = fichasPorServico.get(s.ags_id_servico) || 0;
            const fichasServico = s.count * fichasPorAtt;
            totalFichas += fichasServico;
            if (fichasServico > 0) {
              servicosComFichas.push({
                id: s.ags_id_servico,
                nome: s.ser_nome,
                count: s.count,
                fichasPorAtt,
                fichasTotal: fichasServico,
              });
            }
          }
        }
        
        atendimentosPorFilial[filial.id] = {
          nome: filial.fil_bairro,
          totalAtendimentos,
          totalFichas,
          servicos: servicosComFichas,
          servicosRaw: servicos,
        };
        
        console.log(`  [${filial.id}] ${filial.fil_bairro}: ${totalAtendimentos} atendimentos → ${totalFichas} fichas`);
        servicosComFichas.slice(0, 5).forEach(s => {
          console.log(`    - ${s.nome}: ${s.count} × ${s.fichasPorAtt} = ${s.fichasTotal} fichas`);
        });
        if (servicosComFichas.length > 5) {
          console.log(`    ... e mais ${servicosComFichas.length - 5} serviços`);
        }
      }
    } catch (e) {
      console.log(`  [${filial.id}] ${filial.fil_bairro}: erro - ${e.message.substring(0, 80)}`);
    }
  }

  // ===== CALCULAR COMISSÃO BRUTA =====
  const totalFichasGeral = Object.values(atendimentosPorFilial).reduce((acc, f) => acc + f.totalFichas, 0);
  const comissaoBrutaTotal = VALOR_ASSINATURAS * (PORCENTAGEM_BARBEARIA / 100);
  
  console.log("\n\n💰 RESULTADO FINAL:");
  console.log(`Valor total assinaturas: R$ ${VALOR_ASSINATURAS.toLocaleString('pt-BR')}`);
  console.log(`% barbearia: ${PORCENTAGEM_BARBEARIA}%`);
  console.log(`Comissão bruta total: R$ ${comissaoBrutaTotal.toLocaleString('pt-BR')}`);
  console.log(`Total fichas (todas as filiais): ${totalFichasGeral}`);
  console.log();
  
  const resultados = {};
  for (const [filialId, dados] of Object.entries(atendimentosPorFilial)) {
    if (totalFichasGeral > 0 && dados.totalFichas > 0) {
      const comissao = Math.round(comissaoBrutaTotal * (dados.totalFichas / totalFichasGeral));
      const percentual = ((dados.totalFichas / totalFichasGeral) * 100).toFixed(1);
      resultados[dados.nome] = { filialId, comissao, fichas: dados.totalFichas, percentual };
      console.log(`  💰 ${dados.nome}:`);
      console.log(`     Fichas: ${dados.totalFichas} (${percentual}% do total)`);
      console.log(`     Comissão bruta: R$ ${comissao.toLocaleString('pt-BR')}`);
    } else {
      console.log(`  ⚠️  ${dados.nome}: sem fichas`);
    }
  }

  // ===== CRIAR NOVO HISTÓRICO COM AMBAS AS FILIAIS =====
  console.log("\n\n📝 Criando novo histórico Dpote com ambas as filiais...");
  
  // Buscar estrutura do histórico existente para usar como template de serviços
  const historicoListResp = await apiPost(token, "/api/painel/dpote/historico/list", {
    data: null, rows: 10, totalRecords: 0, first: 0, last: 0, page: 0,
    loading: false, first_visit: true, globalFilter: null, mostrar_inativos: null,
  });
  const historicos = historicoListResp?.data?.data ?? [];
  
  let templateServicos = null;
  if (historicos.length > 0) {
    const detalhes = await apiGet(token, `/api/painel/dpote/historico/${historicos[0].id}`);
    // Usar a estrutura de serviços da filial Morumbi como template
    const filialMorumbi = detalhes?.filiais_servicos?.find(f => 
      f.filial.fil_bairro.toLowerCase().includes("morumbi")
    );
    if (filialMorumbi) {
      templateServicos = filialMorumbi.servicos.map(s => ({
        servico: s.servico,
        quantidade: 0,
        fichas: 0,
      }));
      console.log(`Template com ${templateServicos.length} serviços da filial Morumbi`);
    }
  }
  
  // Montar filiais_servicos com dados reais
  const filiaisServicosPayload = filiaisArr.map(filial => {
    const dados = atendimentosPorFilial[filial.id];
    
    // Criar lista de serviços com fichas calculadas
    let servicosPayload;
    
    if (templateServicos && dados) {
      // Mapear atendimentos por ID de serviço
      const atendMap = new Map(
        (dados.servicosRaw ?? []).map(s => [s.ags_id_servico, s.count])
      );
      
      servicosPayload = templateServicos.map(servicoTemplate => {
        const quantidade = atendMap.get(servicoTemplate.servico.id) || 0;
        const fichasPorAtt = fichasPorServico.get(servicoTemplate.servico.id) || servicoTemplate.servico.ser_valor_fichas || 0;
        const fichas = quantidade * fichasPorAtt;
        return {
          servico: servicoTemplate.servico,
          quantidade,
          fichas,
        };
      });
    } else if (dados) {
      // Sem template, usar apenas os serviços que têm atendimentos
      servicosPayload = dados.servicos.map(s => ({
        servico: { id: s.id, ser_nome: s.nome, ser_valor_fichas: s.fichasPorAtt },
        quantidade: s.count,
        fichas: s.fichasTotal,
      }));
    } else {
      servicosPayload = [];
    }
    
    return {
      filial: { id: filial.id, fil_bairro: filial.fil_bairro },
      servicos: servicosPayload,
    };
  });
  
  // Criar novo histórico
  const novoId = await apiPost(token, "/api/painel/dpote/historico", {});
  console.log("Novo histórico ID:", novoId);
  
  if (typeof novoId === "number") {
    const payload = {
      faturamento: {
        valor_ganho_assinaturas: VALOR_ASSINATURAS,
        porcentagem_comissao_barbearias: PORCENTAGEM_BARBEARIA,
        porcentagem_comissao_barbeiros: 100 - PORCENTAGEM_BARBEARIA,
      },
      filiais_servicos: filiaisServicosPayload,
      barbeiros_servicos: [],
    };
    
    console.log("\nEnviando payload com", filiaisServicosPayload.length, "filiais...");
    
    const resultado = await apiPost(token, `/api/painel/dpote/historico/${novoId}`, payload);
    
    if (Array.isArray(resultado) && resultado.length > 0) {
      console.log("\n✅ COMISSÃO BRUTA CALCULADA PELO CASHBARBER:");
      resultado.forEach(r => {
        const nome = r.filial?.fil_bairro ?? "?";
        const comissao = r.comissao_bruta_filial ?? r.comissao_bruta ?? 0;
        console.log(`  💰 ${nome}: R$ ${comissao}`);
      });
    } else {
      console.log("Resultado:", JSON.stringify(resultado)?.substring(0, 300));
      
      // Calcular manualmente com os dados que temos
      console.log("\n📊 Cálculo manual (baseado nos atendimentos do relatório 15):");
      for (const [nome, dados] of Object.entries(resultados)) {
        console.log(`  💰 ${nome}: R$ ${dados.comissao.toLocaleString('pt-BR')} (${dados.percentual}% das fichas)`);
      }
    }
  }
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
