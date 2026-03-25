/**
 * Script: Calcular fichas Dpote por filial usando agendamentos do CashBarber
 * 
 * O CashBarber usa fichas ponderadas: cada serviço tem um peso (ser_valor_fichas)
 * Total fichas filial = Σ(quantidade_atendimentos × ser_valor_fichas)
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

  // ===== BUSCAR HISTÓRICO DPOTE PARA OBTER ESTRUTURA DE SERVIÇOS =====
  console.log("\n📊 Buscando estrutura do histórico Dpote...");
  const historicoListResp = await apiPost(token, "/api/painel/dpote/historico/list", {
    data: null, rows: 10, totalRecords: 0, first: 0, last: 0, page: 0,
    loading: false, first_visit: true, globalFilter: null, mostrar_inativos: null,
  });
  const historicos = historicoListResp?.data?.data ?? [];
  
  let estruturaServicos = null;
  if (historicos.length > 0) {
    const detalhes = await apiGet(token, `/api/painel/dpote/historico/${historicos[0].id}`);
    estruturaServicos = detalhes?.filiais_servicos ?? [];
    console.log(`Estrutura com ${estruturaServicos.length} filiais`);
  }

  // ===== BUSCAR AGENDAMENTOS POR FILIAL VIA RELATÓRIO 15 =====
  console.log("\n📅 Buscando atendimentos por filial (relatório 15)...");
  
  const dadosPorFilial = {};
  
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
        dadosPorFilial[filial.id] = {
          nome: filial.fil_bairro,
          atendimentos: totalAtendimentos,
          servicos: servicos.map(s => ({ id: s.ags_id_servico, nome: s.ser_nome, count: s.count })),
        };
        console.log(`  [${filial.id}] ${filial.fil_bairro}: ${totalAtendimentos} atendimentos`);
        if (totalAtendimentos > 0) {
          servicos.filter(s => s.count > 0).forEach(s => {
            console.log(`    - ${s.ser_nome}: ${s.count} atendimentos`);
          });
        }
      }
    } catch (e) {
      console.log(`  [${filial.id}] ${filial.fil_bairro}: erro - ${e.message.substring(0, 60)}`);
    }
  }

  // ===== CALCULAR FICHAS USANDO PESO DOS SERVIÇOS =====
  console.log("\n🎯 Calculando fichas ponderadas por filial...");
  
  const fichasPorFilial = {};
  
  if (estruturaServicos) {
    for (const filialStruct of estruturaServicos) {
      const filialId = filialStruct.filial.id;
      const filialNome = filialStruct.filial.fil_bairro;
      const dadosFilial = dadosPorFilial[filialId];
      
      if (!dadosFilial) {
        fichasPorFilial[filialId] = { nome: filialNome, fichas: 0, servicos: [] };
        continue;
      }
      
      // Mapear atendimentos por ID de serviço
      const atendimentosPorServico = new Map(
        dadosFilial.servicos.map(s => [s.id, s.count])
      );
      
      let totalFichas = 0;
      const servicosComFichas = [];
      
      for (const servicoStruct of filialStruct.servicos) {
        const servico = servicoStruct.servico;
        const quantidade = atendimentosPorServico.get(servico.id) || 0;
        const fichasPorAtendimento = servico.ser_valor_fichas || 0;
        const fichasServico = quantidade * fichasPorAtendimento;
        totalFichas += fichasServico;
        
        if (quantidade > 0) {
          servicosComFichas.push({
            nome: servico.ser_nome,
            quantidade,
            fichasPorAtendimento,
            fichasTotal: fichasServico,
          });
        }
      }
      
      fichasPorFilial[filialId] = { nome: filialNome, fichas: totalFichas, servicos: servicosComFichas };
      console.log(`  [${filialId}] ${filialNome}: ${totalFichas} fichas`);
      servicosComFichas.forEach(s => {
        console.log(`    - ${s.nome}: ${s.quantidade} × ${s.fichasPorAtendimento} = ${s.fichasTotal} fichas`);
      });
    }
  }

  // ===== CALCULAR COMISSÃO BRUTA =====
  const totalFichasGeral = Object.values(fichasPorFilial).reduce((acc, f) => acc + f.fichas, 0);
  const comissaoBrutaTotal = VALOR_ASSINATURAS * (PORCENTAGEM_BARBEARIA / 100);
  
  console.log("\n\n💰 RESULTADO FINAL:");
  console.log(`Valor total assinaturas: R$ ${VALOR_ASSINATURAS.toLocaleString('pt-BR')}`);
  console.log(`% barbearia: ${PORCENTAGEM_BARBEARIA}%`);
  console.log(`Comissão bruta total: R$ ${comissaoBrutaTotal.toLocaleString('pt-BR')}`);
  console.log(`Total fichas (todas as filiais): ${totalFichasGeral}`);
  console.log();
  
  const resultados = {};
  for (const [filialId, dados] of Object.entries(fichasPorFilial)) {
    if (totalFichasGeral > 0 && dados.fichas > 0) {
      const comissao = Math.round(comissaoBrutaTotal * (dados.fichas / totalFichasGeral));
      const percentual = ((dados.fichas / totalFichasGeral) * 100).toFixed(1);
      resultados[dados.nome] = { comissao, fichas: dados.fichas, percentual };
      console.log(`  💰 ${dados.nome}:`);
      console.log(`     Fichas: ${dados.fichas} (${percentual}% do total)`);
      console.log(`     Comissão bruta: R$ ${comissao.toLocaleString('pt-BR')}`);
    } else {
      console.log(`  ⚠️  ${dados.nome}: sem fichas (0 atendimentos no período)`);
    }
  }

  // ===== ATUALIZAR HISTÓRICO DPOTE COM DADOS CORRETOS =====
  if (historicos.length > 0 && Object.keys(resultados).length > 0) {
    console.log("\n\n📝 Atualizando histórico Dpote com dados corretos...");
    
    const novaFiliaisServicos = estruturaServicos.map(filialStruct => {
      const filialId = filialStruct.filial.id;
      const dadosFilial = dadosPorFilial[filialId];
      const atendimentosPorServico = new Map(
        (dadosFilial?.servicos ?? []).map(s => [s.id, s.count])
      );
      
      return {
        filial: filialStruct.filial,
        servicos: filialStruct.servicos.map(servicoStruct => {
          const servico = servicoStruct.servico;
          const quantidade = atendimentosPorServico.get(servico.id) || 0;
          const fichas = quantidade * (servico.ser_valor_fichas || 0);
          return {
            ...servicoStruct,
            quantidade,
            fichas,
          };
        }),
      };
    });
    
    const payload = {
      faturamento: {
        valor_ganho_assinaturas: VALOR_ASSINATURAS,
        porcentagem_comissao_barbearias: PORCENTAGEM_BARBEARIA,
        porcentagem_comissao_barbeiros: 100 - PORCENTAGEM_BARBEARIA,
      },
      filiais_servicos: novaFiliaisServicos,
      barbeiros_servicos: [],
    };
    
    const resultado = await apiPost(token, `/api/painel/dpote/historico/${historicos[0].id}`, payload);
    console.log("Resultado da atualização:", JSON.stringify(resultado)?.substring(0, 500));
    
    if (Array.isArray(resultado) && resultado.length > 0) {
      console.log("\n✅ COMISSÃO BRUTA CALCULADA PELO CASHBARBER:");
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
