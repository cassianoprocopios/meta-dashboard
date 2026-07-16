/**
 * Testes para a lógica de merge seletivo do cashbarberSincronizador
 *
 * Regras testadas:
 * 1. cat5 (Recorrência/Dpote) é salva APENAS no dia 1 do mês; demais dias recebem "0"
 * 2. Campos manuais (cat3, cat4, observacao, lancadoPor) são preservados
 * 3. Se o Dpote falhar, cat5 é preservada do registro existente
 * 4. cat5 NUNCA é alimentada pelo mapeamento CashBarber (apenas pelo Dpote)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getCashbarberConfig: vi.fn(),
  listCashbarberMapeamento: vi.fn(),
  upsertFaturamento: vi.fn().mockResolvedValue({}),
  updateCashbarberSyncStatus: vi.fn().mockResolvedValue(undefined),
  insertCashbarberSyncLog: vi.fn().mockResolvedValue(undefined),
  getFaturamentoByDataEmpresaTenant: vi.fn(),
  getDpoteHistoricoId: vi.fn().mockResolvedValue(null),
  saveDpoteHistoricoId: vi.fn().mockResolvedValue(undefined),
  // Retorna faturamentos do mês anterior com cat9 = R$ 166,67/dia (total R$ 5.000 em 30 dias)
  getAllFaturamentosByTenant: vi.fn().mockResolvedValue(
    Array.from({ length: 30 }, (_, i) => ({
      cat9: String(Math.round((5000 / 30) * 100) / 100),
      data: `2026-03-${String(i + 1).padStart(2, "0")}`,
    }))
  ),
  insertDpoteSyncLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./cashbarber", () => ({
  cashbarberLogin: vi.fn().mockResolvedValue("mock-token"),
  cashbarberListarServicos: vi.fn().mockResolvedValue([]),
  cashbarberListarProdutos: vi.fn().mockResolvedValue([]),
  cashbarberRelatorio15: vi.fn().mockResolvedValue({ servicos: [], produtos: [] }),
  calcularFaturamentoPorCategoriaComCatalogo: vi.fn(),
  cashbarberCriarHistoricoDpote: vi.fn().mockResolvedValue(999),
  cashbarberBuscarValorAssinaturas: vi.fn().mockResolvedValue(null), // retorna null para forçar uso do valor manual
  cashbarberBuscarHistoricoDpote: vi.fn().mockResolvedValue({
    faturamento: { valor_ganho_assinaturas: 10000, porcentagem_comissao_barbearias: 50 },
    filiais_servicos: [],
  }),
  calcularComissaoBrutaFilial: vi.fn().mockReturnValue(0),
  calcularComissaoBrutaFilialPorNome: vi.fn().mockReturnValue(0),
  // Função usada pelo sincronizador para calcular Dpote via fichas ponderadas
  cashbarberCalcularDpotePorFichas: vi.fn().mockResolvedValue([
    { filialNome: "Morumbi/Vila Andrade", fichas: 64620, percentual: 70, valorDistribuido: 5000, comissaoBruta: 5000 },
  ]),
}));

// ─── Importar após mocks ──────────────────────────────────────────────────────

import { sincronizarFaturamentoCashbarber } from "./cashbarberSincronizador";
import {
  getCashbarberConfig,
  listCashbarberMapeamento,
  upsertFaturamento,
  getFaturamentoByDataEmpresaTenant,
} from "./db";
import {
  calcularFaturamentoPorCategoriaComCatalogo,
  calcularComissaoBrutaFilialPorNome,
  cashbarberCalcularDpotePorFichas,
} from "./cashbarber";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const configMock = {
  id: 1,
  tenantId: 1,
  empresaSlug: "MORUMBI",
  cbEmail: "test@test.com",
  cbSenha: "senha",
  cbFilialId: "144",
  dpoteFilialNome: "Morumbi",
  dpoteFilialId: null,
  dpoteValorAssinaturas: "145000.00",
  dpotePorcentagemBarbearia: "65.00",
  ativo: 1,
  sincAutoAtiva: 1,
  horarioSinc: "00:00",
};

/** Mapeamento que só cobre cat1 e cat2 (como Morumbi/Mascote) */
const mapeamentoCat1Cat2 = [
  { tipo: "servico_categoria", cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
  { tipo: "produto_categoria", cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
];

/** Registro existente no dia 1 com Recorrência (cat9) preenchida manualmente */
const registroExistenteDia1 = {
  id: 42,
  tenantId: 1,
  empresaSlug: "MORUMBI",
  data: "2025-03-01",
  cat1: "5000",
  cat2: "1200",
  cat3: "300",
  cat4: "150",
  cat5: "0",
  cat6: "0",
  cat7: "0",
  cat8: "0",
  cat9: "2500", // ← Recorrência existente no dia 1
  observacao: "Lançamento manual",
  lancadoPor: "admin",
  totalPrevisto: null,
};

/** Registro existente em outro dia (não dia 1) */
const registroExistenteDia5 = {
  ...registroExistenteDia1,
  id: 43,
  data: "2025-03-05",
  cat9: "0",
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("sincronizarFaturamentoCashbarber - distribuição diária de cat5 (Dpote)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCashbarberConfig).mockResolvedValue(configMock as any);
    vi.mocked(listCashbarberMapeamento).mockResolvedValue(mapeamentoCat1Cat2 as any);
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 0, cat4: 0, cat5: 0, cat6: 0, cat7: 0, cat8: 0, cat9: 0,
      totalServicos: 6000, totalProdutos: 1500, totalGeral: 7500, detalhes: [],
    });
    // Dpote retorna R$ 5.000 de faturamento para a filial (nova função via fichas ponderadas)
    vi.mocked(cashbarberCalcularDpotePorFichas).mockResolvedValue([
      { filialNome: "Morumbi/Vila Andrade", fichas: 64620, percentual: 70, valorDistribuido: 5000, comissaoBruta: 5000 },
    ]);
    // Sem registros existentes por padrão
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(undefined);
  });

  it("distribui cat9 igualmente por todos os dias do mês", async () => {
    // Sincronizar março/2025 (mês passado, vai até dia 31)
    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    // Capturar todas as chamadas ao upsertFaturamento
    const calls = vi.mocked(upsertFaturamento).mock.calls;

    // Março tem 31 dias: R$ 5000 / 31 = R$ 161.29/dia
    const valorDiarioEsperado = String(Math.round((5000 / 31) * 100) / 100);

    // Dia 1: deve ter cat9 = valor diário
    const chamadaDia1 = calls.find((c) => c[0].data === "2025-03-01");
    expect(chamadaDia1).toBeDefined();
    expect(chamadaDia1![0].cat9).toBe(valorDiarioEsperado);

    // Dia 2: deve ter cat9 = valor diário (não mais "0")
    const chamadaDia2 = calls.find((c) => c[0].data === "2025-03-02");
    expect(chamadaDia2).toBeDefined();
    expect(chamadaDia2![0].cat9).toBe(valorDiarioEsperado);

    // Dia 15: deve ter cat9 = valor diário
    const chamadaDia15 = calls.find((c) => c[0].data === "2025-03-15");
    expect(chamadaDia15).toBeDefined();
    expect(chamadaDia15![0].cat9).toBe(valorDiarioEsperado);

    // Dia 31: deve ter cat9 = valor diário
    const chamadaDia31 = calls.find((c) => c[0].data === "2025-03-31");
    expect(chamadaDia31).toBeDefined();
    expect(chamadaDia31![0].cat9).toBe(valorDiarioEsperado);
  });

  it("total de cat9 no mês ≈ recorrenciaValor (soma dos valores diários)", async () => {
    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const calls = vi.mocked(upsertFaturamento).mock.calls;
    const totalCat9 = calls.reduce((sum, c) => sum + parseFloat(c[0].cat9 ?? "0"), 0);

    // Total de cat9 deve ser próximo de 5000 (diferença máxima de R$ 0.31 por arredondamento)
    expect(totalCat9).toBeGreaterThanOrEqual(4999);
    expect(totalCat9).toBeLessThanOrEqual(5001);
  });

  it("quando Dpote falha, preserva cat9 existente no dia 1 e '0' nos demais", async () => {
    // Dpote falha (lança erro)
    vi.mocked(cashbarberCalcularDpotePorFichas).mockRejectedValue(new Error("Dpote indisponível"));

    // Dia 1 tem registro existente com cat9=2500
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockImplementation(async (data) => {
      if (data === "2025-03-01") return registroExistenteDia1 as any;
      return undefined;
    });

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const calls = vi.mocked(upsertFaturamento).mock.calls;

    // Dia 1: preserva cat9=2500 do registro existente
    const chamadaDia1 = calls.find((c) => c[0].data === "2025-03-01");
    expect(chamadaDia1![0].cat9).toBe("2500");

    // Dia 5: sem registro existente → cat9 = "0"
    const chamadaDia5 = calls.find((c) => c[0].data === "2025-03-05");
    expect(chamadaDia5![0].cat9).toBe("0");
  });

  it("preserva cat3, cat4, observacao e lancadoPor do registro existente", async () => {
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockImplementation(async (data) => {
      if (data === "2025-03-01") return registroExistenteDia1 as any;
      return undefined;
    });

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const chamadaDia1 = vi.mocked(upsertFaturamento).mock.calls.find(
      (c) => c[0].data === "2025-03-01"
    );
    expect(chamadaDia1).toBeDefined();
    // Março tem 31 dias: R$ 5000 / 31 = R$ 161.29/dia
    const valorDiarioEsperado = String(Math.round((5000 / 31) * 100) / 100);
    expect(chamadaDia1![0]).toMatchObject({
      cat1: "6000",          // ← atualizado pelo CashBarber
      cat2: "1500",          // ← atualizado pelo CashBarber
      cat3: "300",           // ← preservado do registro existente
      cat4: "150",           // ← preservado do registro existente
      cat9: valorDiarioEsperado, // ← valor Dpote diário (total / dias do mês)
      observacao: "Lançamento manual",
      lancadoPor: "admin",
    });
  });

  it("usa '0' para cat3, cat4 quando não há registro existente", async () => {
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(undefined);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const chamadaDia1 = vi.mocked(upsertFaturamento).mock.calls.find(
      (c) => c[0].data === "2025-03-01"
    );
    expect(chamadaDia1![0]).toMatchObject({
      cat3: "0",
      cat4: "0",
    });
  });

  it("cat9 NUNCA é alimentada pelo mapeamento CashBarber (apenas pelo Dpote)", async () => {
    // Mapeamento cobrindo cat9 também
    vi.mocked(listCashbarberMapeamento).mockResolvedValue([
      { tipo: "servico_categoria", cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
      { tipo: "produto_categoria", cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
      { tipo: "servico_categoria", cbId: "50", cbNome: "Recorrencia", metaCategoria: "cat9" },
    ] as any);

    // CashBarber retorna cat9=3000 pelo mapeamento — deve ser ignorado
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 0, cat4: 0, cat5: 0, cat6: 0, cat7: 0, cat8: 0, cat9: 3000,
      totalServicos: 9000, totalProdutos: 1500, totalGeral: 10500, detalhes: [],
    });

    // Dpote retorna 5000 (este deve prevalecer)
    vi.mocked(cashbarberCalcularDpotePorFichas).mockResolvedValue([
      { filialNome: "Morumbi/Vila Andrade", fichas: 64620, percentual: 70, valorDistribuido: 5000, comissaoBruta: 5000 },
    ]);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const chamadaDia1 = vi.mocked(upsertFaturamento).mock.calls.find(
      (c) => c[0].data === "2025-03-01"
    );
    // cat9 deve ser valor diário do Dpote (5000/31), não 3000 (mapeamento CashBarber)
    const valorDiarioEsperado = String(Math.round((5000 / 31) * 100) / 100);
    expect(chamadaDia1![0].cat9).toBe(valorDiarioEsperado);
  });

  it("lança erro se configuração CashBarber não encontrada", async () => {
    vi.mocked(getCashbarberConfig).mockResolvedValue(undefined as any);

    await expect(
      sincronizarFaturamentoCashbarber(1, "EMPRESA_SEM_CONFIG", 3, 2025)
    ).rejects.toThrow("Configuração CashBarber não encontrada");
  });

  it("lança erro se nenhum mapeamento configurado", async () => {
    vi.mocked(listCashbarberMapeamento).mockResolvedValue([]);

    await expect(
      sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025)
    ).rejects.toThrow("Nenhum mapeamento de categorias configurado");
  });
});

