import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    perfil: "gerente",
    empresaVinculada: null,
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

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("faturamento.listar", () => {
  it("retorna array vazio para mês sem dados", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.faturamento.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("meta.listar", () => {
  it("retorna array vazio para mês sem metas", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.meta.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("faturamento.salvar - controle de acesso", () => {
  it("rejeita operador tentando salvar", async () => {
    const ctx = createCtx({ role: "user", perfil: "operador" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.faturamento.salvar({
        empresa: "MORUMBI",
        data: "2026-03-01",
        avulso: 100,
        produtos: 50,
        servExtra: 30,
        lavatorio: 20,
        recorrencia: 200,
      })
    ).rejects.toThrow("Apenas gerentes podem realizar lançamentos.");
  });

  it("rejeita gerente tentando lançar em empresa diferente da sua", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente", empresaVinculada: "MASCOTE" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.faturamento.salvar({
        empresa: "MORUMBI",
        data: "2026-03-01",
        avulso: 100,
        produtos: 50,
        servExtra: 30,
        lavatorio: 20,
        recorrencia: 200,
      })
    ).rejects.toThrow("Você só pode lançar dados da sua unidade.");
  });
});

describe("meta.salvar - controle de acesso", () => {
  it("rejeita operador tentando salvar meta", async () => {
    const ctx = createCtx({ role: "user", perfil: "operador" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.meta.salvar({
        empresa: "MORUMBI",
        mes: 3,
        ano: 2026,
        metaMensal: 50000,
        metaQuinzenal: 25000,
      })
    ).rejects.toThrow("Apenas gerentes podem configurar metas.");
  });

  it("rejeita gerente configurando meta de empresa diferente", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente", empresaVinculada: "SERAPHINE" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.meta.salvar({
        empresa: "MORUMBI",
        mes: 3,
        ano: 2026,
        metaMensal: 50000,
        metaQuinzenal: 25000,
      })
    ).rejects.toThrow("Você só pode configurar metas da sua unidade.");
  });
});

describe("admin.atualizarPerfil - controle de acesso", () => {
  it("rejeita não-admin atualizando perfil", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.atualizarPerfil({
        userId: 2,
        perfil: "gerente",
        empresaVinculada: "MORUMBI",
      })
    ).rejects.toThrow("Acesso restrito a administradores.");
  });
});
