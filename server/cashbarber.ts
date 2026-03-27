/**
 * Serviço de integração com a API do CashBarber
 *
 * A API do CashBarber usa autenticação via cookie httpOnly (access_token_painel).
 * O relatório 15 retorna serviços e produtos vendidos por período.
 * Os valores são inteiros em reais (ex: 32798 = R$ 32.798,00).
 */

interface CashbarberServico {
  ags_id_servico: number;
  ser_nome: string;
  sum: number;   // valor em reais (inteiro)
  count: number; // quantidade de atendimentos
}

interface CashbarberProduto {
  cop_id_produto: number;
  pro_nome: string;
  count: string; // quantidade (string na API)
  total: number; // valor em reais (inteiro)
}

interface CashbarberRelatorio15 {
  servicos: CashbarberServico[];
  produtos: CashbarberProduto[];
}

interface CashbarberFilial {
  id: number;
  fil_id_empresa: number;
  fil_email: string;
  fil_logradouro: string;
  fil_numero: string;
  fil_bairro: string;
  fil_cidade: string;
  fil_estado: string;
  fil_telefone: string;
  fil_active: number;
}

interface CashbarberCategoria {
  id: number;
  cat_nome: string;
  cat_type: "SERVICO" | "PRODUTO";
}

interface CashbarberServicoCatalogo {
  id: number;
  ser_id_categoria: number;
  ser_nome: string;
  ser_valor: number;
}

interface CashbarberProdutoCatalogo {
  id: number;
  pro_id_categoria: number;
  pro_nome: string;
  pro_valor: string;
}

/**
 * Faz login na API do CashBarber e retorna o token JWT.
 * Trata 409 Conflict (sessão já ativa) fazendo logout forçado e re-login.
 */
export async function cashbarberLogin(email: string, senha: string): Promise<string> {
  const resp = await fetch("https://api.cashbarber.com.br/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha, ctx: "painel" }),
  });

  // 409 Conflict = sessão já ativa em outro dispositivo
  // Tentar extrair token do cookie da resposta 409; se não vier, forçar logout e re-login
  if (resp.status === 409) {
    const setCookieHeader409 = resp.headers.get("set-cookie") || "";
    const tokenMatch409 = setCookieHeader409.match(/access_token_painel=([^;]+)/);
    if (tokenMatch409) return tokenMatch409[1];

    // Forçar logout da sessão ativa
    await fetch("https://api.cashbarber.com.br/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ctx: "painel" }),
    }).catch(() => {}); // ignorar erro do logout

    // Aguardar 1 segundo e tentar novamente
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const resp2 = await fetch("https://api.cashbarber.com.br/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, ctx: "painel" }),
    });
    if (!resp2.ok) {
      throw new Error(`CashBarber re-login falhou após logout: ${resp2.status} ${resp2.statusText}`);
    }
    const setCookieHeader2 = resp2.headers.get("set-cookie") || "";
    const tokenMatch2 = setCookieHeader2.match(/access_token_painel=([^;]+)/);
    if (!tokenMatch2) {
      throw new Error("CashBarber: token não encontrado após re-login");
    }
    return tokenMatch2[1];
  }

  if (!resp.ok) {
    throw new Error(`CashBarber login falhou: ${resp.status} ${resp.statusText}`);
  }

  // O token está no cookie httpOnly da resposta
  const setCookieHeader = resp.headers.get("set-cookie") || "";
  const tokenMatch = setCookieHeader.match(/access_token_painel=([^;]+)/);
  if (!tokenMatch) {
    throw new Error("CashBarber: token não encontrado na resposta de login");
  }

  return tokenMatch[1];
}

/**
 * Busca as filiais disponíveis no CashBarber
 */
export async function cashbarberListarFiliais(token: string): Promise<CashbarberFilial[]> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/filiais/simpleList", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(`CashBarber listarFiliais falhou: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Busca as categorias de serviços e produtos do CashBarber
 */
export async function cashbarberListarCategorias(token: string): Promise<CashbarberCategoria[]> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/categorias/simpleList", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber listarCategorias falhou: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Busca o catálogo de serviços do CashBarber
 */
