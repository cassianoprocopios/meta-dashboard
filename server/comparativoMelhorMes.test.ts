import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  calcularComparativoMelhorMes,
  selecionarMelhoresMesesHistoricos,
} from "../shared/comparativoMelhorMes";

const recorde = {
  mes: 8,
  ano: 2026,
  totalServicos: 5_000,
  totalProdutos: 1_500,
  totalGeral: 6_500,
};

describe("comparativo do melhor mês do profissional", () => {
  it("calcula quanto falta para superar o recorde", () => {
    expect(calcularComparativoMelhorMes(3_250, recorde)).toEqual({
      ...recorde,
      percentualDoRecorde: 50,
      faltaParaRecorde: 3_250,
      valorAcimaDoRecorde: 0,
      novoRecorde: false,
      igualouRecorde: false,
    });
  });

  it("identifica um novo recorde", () => {
    const resultado = calcularComparativoMelhorMes(7_000, recorde);
    expect(resultado).toMatchObject({
      percentualDoRecorde: 108,
      faltaParaRecorde: 0,
      valorAcimaDoRecorde: 500,
      novoRecorde: true,
      igualouRecorde: false,
    });
  });

  it("identifica quando o recorde foi igualado", () => {
    const resultado = calcularComparativoMelhorMes(6_500, recorde);
    expect(resultado).toMatchObject({
      percentualDoRecorde: 100,
      faltaParaRecorde: 0,
      valorAcimaDoRecorde: 0,
      novoRecorde: false,
      igualouRecorde: true,
    });
  });

  it("não cria comparação sem histórico válido", () => {
    expect(calcularComparativoMelhorMes(1_000, null)).toBeNull();
    expect(calcularComparativoMelhorMes(1_000, { ...recorde, totalGeral: 0 })).toBeNull();
  });

  it("escolhe o maior mês anterior e ignora o período de referência", () => {
    const melhores = selecionarMelhoresMesesHistoricos([
      { colaboradorId: 7, mes: 7, ano: 2026, totalServicos: 2_000, totalProdutos: 1_000, totalGeral: 3_000 },
      { colaboradorId: 7, mes: 8, ano: 2026, totalServicos: 2_500, totalProdutos: 1_500, totalGeral: 4_000 },
      { colaboradorId: 7, mes: 9, ano: 2026, totalServicos: 9_000, totalProdutos: 1_000, totalGeral: 10_000 },
      { colaboradorId: 9, mes: 8, ano: 2026, totalServicos: 1_000, totalProdutos: 500, totalGeral: 1_500 },
    ], 9, 2026);

    expect(melhores.get(7)).toMatchObject({ mes: 8, ano: 2026, totalGeral: 4_000 });
    expect(melhores.get(9)).toMatchObject({ mes: 8, ano: 2026, totalGeral: 1_500 });
  });

  it("em empate mantém o mês histórico mais recente", () => {
    const melhores = selecionarMelhoresMesesHistoricos([
      { colaboradorId: 7, mes: 6, ano: 2026, totalServicos: 2_000, totalProdutos: 1_000, totalGeral: 3_000 },
      { colaboradorId: 7, mes: 8, ano: 2026, totalServicos: 2_100, totalProdutos: 900, totalGeral: 3_000 },
    ], 9, 2026);

    expect(melhores.get(7)).toMatchObject({ mes: 8, ano: 2026 });
  });

  it("integra a consulta histórica e o indicador visual do ranking", () => {
    const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    const pagina = readFileSync(new URL("../client/src/pages/RankingPublico.tsx", import.meta.url), "utf8");
    const portal = readFileSync(new URL("../client/src/pages/RankingProfissional.tsx", import.meta.url), "utf8");
    const cardMovel = readFileSync(new URL("../client/src/components/DesafioRecordeProfissional.tsx", import.meta.url), "utf8");
    expect(router).toContain("listarMelhoresMesesPorColaborador(tenantId, input.mes, input.ano)");
    expect(router).toContain("melhorMes: calcularComparativoMelhorMes(");
    expect(pagina).toContain("Melhor mês:");
    expect(pagina).toContain("Faltam ${formatCurrency(melhor.faltaParaRecorde)} para superar");
    expect(pagina).toContain('role="progressbar"');
    expect(pagina).toContain('"NOVO RECORDE"');
    expect(pagina).toContain("Faltam exatamente ${formatCurrency(melhor.faltaParaRecorde)}");
    expect(pagina).toContain("RecordCelebration");
    expect(pagina).toContain('data-testid="ranking-linha-compacta"');
    expect(pagina).toContain('data-testid="recorde-resumo-compacto"');
    expect(pagina).toContain('data-testid="ranking-detalhamento-amplo"');
    expect(pagina).toContain("lg:max-w-5xl");
    expect(pagina).toContain("Abrir detalhamento completo de ${nome}");
    expect(portal).toContain('data-testid="comparativo-recorde-ranking-movel"');
    expect(portal).toContain("trpc.desempenhoHistorico.useQuery");
    expect(portal).toContain("<DesafioRecordeProfissional");
    expect(cardMovel).toContain("Seu desafio no ranking");
    expect(cardMovel).toContain("para superar seu melhor mês");
    expect(cardMovel).toContain('role="progressbar"');
    expect(cardMovel).toContain('"NOVO RECORDE"');
    expect(cardMovel).toContain("Faltam exatamente ${formatarMoeda(melhorMes.faltaParaRecorde)}");
    expect(cardMovel).toContain("RecordCelebration");
    expect(db).toContain("detalhesServicos: faturamentoColaboradores.detalhesServicos");
    expect(db).toContain("detalhesProdutos: faturamentoColaboradores.detalhesProdutos");
    expect(db).not.toContain("SELECT detalhesServicos FROM faturamentoColaboradores fc2");

    const estilos = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(estilos).toContain("@keyframes recordConfettiBurst");
    expect(estilos).toContain(".record-achievement-badge");
  });
});
