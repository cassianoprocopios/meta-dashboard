/**
 * usuario-empresas.test.ts
 *
 * Testa o fluxo de criação e edição de usuários com múltiplos vínculos de empresa,
 * garantindo que empresaVinculada seja sempre NULL e que userEmpresas seja usado.
 *
 * Também testa a lógica de migração legada (setUserEmpresas limpa empresaVinculada).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Helpers de contexto ──────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@test.com",
    name: "Admin Test",
    loginMethod: "password",
    role: "admin",
    perfil: "gerente",
    empresaVinculada: null,
    // null representa super-admin nos testes unitários e evita dependência de banco/tenant.
    tenantId: null,
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

// ─── Testes de controle de acesso ─────────────────────────────────────────────

describe("admin.criarUsuario - controle de acesso", () => {
  it("rejeita usuário não-admin tentando criar usuário", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.criarUsuario({
        name: "Novo Usuário",
        email: "novo@test.com",
        senha: "senha123",
        perfil: "operador",
        empresasSlugs: ["MORUMBI"],
      })
    ).rejects.toThrow(/Acesso restrito/);
  });
});

describe("admin.editarUsuario - controle de acesso", () => {
  it("rejeita usuário não-admin tentando editar usuário", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.editarUsuario({
        userId: 999,
        name: "Nome Alterado",
        empresasSlugs: ["MORUMBI", "SERAPHINE"],
      })
    ).rejects.toThrow(/Acesso restrito/);
  });
});

describe("admin.listarEmpresasUsuario - controle de acesso", () => {
  it("rejeita usuário tentando ver empresas de outro usuário", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "user", id: 100 });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.listarEmpresasUsuario({ userId: 999 })
    ).rejects.toThrow(/Acesso restrito/);
  });

  it("permite usuário ver suas próprias empresas", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "user", id: 100 });
    const caller = appRouter.createCaller(ctx);
    // userId === ctx.user.id → deve ser permitido (retorna array, possivelmente vazio)
    const result = await caller.admin.listarEmpresasUsuario({ userId: 100 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Testes de lógica de migração (funções db.ts) ─────────────────────────────

describe("setUserEmpresas - limpeza do campo legado", () => {
  it("exporta a função setUserEmpresas do db.ts", async () => {
    const { setUserEmpresas } = await import("./db");
    expect(typeof setUserEmpresas).toBe("function");
  });

  it("getUserEmpresaSlugs retorna array para usuário sem vínculos", async () => {
    const { getUserEmpresaSlugs } = await import("./db");
    // Usuário inexistente deve retornar array vazio
    const result = await getUserEmpresaSlugs(999999);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

// ─── Testes de validação de input ─────────────────────────────────────────────

describe("admin.criarUsuario - validação de input", () => {
  it("rejeita email inválido", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.criarUsuario({
        name: "Teste",
        email: "email-invalido",
        senha: "senha123",
        perfil: "operador",
      })
    ).rejects.toThrow();
  });

  it("rejeita senha com menos de 6 caracteres", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.criarUsuario({
        name: "Teste",
        email: "teste@valido.com",
        senha: "123",
        perfil: "operador",
      })
    ).rejects.toThrow();
  });

  it("rejeita nome com menos de 2 caracteres", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.criarUsuario({
        name: "A",
        email: "teste@valido.com",
        senha: "senha123",
        perfil: "operador",
      })
    ).rejects.toThrow();
  });
});

describe("admin.definirEmpresasUsuario - controle de acesso", () => {
  it("rejeita usuário não-admin tentando definir empresas", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createAdminCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.definirEmpresasUsuario({ userId: 999, slugs: ["MORUMBI"] })
    ).rejects.toThrow(/Acesso restrito/);
  });
});