export async function cashbarberListarServicos(token: string): Promise<CashbarberServicoCatalogo[]> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/servicos/simpleList", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber listarServicos falhou: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Busca o catálogo de produtos do CashBarber
 */
export async function cashbarberListarProdutos(token: string): Promise<CashbarberProdutoCatalogo[]> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/produtos/simpleList", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber listarProdutos falhou: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Busca o relatório 15 (Vendas por serviço/produto) do CashBarber
 * @param token - Token JWT de autenticação
 * @param dataInicial - Data inicial no formato YYYY-MM-DD
 * @param dataFinal - Data final no formato YYYY-MM-DD
 * @param filialId - ID da filial (opcional, null = todas as filiais)
 */
export async function cashbarberRelatorio15(
  token: string,
  dataInicial: string,
  dataFinal: string,
  filialId?: number | null,
  barbeiroId?: number | null
): Promise<CashbarberRelatorio15> {
  const body: Record<string, unknown> = { data_inicial: dataInicial, data_final: dataFinal };
  if (filialId) body.filial = filialId;
  if (barbeiroId) body.barbeiro = barbeiroId;

  const resp = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/15", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber relatorio15 falhou: ${resp.status}`);
  }

  return resp.json();
}

/**
 * Calcula o faturamento por categoria Meta Dashboard a partir dos dados do CashBarber
 *
 * @param relatorio - Dados do relatório 15 do CashBarber
 * @param mapeamento - Mapeamento de categorias CashBarber → Meta Dashboard
 * @param categoriasCB - Catálogo de categorias do CashBarber (para resolver nomes)
 * @returns Objeto com valores por categoria (cat1..cat5)
 */
export function calcularFaturamentoPorCategoria(
  relatorio: CashbarberRelatorio15,
  mapeamento: Array<{
    tipo: string;
    cbId: string;
    cbNome: string;
    metaCategoria: string;
  }>,
  categoriasCB: CashbarberCategoria[]
): {
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  cat5: number;
  cat6: number;
  cat7: number;
  cat8: number;
  cat9: number;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  detalhes: Array<{ nome: string; valor: number; categoria: string }>;
} {
  const catMap = new Map<number, string>(categoriasCB.map((c) => [c.id, c.cat_nome]));

  // Construir mapa de mapeamento: cbId → metaCategoria
  const mapaServicoCat = new Map<string, string>(); // categoria_id → metaCategoria
  const mapaServicoPorId = new Map<string, string>(); // servico_id → metaCategoria
  const mapaProdutoCat = new Map<string, string>(); // categoria_id → metaCategoria
  const mapaProdutoPorId = new Map<string, string>(); // produto_id → metaCategoria

  for (const m of mapeamento) {
    if (m.tipo === "servico_categoria") mapaServicoCat.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "servico_id") mapaServicoPorId.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "produto_categoria") mapaProdutoCat.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "produto_id") mapaProdutoPorId.set(m.cbId, m.metaCategoria);
  }

  const resultado = { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0, cat6: 0, cat7: 0, cat8: 0, cat9: 0 };
  const detalhes: Array<{ nome: string; valor: number; categoria: string }> = [];

  // Processar serviços
  let totalServicos = 0;
  for (const s of relatorio.servicos) {
    const valor = s.sum; // já em reais (inteiro)
    totalServicos += valor;

    // Prioridade: mapeamento por ID > mapeamento por categoria
    const metaCat =
      mapaServicoPorId.get(String(s.ags_id_servico)) ||
      // Precisamos do cat_id do serviço, mas o relatório 15 não retorna isso
      // Usamos o mapeamento por nome de categoria se disponível
      "cat1"; // fallback padrão

    if (metaCat !== "ignorar" && metaCat in resultado) {
      (resultado as any)[metaCat] += valor;
    }
    detalhes.push({ nome: s.ser_nome, valor, categoria: metaCat });
  }

  // Processar produtos
  let totalProdutos = 0;
  for (const p of relatorio.produtos) {
    const valor = p.total; // já em reais (inteiro)
    totalProdutos += valor;

    const metaCat = mapaProdutoPorId.get(String(p.cop_id_produto)) || "cat2"; // fallback para cat2 (produtos)

    if (metaCat !== "ignorar" && metaCat in resultado) {
      (resultado as any)[metaCat] += valor;
    }
    detalhes.push({ nome: p.pro_nome, valor, categoria: metaCat });
  }

  return {
    ...resultado,
    totalServicos,
    totalProdutos,
    totalGeral: totalServicos + totalProdutos,
    detalhes,
  };
}