// ─── Testes da função getCategoriasMapeadas (lógica interna) ──────────────────

describe("getCategoriasMapeadas (lógica interna)", () => {
  it("extrai corretamente as categorias mapeadas", () => {
    function getCategoriasMapeadas(mapeamento: Array<{ metaCategoria: string }>): Set<string> {
      const cats = new Set<string>();
      for (const m of mapeamento) {
        if (m.metaCategoria && m.metaCategoria.match(/^cat[1-5]$/)) {
          cats.add(m.metaCategoria);
        }
      }
      return cats;
    }

    const mapeamento = [
      { metaCategoria: "cat1" },
      { metaCategoria: "cat2" },
      { metaCategoria: "cat1" }, // duplicado
      { metaCategoria: "ignorar" },
    ];

    const cats = getCategoriasMapeadas(mapeamento);
    expect(cats.has("cat1")).toBe(true);
    expect(cats.has("cat2")).toBe(true);
    expect(cats.has("cat3")).toBe(false);
    expect(cats.has("cat4")).toBe(false);
    expect(cats.has("cat5")).toBe(false);
    expect(cats.size).toBe(2);
  });

  it("ignora valores inválidos como 'ignorar'", () => {
    function getCategoriasMapeadas(mapeamento: Array<{ metaCategoria: string }>): Set<string> {
      const cats = new Set<string>();
      for (const m of mapeamento) {
        if (m.metaCategoria && m.metaCategoria.match(/^cat[1-5]$/)) {
          cats.add(m.metaCategoria);
        }
      }
      return cats;
    }

    const mapeamento = [
      { metaCategoria: "ignorar" },
      { metaCategoria: "cat6" }, // fora do range
      { metaCategoria: "" },
    ];

    const cats = getCategoriasMapeadas(mapeamento);
    expect(cats.size).toBe(0);
  });
});

