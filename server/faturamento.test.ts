import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
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

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User",
        loginMethod: "manus", role: "user", perfil: "operador", empresaVinculada: null,
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    // Logout clears both the Manus OAuth cookie and the app's own session cookie
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    const manusCookie = clearedCookies.find((c) => c.name === COOKIE_NAME);
    expect(manusCookie).toBeDefined();
    expect(manusCookie?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Faturamentos ─────────────────────────────────────────────────────────────

describe("faturamento.listar", () => {
  it("retorna array vazio para mês sem dados", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.faturamento.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("faturamento.salvar - controle de acesso", () => {
  it("rejeita operador tentando salvar", async () => {
    const ctx = createCtx({ role: "user", perfil: "operador" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.faturamento.salvar({
        empresaSlug: "MORUMBI",
        data: "2026-03-01",
        cat1: 100, cat2: 50, cat3: 30, cat4: 20, cat5: 200,
      })
    ).rejects.toThrow("Apenas gerentes podem realizar lançamentos.");
  });

  it("rejeita gerente tentando lançar em empresa diferente da sua", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente", empresaVinculada: "MASCOTE" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.faturamento.salvar({
        empresaSlug: "MORUMBI",
        data: "2026-03-01",
        cat1: 100, cat2: 50, cat3: 30, cat4: 20, cat5: 200,
      })
    ).rejects.toThrow("Você só pode lançar dados da sua unidade.");
  });
});

// ─── Metas ────────────────────────────────────────────────────────────────────

describe("meta.listar", () => {
  it("retorna array vazio para mês sem metas", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.meta.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("meta.salvar - controle de acesso", () => {
  it("rejeita operador tentando salvar meta", async () => {
    const ctx = createCtx({ role: "user", perfil: "operador" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.meta.salvar({
        empresaSlug: "MORUMBI",
        mes: 3, ano: 2026,
        metaMensal: 50000, metaQuinzenal: 25000,
        diasUteis: 22, diasUteisQuinzenal: 11,
      })
    ).rejects.toThrow("Apenas gerentes podem configurar metas.");
  });

  it("rejeita gerente configurando meta de empresa diferente", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente", empresaVinculada: "SERAPHINE" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.meta.salvar({
        empresaSlug: "MORUMBI",
        mes: 3, ano: 2026,
        metaMensal: 50000, metaQuinzenal: 25000,
        diasUteis: 22, diasUteisQuinzenal: 11,
      })
    ).rejects.toThrow("Você só pode configurar metas da sua unidade.");
  });
});

// ─── Empresas ─────────────────────────────────────────────────────────────────

describe("empresa.criar - controle de acesso", () => {
  it("rejeita não-admin criando empresa", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.empresa.criar({
        slug: "NOVA",
        nome: "Nova Empresa",
        cor: "#ff0000",
        tipoCategorias: "padrao",
      })
    ).rejects.toThrow("administradores");
  });

  it("rejeita não-admin removendo empresa", async () => {
    const ctx = createCtx({ role: "user", perfil: "gerente" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.empresa.remover({ id: 999 })
    ).rejects.toThrow("administradores");
  });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

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
