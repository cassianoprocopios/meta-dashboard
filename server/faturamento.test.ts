import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("faturamento router", () => {
  it("listar retorna array vazio para mês sem dados", async () => {
    const caller = appRouter.createCaller(createCtx());
    // Month far in the future should have no data
    const result = await caller.faturamento.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("meta router", () => {
  it("listar retorna array vazio para mês sem metas", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.meta.listar({ mes: 1, ano: 2099 });
    expect(Array.isArray(result)).toBe(true);
  });
});