/**
 * Calcula o faturamento usando mapeamento por categoria (mais preciso)
 * Requer o catálogo de serviços para resolver o cat_id de cada serviço
 */
export function calcularFaturamentoPorCategoriaComCatalogo(
  relatorio: CashbarberRelatorio15,
  mapeamento: Array<{
    tipo: string;
    cbId: string;
    cbNome: string;
    metaCategoria: string;
  }>,
  catalogoServicos: CashbarberServicoCatalogo[],
  catalogoProdutos: CashbarberProdutoCatalogo[]
): {
  cat1: number;
  cat2: number;
  cat3: number;
  cat4: number;
  cat5: number;
  cat6: number;
  cat7: number;
  cat8: number;
  cat9: number;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  detalhes: Array<{ nome: string; valor: number; categoria: string; tipo: string }>;
} {
  // Construir mapa de mapeamento
  const mapaServicoCat = new Map<string, string>(); // categoria_id → metaCategoria
  const mapaServicoPorId = new Map<string, string>(); // servico_id → metaCategoria
  const mapaProdutoCat = new Map<string, string>(); // categoria_id → metaCategoria
  const mapaProdutoPorId = new Map<string, string>(); // produto_id → metaCategoria

  for (const m of mapeamento) {
    if (m.tipo === "servico_categoria") mapaServicoCat.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "servico_id") mapaServicoPorId.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "produto_categoria") mapaProdutoCat.set(m.cbId, m.metaCategoria);
    else if (m.tipo === "produto_id") mapaProdutoPorId.set(m.cbId, m.metaCategoria);
  }

  // Mapear serviços do catálogo: id → cat_id
  const servicoCatMap = new Map<number, number>(
    catalogoServicos.map((s) => [s.id, s.ser_id_categoria])
  );

  // Mapear produtos do catálogo: id → cat_id
  const produtoCatMap = new Map<number, number>(
    catalogoProdutos.map((p) => [p.id, p.pro_id_categoria])
  );

  const resultado = { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0, cat6: 0, cat7: 0, cat8: 0, cat9: 0 };
  const detalhes: Array<{ nome: string; valor: number; categoria: string; tipo: string }> = [];

  // Processar serviços
  let totalServicos = 0;
  for (const s of relatorio.servicos) {
    const valor = s.sum;
    totalServicos += valor;

    // Prioridade: por ID > por categoria
    let metaCat = mapaServicoPorId.get(String(s.ags_id_servico));
    if (!metaCat) {
      const catId = servicoCatMap.get(s.ags_id_servico);
      if (catId) metaCat = mapaServicoCat.get(String(catId));
    }
    metaCat = metaCat || "cat1"; // fallback

    if (metaCat !== "ignorar" && metaCat in resultado) {
      (resultado as any)[metaCat] += valor;
    }
    detalhes.push({ nome: s.ser_nome, valor, categoria: metaCat, tipo: "servico" });
  }

  // Processar produtos
  let totalProdutos = 0;
  for (const p of relatorio.produtos) {
    const valor = p.total;
    totalProdutos += valor;

    // Prioridade: por ID > por categoria
    let metaCat = mapaProdutoPorId.get(String(p.cop_id_produto));
    if (!metaCat) {
      const catId = produtoCatMap.get(p.cop_id_produto);
      if (catId) metaCat = mapaProdutoCat.get(String(catId));
    }
    metaCat = metaCat || "cat2"; // fallback para produtos

    if (metaCat !== "ignorar" && metaCat in resultado) {
      (resultado as any)[metaCat] += valor;
    }
    detalhes.push({ nome: p.pro_nome, valor, categoria: metaCat, tipo: "produto" });
  }

  return {
    ...resultado,
    totalServicos,
    totalProdutos,
    totalGeral: totalServicos + totalProdutos,
    detalhes,
  };
}