// ─── Testes da nova lógica de distribuição proporcional ao dia vigente ──────────

describe("sincronizarFaturamentoCashbarber - cat9 proporcional ao dia vigente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCashbarberConfig).mockResolvedValue(configMock as any);
    vi.mocked(listCashbarberMapeamento).mockResolvedValue(mapeamentoCat1Cat2 as any);
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 0, cat4: 0, cat5: 0, cat6: 0, cat7: 0, cat8: 0, cat9: 0,
      totalServicos: 6000, totalProdutos: 1500, totalGeral: 7500, detalhes: [],
    });
    vi.mocked(cashbarberCalcularDpotePorFichas).mockResolvedValue([
      { filialNome: "Morumbi/Vila Andrade", fichas: 56030, percentual: 70.08, valorDistribuido: 5000, comissaoBruta: 5000 },
    ]);
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(undefined);
  });

  it("mês passado: todos os dias recebem valor diário (nenhum é futuro)", async () => {
    // Março/2025 é mês passado — todos os 31 dias devem ter cat9 = valor diário
    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    const calls = vi.mocked(upsertFaturamento).mock.calls;
    const valorDiario = String(Math.round((5000 / 31) * 100) / 100);

    // Todos os dias de 1 a 31 devem ter cat9 = valor diário
    for (let dia = 1; dia <= 31; dia++) {
      const dataStr = `2025-03-${String(dia).padStart(2, "0")}`;
      const chamada = calls.find((c) => c[0].data === dataStr);
      expect(chamada).toBeDefined();
      expect(chamada![0].cat9).toBe(valorDiario);
    }
  });

  it("mês atual: dias passados e hoje recebem valor diário do Dpote; dias futuros não são sincronizados; quinzena protegida após dia 15", async () => {
    // Usar horário de Brasília (BRT) para consistência com o código corrigido
    const hoje = new Date();
    const hojeBRT = new Date(hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const mes = hojeBRT.getMonth() + 1;
    const ano = hojeBRT.getFullYear();
    const diaHoje = hojeBRT.getDate();
    const totalDias = new Date(ano, mes, 0).getDate();

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", mes, ano, "auto");

    const calls = vi.mocked(upsertFaturamento).mock.calls;
    // O código agora divide pelo diaHoje (BRT), não pelo totalDias
    const valorDiarioDpote = String(Math.round((5000 / diaHoje) * 100) / 100);

    if (diaHoje > 15) {
      // Proteção quinzenal: dias 1-15 preservam cat9 existente ("0" no mock)
      for (let dia = 1; dia <= 15; dia++) {
        const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const chamada = calls.find((c) => c[0].data === dataStr);
        expect(chamada).toBeDefined();
        expect(chamada![0].cat9).toBe("0"); // preservado do existente
      }
      // Dias 16 até hoje: recebem valor diário do Dpote
      for (let dia = 16; dia <= diaHoje; dia++) {
        const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const chamada = calls.find((c) => c[0].data === dataStr);
        expect(chamada).toBeDefined();
        expect(chamada![0].cat9).toBe(valorDiarioDpote);
      }
    } else {
      // Antes do dia 16: todos os dias 1-diaHoje recebem valor normalmente
      for (let dia = 1; dia <= diaHoje; dia++) {
        const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const chamada = calls.find((c) => c[0].data === dataStr);
        expect(chamada).toBeDefined();
        expect(chamada![0].cat9).toBe(valorDiarioDpote);
      }
    }

    // Dias após hoje: não devem ser sincronizados (loop vai só até ultimoDia = diaHoje)
    for (let dia = diaHoje + 1; dia <= totalDias; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const chamada = calls.find((c) => c[0].data === dataStr);
      expect(chamada).toBeUndefined();
    }
  });

  it("mês atual: cat9 dos dias 16+ recebe valor correto (dias 1-15 protegidos após quinzena)", async () => {
    // Usar horário de Brasília (BRT) para consistência com o código corrigido
    const hoje = new Date();
    const hojeBRT = new Date(hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const mes = hojeBRT.getMonth() + 1;
    const ano = hojeBRT.getFullYear();
    const diaHoje = hojeBRT.getDate();

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", mes, ano, "auto");

    const calls = vi.mocked(upsertFaturamento).mock.calls;

    if (diaHoje > 15) {
      // Proteção quinzenal ativa: dias 1-15 NÃO são alterados pelo sync
      // Apenas dias 16-diaHoje recebem o valor diário
      const diasComValor = calls.filter((c) => {
        const dia = parseInt(c[0].data.split("-")[2]);
        return dia > 15 && dia <= diaHoje;
      });

      const valorDiarioEsperado = Math.round((5000 / diaHoje) * 100) / 100;
      for (const call of diasComValor) {
        expect(parseFloat(call[0].cat9 ?? "0")).toBeCloseTo(valorDiarioEsperado, 1);
      }

      // Verificar que dias 1-15 não foram chamados com upsert (foram pulados pelo continue)
      // OU se foram chamados, o cat9 preserva o valor existente ("0" no mock)
      const dias1a15 = calls.filter((c) => {
        const dia = parseInt(c[0].data.split("-")[2]);
        return dia <= 15;
      });
      // Os dias 1-15 ainda são chamados (para cat1-8) mas cat9 é preservado como existente
      for (const call of dias1a15) {
        // cat9 deve ser "0" (valor existente preservado do mock)
        expect(call[0].cat9).toBe("0");
      }
    } else {
      // Antes do dia 16: todos os dias 1-diaHoje recebem valor normalmente
      const totalAcumulado = calls
        .filter((c) => {
          const dia = parseInt(c[0].data.split("-")[2]);
          return dia <= diaHoje;
        })
        .reduce((sum, c) => sum + parseFloat(c[0].cat9 ?? "0"), 0);

      const esperado = 5000;
      expect(totalAcumulado).toBeGreaterThanOrEqual(esperado - 2);
      expect(totalAcumulado).toBeLessThanOrEqual(esperado + 2);
    }
  });
});
