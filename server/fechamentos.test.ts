import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import {
  classificarViabilidadeNecessidadeDiaria,
  contarDiasFuncionamentoNoIntervalo,
} from "../shared/calendarioFuncionamento";

const {
  criarFechamentoUnidadeMock,
  excluirFechamentoUnidadeMock,
  getEmpresaBySlugAndTenantMock,
  getFechamentoUnidadeByDataMock,
  getFechamentoUnidadeByIdMock,
  getTenantByIdMock,
  getUserEmpresaSlugsMock,
  listarFechamentosUnidadeMock,
} = vi.hoisted(() => ({
  criarFechamentoUnidadeMock: vi.fn(async (data: any) => ({ id: 10, ...data })),
  excluirFechamentoUnidadeMock: vi.fn(async () => ({ success: true })),
  getEmpresaBySlugAndTenantMock: vi.fn(async (slug: string, tenantId: number) => ({
    id: 1,
    slug,
    tenantId,
    nome: "Unidade Teste",
  })),
  getFechamentoUnidadeByDataMock: vi.fn(async () => undefined),
  getFechamentoUnidadeByIdMock: vi.fn(async () => ({
    id: 10,
    tenantId: 1,
    empresaSlug: "barbiero-morumbi",
    data: "2026-08-29",
    motivo: "Manutenção",
  })),
  getTenantByIdMock: vi.fn(async (tenantId: number) => ({ id: tenantId, ativo: 1, validadeAte: null })),
  getUserEmpresaSlugsMock: vi.fn(async () => ["barbiero-morumbi"]),
  listarFechamentosUnidadeMock: vi.fn(async () => []),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    criarFechamentoUnidade: criarFechamentoUnidadeMock,
    excluirFechamentoUnidade: excluirFechamentoUnidadeMock,
    getEmpresaBySlugAndTenant: getEmpresaBySlugAndTenantMock,
    getFechamentoUnidadeByData: getFechamentoUnidadeByDataMock,
    getFechamentoUnidadeById: getFechamentoUnidadeByIdMock,
    getTenantById: getTenantByIdMock,
    getUserEmpresaSlugs: getUserEmpresaSlugsMock,
    listarFechamentosUnidade: listarFechamentosUnidadeMock,
  };
});

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9100,
    openId: "fechamentos-test",
    email: "gerente@example.com",
    name: "Gerente Teste",
    loginMethod: "password",
    role: "user",
    perfil: "gerente",
    tenantId: 1,
    empresaVinculada: "barbiero-morumbi",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("calendário excepcional por unidade", () => {
  it("exclui um fechamento excepcional de um dia normalmente aberto", () => {
    const dias = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "barbiero-seraphine",
      ano: 2026,
      mes: 8,
      diaInicial: 28,
      diaFinal: 31,
      datasFechamentoExcepcional: ["2026-08-29"],
    });

    expect(dias).toBe(1);
  });

  it("não desconta duas vezes uma exceção que já cai no fechamento semanal", () => {
    const dias = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "barbiero-seraphine",
      ano: 2026,
      mes: 8,
      diaInicial: 28,
      diaFinal: 31,
      datasFechamentoExcepcional: ["2026-08-30"],
    });

    expect(dias).toBe(2);
  });
});

describe("viabilidade da necessidade diária", () => {
  it("classifica como atingida quando não existe valor faltante por dia", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 0, mediaDiaria: 6_500 }).status).toBe("atingida");
  });

  it("classifica verde quando a necessidade cabe na média atual", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 6_000, mediaDiaria: 6_500 }).status).toBe("realista");
  });

  it("classifica âmbar quando exige aumento de até 25%", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 7_500, mediaDiaria: 6_500 }).status).toBe("atencao");
  });

  it("classifica vermelho quando exige mais de 25% acima da média", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 9_000, mediaDiaria: 6_500 }).status).toBe("critica");
  });

  it("mantém estado neutro quando ainda não existe média para comparar", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 9_000, mediaDiaria: 0 }).status).toBe("sem_dados");
  });
});

describe("procedures de fechamentos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserEmpresaSlugsMock.mockResolvedValue(["barbiero-morumbi"]);
    getFechamentoUnidadeByDataMock.mockResolvedValue(undefined);
  });

  it("filtra a listagem pelas unidades vinculadas ao usuário", async () => {
    const caller = appRouter.createCaller(createCtx());
    await caller.fechamentos.listar({ mes: 8, ano: 2026 });

    expect(listarFechamentosUnidadeMock).toHaveBeenCalledWith({
      tenantId: 1,
      mes: 8,
      ano: 2026,
      empresasSlugs: ["barbiero-morumbi"],
    });
  });

  it("permite que gerente cadastre fechamento na própria unidade", async () => {
    const caller = appRouter.createCaller(createCtx());
    await caller.fechamentos.criar({
      empresaSlug: "barbiero-morumbi",
      data: "2026-08-29",
      motivo: "Manutenção preventiva",
    });

    expect(criarFechamentoUnidadeMock).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 1,
      empresaSlug: "barbiero-morumbi",
      data: "2026-08-29",
      criadoPor: 9100,
    }));
  });

  it("bloqueia gerente ao cadastrar fechamento em outra unidade", async () => {
    const caller = appRouter.createCaller(createCtx());

    await expect(caller.fechamentos.criar({
      empresaSlug: "barbiero-mascote",
      data: "2026-08-29",
      motivo: "Evento interno",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(criarFechamentoUnidadeMock).not.toHaveBeenCalled();
  });

  it("bloqueia operador antes de cadastrar ou excluir", async () => {
    const caller = appRouter.createCaller(createCtx({ perfil: "operador" }));

    await expect(caller.fechamentos.criar({
      empresaSlug: "barbiero-morumbi",
      data: "2026-08-29",
      motivo: "Evento interno",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.fechamentos.excluir({ id: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejeita datas inexistentes", async () => {
    const caller = appRouter.createCaller(createCtx());

    await expect(caller.fechamentos.criar({
      empresaSlug: "barbiero-morumbi",
      data: "2026-02-30",
      motivo: "Data inválida",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
