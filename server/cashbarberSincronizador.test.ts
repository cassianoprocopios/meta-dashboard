/**
 * Testes para a lógica de merge seletivo do cashbarberSincronizador
 *
 * Garante que campos manuais (ex: Recorrência = cat5) são preservados
 * quando o CashBarber só mapeia cat1 e cat2.
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
}));

vi.mock("./cashbarber", () => ({
  cashbarberLogin: vi.fn().mockResolvedValue("mock-token"),
  cashbarberListarServicos: vi.fn().mockResolvedValue([]),
  cashbarberListarProdutos: vi.fn().mockResolvedValue([]),
  cashbarberRelatorio15: vi.fn().mockResolvedValue({ servicos: [], produtos: [] }),
  calcularFaturamentoPorCategoriaComCatalogo: vi.fn(),
}));

// ─── Importar após mocks ──────────────────────────────────────────────────────

import { sincronizarFaturamentoCashbarber } from "./cashbarberSincronizador";
import {
  getCashbarberConfig,
  listCashbarberMapeamento,
  upsertFaturamento,
  getFaturamentoByDataEmpresaTenant,
} from "./db";
import { calcularFaturamentoPorCategoriaComCatalogo } from "./cashbarber";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const configMock = {
  id: 1,
  tenantId: 1,
  empresaSlug: "MORUMBI",
  cbEmail: "test@test.com",
  cbSenha: "senha",
  cbFilialId: "144",
  ativo: 1,
  sincAutoAtiva: 1,
  horarioSinc: "00:00",
};

/** Mapeamento que só cobre cat1 e cat2 (como Morumbi/Mascote) */
const mapeamentoCat1Cat2 = [
  { tipo: "servico_categoria", cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
  { tipo: "produto_categoria", cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
];

/** Registro existente com Recorrência (cat5) preenchida manualmente */
const registroExistenteMock = {
  id: 42,
  tenantId: 1,
  empresaSlug: "MORUMBI",
  data: "2025-03-01",
  cat1: "5000",
  cat2: "1200",
  cat3: "300",
  cat4: "150",
  cat5: "2500", // ← Recorrência lançada manualmente
  observacao: "Lançamento manual",
  lancadoPor: "admin",
  totalPrevisto: null,
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("sincronizarFaturamentoCashbarber - merge seletivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCashbarberConfig).mockResolvedValue(configMock as any);
    vi.mocked(listCashbarberMapeamento).mockResolvedValue(mapeamentoCat1Cat2 as any);
  });

  it("preserva cat5 (Recorrência) quando CashBarber só mapeia cat1 e cat2", async () => {
    // CashBarber retorna: cat1=6000, cat2=1500, cat3=0, cat4=0, cat5=0
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 0, cat4: 0, cat5: 0,
      totalServicos: 6000, totalProdutos: 1500, totalGeral: 7500, detalhes: [],
    });

    // Registro existente com cat5=2500 (Recorrência manual)
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(registroExistenteMock as any);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    // Verificar que upsertFaturamento foi chamado preservando cat5
    expect(upsertFaturamento).toHaveBeenCalledWith(
      expect.objectContaining({
        cat1: "6000",    // ← atualizado pelo CashBarber
        cat2: "1500",    // ← atualizado pelo CashBarber
        cat3: "300",     // ← preservado do registro existente
        cat4: "150",     // ← preservado do registro existente
        cat5: "2500",    // ← preservado (Recorrência manual)
      })
    );
  });

  it("preserva observacao e lancadoPor do registro existente", async () => {
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 0, cat4: 0, cat5: 0,
      totalServicos: 6000, totalProdutos: 1500, totalGeral: 7500, detalhes: [],
    });
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(registroExistenteMock as any);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    expect(upsertFaturamento).toHaveBeenCalledWith(
      expect.objectContaining({
        observacao: "Lançamento manual",
        lancadoPor: "admin",
      })
    );
  });

  it("usa '0' para campos não mapeados quando não há registro existente", async () => {
    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 4000, cat2: 800, cat3: 0, cat4: 0, cat5: 0,
      totalServicos: 4000, totalProdutos: 800, totalGeral: 4800, detalhes: [],
    });

    // Sem registro existente (novo dia)
    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(undefined);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    expect(upsertFaturamento).toHaveBeenCalledWith(
      expect.objectContaining({
        cat1: "4000",
        cat2: "800",
        cat3: "0",  // ← sem registro existente, usa "0"
        cat4: "0",
        cat5: "0",
      })
    );
  });

  it("quando todos os campos são mapeados, sobrescreve tudo", async () => {
    // Mapeamento cobrindo todas as categorias
    vi.mocked(listCashbarberMapeamento).mockResolvedValue([
      { tipo: "servico_categoria", cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
      { tipo: "produto_categoria", cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
      { tipo: "servico_categoria", cbId: "20", cbNome: "Extra", metaCategoria: "cat3" },
      { tipo: "servico_categoria", cbId: "40", cbNome: "Lavatorio", metaCategoria: "cat4" },
      { tipo: "servico_categoria", cbId: "50", cbNome: "Recorrencia", metaCategoria: "cat5" },
    ] as any);

    vi.mocked(calcularFaturamentoPorCategoriaComCatalogo).mockReturnValue({
      cat1: 6000, cat2: 1500, cat3: 200, cat4: 100, cat5: 3000,
      totalServicos: 9300, totalProdutos: 1500, totalGeral: 10800, detalhes: [],
    });

    vi.mocked(getFaturamentoByDataEmpresaTenant).mockResolvedValue(registroExistenteMock as any);

    await sincronizarFaturamentoCashbarber(1, "MORUMBI", 3, 2025, "auto");

    // Todos os campos são sobrescritos pelo CashBarber
    expect(upsertFaturamento).toHaveBeenCalledWith(
      expect.objectContaining({
        cat1: "6000",
        cat2: "1500",
        cat3: "200",
        cat4: "100",
        cat5: "3000",  // ← sobrescrito pelo CashBarber (mapeado)
      })
    );
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
    // Simular a lógica interna
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
