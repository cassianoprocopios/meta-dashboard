import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const {
  atualizarUnidadeColaboradorMock,
  getEmpresaBySlugAndTenantMock,
  getTenantByIdMock,
} = vi.hoisted(() => ({
  atualizarUnidadeColaboradorMock: vi.fn(async (
    tenantId: number,
    id: number,
    empresaSlug: string
  ) => ({ id, tenantId, empresaSlug, nome: "Profissional Teste" })),
  getEmpresaBySlugAndTenantMock: vi.fn(async (slug: string, tenantId: number) => ({
    id: 1,
    slug,
    tenantId,
    nome: "Unidade Teste",
  })),
  getTenantByIdMock: vi.fn(async (tenantId: number) => ({
    id: tenantId,
    ativo: 1,
    validadeAte: null,
  })),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    atualizarUnidadeColaborador: atualizarUnidadeColaboradorMock,
    getEmpresaBySlugAndTenant: getEmpresaBySlugAndTenantMock,
    getTenantById: getTenantByIdMock,
  };
});

import { appRouter, podeAtualizarUnidadeColaborador } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9001,
    openId: "gestao-colaboradores-test",
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

describe("permissão para alterar unidade de colaboradores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmpresaBySlugAndTenantMock.mockResolvedValue({
      id: 1,
      slug: "barbiero-morumbi",
      tenantId: 1,
      nome: "Barbiero Morumbi",
    });
  });

  it("reconhece gerente e administrador como perfis autorizados", () => {
    expect(podeAtualizarUnidadeColaborador({ role: "user", perfil: "gerente" })).toBe(true);
    expect(podeAtualizarUnidadeColaborador({ role: "admin", perfil: "operador" })).toBe(true);
  });

  it("rejeita operador e recepcionista", () => {
    expect(podeAtualizarUnidadeColaborador({ role: "user", perfil: "operador" })).toBe(false);
    expect(podeAtualizarUnidadeColaborador({ role: "user", perfil: "recepcionista" })).toBe(false);
  });

  it("permite que gerente atualize somente a unidade", async () => {
    const caller = appRouter.createCaller(createCtx({ role: "user", perfil: "gerente" }));
    const result = await caller.profissionais.atualizarUnidade({
      id: 42,
      empresaSlug: "barbiero-morumbi",
    });

    expect(result.ok).toBe(true);
    expect(getEmpresaBySlugAndTenantMock).toHaveBeenCalledWith("barbiero-morumbi", 1);
    expect(atualizarUnidadeColaboradorMock).toHaveBeenCalledWith(1, 42, "barbiero-morumbi");
  });

  it("permite que administrador atualize a unidade", async () => {
    const caller = appRouter.createCaller(createCtx({ role: "admin", perfil: "operador" }));
    const result = await caller.profissionais.atualizarUnidade({
      id: 43,
      empresaSlug: "barbiero-grupo",
    });

    expect(result.ok).toBe(true);
    expect(atualizarUnidadeColaboradorMock).toHaveBeenCalledWith(1, 43, "barbiero-grupo");
  });

  it("bloqueia operador antes de acessar o banco", async () => {
    const caller = appRouter.createCaller(createCtx({ role: "user", perfil: "operador" }));

    await expect(
      caller.profissionais.atualizarUnidade({
        id: 44,
        empresaSlug: "barbiero-mascote",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(atualizarUnidadeColaboradorMock).not.toHaveBeenCalled();
  });
});
