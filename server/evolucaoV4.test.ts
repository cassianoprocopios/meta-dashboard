import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  calcularIndicadoresDiasRestantes,
  classificarViabilidadeNecessidadeDiaria,
  contarDiasFuncionamentoNoIntervalo,
} from "../shared/calendarioFuncionamento";
import {
  calcularVariacaoMetaDiaria,
  obterDirecaoVariacaoMetaDiaria,
} from "../shared/metaCalculos";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9999,
    tenantId: null,
    openId: "evolucao-v4-test",
    email: "evolucao-v4@example.com",
    name: "Evolução v4",
    loginMethod: "test",
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

describe("Evolução v4 — empresa.atualizar", () => {
  it("aceita o contrato de nomes base cat1..cat5 para admin sem criar registro de teste", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.empresa.atualizar({
      id: 999999,
      nome: "Unidade v4",
      cor: "#123456",
      tipoCategorias: "padrao",
      cat1Nome: "Avulso personalizado",
      cat2Nome: "Produtos personalizados",
      cat3Nome: "Serviços personalizados",
      cat4Nome: "Lavatório personalizado",
      cat5Nome: "Recorrência personalizada",
    });

    expect(result).toEqual({ success: true });
  });

  it("permite gerente editar unidade, mas bloqueia operador", async () => {
    const gerente = appRouter.createCaller(createCtx({ role: "user", perfil: "gerente" }));
    await expect(
      gerente.empresa.atualizar({ id: 999999, cat1Nome: "Avulso" })
    ).resolves.toEqual({ success: true });

    const operador = appRouter.createCaller(createCtx({ role: "user", perfil: "operador" }));
    await expect(
      operador.empresa.atualizar({ id: 999999, cat1Nome: "Não permitido" })
    ).rejects.toThrow(/administradores e gerentes/i);
  });

  it("rejeita nome de categoria vazio pelo contrato de entrada", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(
      caller.empresa.atualizar({ id: 999999, cat1Nome: "" })
    ).rejects.toThrow();
  });
});

describe("Evolução v4 — categorias dinâmicas", () => {
  it("permite edição de categoria existente para gerente sem inserir dados", async () => {
    const caller = appRouter.createCaller(createCtx({ role: "user", perfil: "gerente" }));
    await expect(
      caller.categorias.editar({ id: 999999, nome: "Categoria personalizada" })
    ).resolves.toEqual({ success: true });
  });

  it("bloqueia edição de categoria para operador", async () => {
    const caller = appRouter.createCaller(createCtx({ role: "user", perfil: "operador" }));
    await expect(
      caller.categorias.editar({ id: 999999, nome: "Não permitido" })
    ).rejects.toThrow(/gerentes e administradores/i);
  });
});

describe("Evolução v4 — meta diária dinâmica", () => {
  it("calcula necessidade diária com dias restantes do calendário da unidade", () => {
    const indicadores = calcularIndicadoresDiasRestantes({
      totalRealizado: 100_000,
      metaMensal: 140_000,
      mediaDiaria: 6_500,
      diasRestantes: 4,
    });

    expect(indicadores.faltaMensal).toBe(40_000);
    expect(indicadores.metaDiariaNecessaria).toBe(10_000);
    expect(indicadores.projecaoFinal).toBe(126_000);
  });

  it("não conta domingo e segunda da Seraphine e exclui fechamento excepcional", () => {
    const dias = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "BARBIERO_SERAPHINE",
      ano: 2026,
      mes: 8,
      diaInicial: 26,
      diaFinal: 31,
      datasFechamentoExcepcional: ["2026-08-28"],
    });

    expect(dias).toBe(3);
  });

  it("classifica a viabilidade e calcula a direção exibida pelo indicador", () => {
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 8_000, mediaDiaria: 7_000 }).status).toBe("atencao");
    expect(classificarViabilidadeNecessidadeDiaria({ necessidadeDiaria: 0, mediaDiaria: 7_000 }).status).toBe("atingida");

    const subiu = calcularVariacaoMetaDiaria({ metaDiariaOriginal: 5_000, metaDiariaAtual: 6_000, diasRestantes: 5 });
    const desceu = calcularVariacaoMetaDiaria({ metaDiariaOriginal: 5_000, metaDiariaAtual: 4_000, diasRestantes: 5 });
    const estavel = calcularVariacaoMetaDiaria({ metaDiariaOriginal: 5_000, metaDiariaAtual: 5_000, diasRestantes: 5 });

    expect(subiu).toBe(20);
    expect(desceu).toBe(-20);
    expect(estavel).toBe(0);
    expect(obterDirecaoVariacaoMetaDiaria(subiu)).toBe("subiu");
    expect(obterDirecaoVariacaoMetaDiaria(desceu)).toBe("desceu");
    expect(obterDirecaoVariacaoMetaDiaria(estavel)).toBe("estavel");
  });

  it("evita variação quando não há meta original ou dias restantes", () => {
    expect(calcularVariacaoMetaDiaria({ metaDiariaOriginal: 0, metaDiariaAtual: 3_000, diasRestantes: 5 })).toBe(0);
    expect(calcularVariacaoMetaDiaria({ metaDiariaOriginal: 5_000, metaDiariaAtual: 8_000, diasRestantes: 0 })).toBe(0);
  });
});