// ─── DPOTE / ASSINATURAS ──────────────────────────────────────────────────────

export interface CashbarberDpoteFilialServico {
  filial: {
    id: number;
    fil_bairro: string;
  };
  servicos: Array<{ fichas: number; [key: string]: unknown }>;
}

export interface CashbarberDpoteHistorico {
  faturamento: {
    valor_ganho_assinaturas: number;
    porcentagem_comissao_barbearias: number;
    porcentagem_comissao_barbeiros: number;
  };
  filiais_servicos: CashbarberDpoteFilialServico[];
}

/**
 * Cria um novo histórico Dpote no CashBarber para o mês/ano atual.
 * Retorna o ID do histórico criado.
 */
export async function cashbarberCriarHistoricoDpote(token: string): Promise<number> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/dpote/historico", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    throw new Error(`CashBarber criarHistoricoDpote falhou: ${resp.status} ${resp.statusText}`);
  }
  const id = await resp.json();
  if (typeof id !== "number") {
    throw new Error(`CashBarber criarHistoricoDpote: resposta inesperada: ${JSON.stringify(id)}`);
  }
  return id;
}

/**
 * Busca os dados de um histórico Dpote pelo ID.
 */
export async function cashbarberBuscarHistoricoDpote(
  token: string,
  historicoId: number
): Promise<CashbarberDpoteHistorico> {
  const resp = await fetch(
    `https://api.cashbarber.com.br/api/painel/dpote/historico/${historicoId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) {
    throw new Error(`CashBarber buscarHistoricoDpote falhou: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * Busca o valor real de assinaturas (valor_ganho_assinaturas) de um histórico Dpote
 * diretamente da API do CashBarber, usando o ID do histórico salvo no banco.
 *
 * Retorna o valor em reais (número inteiro, ex: 63845 = R$ 63.845,00).
 * Retorna null se o histórico não existir ou a API retornar erro.
 *
 * @param token - Token JWT do CashBarber
 * @param historicoId - ID do histórico Dpote (salvo em cashbarberConfig.dpoteHistoricoId)
 */
export async function cashbarberBuscarValorAssinaturas(
  token: string,
  historicoId: number,
  // Injetável para facilitar testes (default: cashbarberBuscarHistoricoDpote)
  _buscarHistorico: (token: string, id: number) => Promise<CashbarberDpoteHistorico> = cashbarberBuscarHistoricoDpote
): Promise<{ valorAssinaturas: number; porcentagemBarbearia: number } | null> {
  try {
    const historico = await _buscarHistorico(token, historicoId);
    const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = historico.faturamento;
    if (typeof valor_ganho_assinaturas !== "number" || valor_ganho_assinaturas <= 0) {
      return null;
    }
    return {
      valorAssinaturas: valor_ganho_assinaturas,
      porcentagemBarbearia: porcentagem_comissao_barbearias,
    };
  } catch {
    return null;
  }
}

/**
 * Calcula a Comissão Bruta de uma filial específica a partir dos dados do histórico Dpote.
 *
 * Fórmula: valor_total × porcentagem_barbearia% × (fichas_filial / fichas_total)
 *
 * @param historico - Dados do histórico Dpote
 * @param filialId - ID da filial no CashBarber
 * @returns Valor da comissão bruta da filial em reais (inteiro)
 */
export function calcularComissaoBrutaFilial(
  historico: CashbarberDpoteHistorico,
  filialId: number
): number {
  const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = historico.faturamento;

  // Calcular total de fichas de todas as filiais
  let totalFichas = 0;
  let fichasFilial = 0;
  for (const f of historico.filiais_servicos) {
    const fichas = f.servicos.reduce((acc, s) => acc + (s.fichas || 0), 0);
    totalFichas += fichas;
    if (f.filial.id === filialId) {
      fichasFilial = fichas;
    }
  }

  if (totalFichas === 0 || fichasFilial === 0) return 0;

  // Distribui 100% do valor total de assinaturas proporcional às fichas da filial
  const comissaoFilial = valor_ganho_assinaturas * (fichasFilial / totalFichas);

  // Arredondar para inteiro (valores em reais)
  return Math.round(comissaoFilial);
}

/**
 * Calcula a Comissão Bruta de uma filial identificada pelo NOME (busca parcial, case-insensitive).
 *
 * Busca a filial cujo campo `fil_bairro` contém o nome informado.
 * Útil quando o ID numérico da filial não está disponível.
 *
 * @param historico - Dados do histórico Dpote
 * @param filialNome - Nome (ou parte do nome) da filial, ex: 'Morumbi', 'Mascote'
 * @returns Valor da comissão bruta da filial em reais (inteiro), ou 0 se não encontrada
 */
export function calcularComissaoBrutaFilialPorNome(
  historico: CashbarberDpoteHistorico,
  filialNome: string
): number {
  const nomeBusca = filialNome.trim().toLowerCase();
  // Retornar 0 imediatamente se o nome for vazio após trim
  if (!nomeBusca) return 0;

  const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = historico.faturamento;

  // Calcular total de fichas de todas as filiais
  let totalFichas = 0;
  let fichasFilial = 0;
  for (const f of historico.filiais_servicos) {
    const fichas = f.servicos.reduce((acc, s) => acc + (s.fichas || 0), 0);
    totalFichas += fichas;
    // Busca parcial, case-insensitive no campo fil_bairro
    if (f.filial.fil_bairro && f.filial.fil_bairro.toLowerCase().includes(nomeBusca)) {
      fichasFilial = fichas;
    }
  }

  if (totalFichas === 0 || fichasFilial === 0) return 0;

  // Distribui 100% do valor total de assinaturas proporcional às fichas da filial
  const comissaoFilial = valor_ganho_assinaturas * (fichasFilial / totalFichas);

  // Arredondar para inteiro (valores em reais)
  return Math.round(comissaoFilial);
}

/**
 * Interface para resultado do cálculo Dpote por fichas ponderadas
 */
export interface DpoteResultadoPorFilial {
  filialId: number;
  filialNome: string;
  fichas: number;
  percentual: number;
  /** Valor distribuído para esta filial (100% das assinaturas × proporção de fichas) */
  valorDistribuido: number;
  /** @deprecated use valorDistribuido */
  comissaoBruta: number;
}

/**
 * Calcula a distribuição do Dpote por filial usando fichas ponderadas dos atendimentos.
 *
 * Distribui 100% do valor de assinaturas proporcionalmente às fichas de cada filial.
 * Não aplica desconto de comissão — o valor total é o faturamento de recorrência.
 *
 * @param token - Token JWT do CashBarber
 * @param dataInicial - Data inicial no formato YYYY-MM-DD
 * @param dataFinal - Data final no formato YYYY-MM-DD
 * @param valorAssinaturas - Valor total de assinaturas a distribuir (100%)
 * @param porcentagemBarbearia - Parâmetro mantido por compatibilidade (ignorado no cálculo)
 * @returns Valor distribuído para cada filial em reais
 */
export async function cashbarberCalcularDpotePorFichas(
  token: string,
  dataInicial: string,
  dataFinal: string,
  valorAssinaturas: number,
  porcentagemBarbearia: number
): Promise<DpoteResultadoPorFilial[]> {
  // 1. Buscar filiais
  const filiais = await cashbarberListarFiliais(token);
  if (!filiais || filiais.length === 0) return [];

  // 2. Buscar catálogo de serviços para obter fichas por serviço
  const catalogoServicos = await cashbarberListarServicos(token);
  const fichasPorServicoId = new Map<number, number>(
    catalogoServicos.map((s) => [s.id, (s as any).ser_valor_fichas || 0])
  );

  // 3. Para cada filial, buscar atendimentos e calcular fichas ponderadas
  const fichasPorFilial: Array<{ filial: CashbarberFilial; fichas: number }> = [];

  for (const filial of filiais) {
    try {
      const relatorio = await cashbarberRelatorio15(token, dataInicial, dataFinal, filial.id);
      let totalFichas = 0;
      for (const s of relatorio.servicos) {
        const fichasPorAtt = fichasPorServicoId.get(s.ags_id_servico) || 0;
        totalFichas += s.count * fichasPorAtt;
      }
      fichasPorFilial.push({ filial, fichas: totalFichas });
    } catch {
      // Se falhar para uma filial, continuar com as demais
      fichasPorFilial.push({ filial, fichas: 0 });
    }
  }

  // 4. Distribuir 100% das assinaturas proporcionalmente por fichas
  const totalFichasGeral = fichasPorFilial.reduce((acc, f) => acc + f.fichas, 0);

  return fichasPorFilial.map(({ filial, fichas }) => {
    const percentual = totalFichasGeral > 0 ? (fichas / totalFichasGeral) * 100 : 0;
    const valorDistribuido =
      totalFichasGeral > 0 && fichas > 0
        ? Math.round(valorAssinaturas * (fichas / totalFichasGeral))
        : 0;
    return {
      filialId: filial.id,
      filialNome: filial.fil_bairro,
      fichas,
      percentual,
      valorDistribuido,
      comissaoBruta: valorDistribuido, // alias para compatibilidade
    };
  });
}

/**
 * Busca o histórico Dpote mais recente com dados válidos (fichas > 0).
 * Começa pelo idInicial e vai decrementando até encontrar um com fichas preenchidas.
 */
export async function cashbarberBuscarHistoricoAtivo(
  token: string,
  idInicial: number,
  maxTentativas = 60
): Promise<{ historicoId: number; historico: CashbarberDpoteHistorico } | null> {
  // Limiar mínimo de fichas para considerar um histórico como completo do mês.
  // Históricos parciais (poucos dias) têm poucas fichas e devem ser ignorados.
  const MIN_FICHAS = 10000;

  for (let i = 0; i < maxTentativas; i++) {
    const id = idInicial - i;
    if (id <= 0) break;
    try {
      const historico = await cashbarberBuscarHistoricoDpote(token, id);
      const totalFichas = historico.filiais_servicos.reduce(
        (acc, fs) => acc + fs.servicos.reduce((a, s) => a + (s.fichas || 0), 0),
        0
      );
      // Exige fichas acima do limiar para garantir que é um histórico mensal completo
      if (totalFichas >= MIN_FICHAS && historico.faturamento.valor_ganho_assinaturas > 0) {
        return { historicoId: id, historico };
      }
    } catch {
      // ID inválido ou sem acesso — continuar
    }
  }
  return null;
}

/**
 * Calcula a distribuição Dpote diretamente a partir do histórico Dpote oficial do CashBarber.
 * Usa o histórico mais recente com fichas > 0 (buscado via cashbarberBuscarHistoricoAtivo).
 */
export async function cashbarberCalcularDpoteViaHistorico(
  token: string,
  idHistoricoRecente: number
): Promise<{
  historicoId: number;
  valorAssinaturas: number;
  porcentagemBarbearias: number;
  totalFichas: number;
  filiais: DpoteResultadoPorFilial[];
} | null> {
  const resultado = await cashbarberBuscarHistoricoAtivo(token, idHistoricoRecente);
  if (!resultado) return null;

  const { historicoId, historico } = resultado;
  const { valor_ganho_assinaturas, porcentagem_comissao_barbearias } = historico.faturamento;
  // Distribui 100% do valor total de assinaturas entre as filiais
  const valorTotalDistribuir = valor_ganho_assinaturas;

  let totalFichas = 0;
  const filiaisComFichas = historico.filiais_servicos.map((fs) => {
    const fichas = fs.servicos.reduce((acc, s) => acc + (s.fichas || 0), 0);
    totalFichas += fichas;
    return { filial: fs.filial, fichas };
  });

  const filiais: DpoteResultadoPorFilial[] = filiaisComFichas.map(({ filial, fichas }) => {
    const percentual = totalFichas > 0 ? (fichas / totalFichas) * 100 : 0;
    const valorDistribuido =
      totalFichas > 0 && fichas > 0
        ? Math.round(valorTotalDistribuir * (fichas / totalFichas))
        : 0;
    return {
      filialId: filial.id,
      filialNome: filial.fil_bairro,
      fichas,
      percentual,
      valorDistribuido,
      comissaoBruta: valorDistribuido,
    };
  });

  return {
    historicoId,
    valorAssinaturas: valor_ganho_assinaturas,
    porcentagemBarbearias: porcentagem_comissao_barbearias,
    totalFichas,
    filiais,
  };
}
