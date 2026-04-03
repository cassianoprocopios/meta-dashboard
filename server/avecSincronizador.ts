/**
 * Módulo de sincronização do Avec
 *
 * Busca dados de faturamento do Avec via Relatório 0184 (Faturamento por tipos de venda)
 * e distribui por categoria: Serviços (cat1), Pacotes (cat2), Produtos (cat3), Caixinha (cat4).
 *
 * Estratégia de coleta:
 * 1. Login no Avec via browser headless
 * 2. Para cada dia do período, acessa o Relatório 0184 filtrado pela data
 * 3. Extrai os valores por tipo de venda (Serviços, Pacotes, Produtos, Caixinha)
 * 4. Salva no banco via upsertFaturamento (preservando cat9 = Recorrência)
 */

import { getDb } from "./db";
import { avecBrowserBuscarRelatorio0184 } from "./avecBrowser";

export interface ResultadoSincAvec {
  diasSincronizados: number;
  diasIgnorados: number;
  diasFechados: number;
  erros?: string;
  detalhes: Array<{
    data: string;
    status: "sincronizado" | "ignorado" | "fechado" | "erro";
    total?: number;
    mensagem?: string;
  }>;
}

// ─── Helpers de banco ─────────────────────────────────────────────────────────

async function getAvecConfig(tenantId: number, empresaSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const { avecConfig } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(avecConfig)
    .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, empresaSlug)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Faz upsert do faturamento da Seraphine usando os valores do Relatório 0184.
 * cat1 = Serviços, cat2 = Pacotes, cat3 = Produtos, cat4 = Caixinha.
 * Preserva cat9 (Recorrência) que é gerenciado pelo D-Pote.
 */
async function upsertFaturamentoAvecRel0184(params: {
  tenantId: number;
  empresaSlug: string;
  data: string; // YYYY-MM-DD
  servicos: number;
  pacotes: number;
  produtos: number;
  caixinha: number;
}) {
  const db = await getDb();
  if (!db) return;
  const { faturamentos } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  // Verificar se já existe registro para este dia
  const existente = await db
    .select()
    .from(faturamentos)
    .where(
      and(
        eq(faturamentos.tenantId, params.tenantId),
        eq(faturamentos.empresaSlug, params.empresaSlug),
        eq(faturamentos.data, params.data)
      )
    )
    .limit(1);

  if (existente.length > 0) {
    // Atualizar cat1-cat4, preservar cat9 (Recorrência D-Pote)
    await db
      .update(faturamentos)
      .set({
        cat1: String(params.servicos),
        cat2: String(params.pacotes),
        cat3: String(params.produtos),
        cat4: String(params.caixinha),
        cat5: "0",
        cat6: "0",
        cat7: "0",
        cat8: "0",
        lancadoPor: "avec-sync-rel0184",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(faturamentos.tenantId, params.tenantId),
          eq(faturamentos.empresaSlug, params.empresaSlug),
          eq(faturamentos.data, params.data)
        )
      );
  } else {
    // Inserir novo registro (cat9 = 0, será preenchido pelo D-Pote)
    await db.insert(faturamentos).values({
      tenantId: params.tenantId,
      empresaSlug: params.empresaSlug,
      data: params.data,
      cat1: String(params.servicos),
      cat2: String(params.pacotes),
      cat3: String(params.produtos),
      cat4: String(params.caixinha),
      cat5: "0",
      cat6: "0",
      cat7: "0",
      cat8: "0",
      cat9: "0",
      lancadoPor: "avec-sync-rel0184",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function salvarSyncLog(params: {
  tenantId: number;
  empresaSlug: string;
  origem: string;
  status: string;
  mes: number;
  ano: number;
  diasSincronizados: number;
  diasIgnorados: number;
  erros?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { avecSyncLog } = await import("../drizzle/schema");
  await db.insert(avecSyncLog).values({
    tenantId: params.tenantId,
    empresaSlug: params.empresaSlug,
    origem: params.origem,
    status: params.status,
    mes: params.mes,
    ano: params.ano,
    diasSincronizados: params.diasSincronizados,
    diasIgnorados: params.diasIgnorados,
    erros: params.erros ?? null,
    executadoEm: new Date(),
  });
}

async function atualizarStatusSync(tenantId: number, empresaSlug: string, status: string) {
  const db = await getDb();
  if (!db) return;
  const { avecConfig } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  await db
    .update(avecConfig)
    .set({ ultimaSincronizacao: new Date(), statusUltimaSinc: status, updatedAt: new Date() })
    .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, empresaSlug)));
}

// ─── Função principal de sincronização ───────────────────────────────────────

/**
 * Sincroniza o faturamento da Seraphine via Avec (Relatório 0184) para um período.
 *
 * Mapeamento fixo para a Seraphine:
 *   Serviços  → cat1
 *   Pacotes   → cat2
 *   Produtos  → cat3
 *   Caixinha  → cat4
 *   (cat9 = Recorrência é preservada e gerenciada pelo D-Pote)
 *
 * @param tenantId - ID do tenant
 * @param empresaSlug - Slug da empresa (ex: "SERAPHINE")
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2026)
 * @param origem - "manual" | "automatico"
 */
export async function sincronizarFaturamentoAvec(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number,
  origem: "manual" | "automatico"
): Promise<ResultadoSincAvec> {
  // Normalizar slug para maiúsculo para garantir consistência com a tabela faturamentos
  empresaSlug = empresaSlug.toUpperCase();

  const resultado: ResultadoSincAvec = {
    diasSincronizados: 0,
    diasIgnorados: 0,
    diasFechados: 0,
    detalhes: [],
  };

  try {
    // 1. Buscar configuração do Avec (email e senha)
    const config = await getAvecConfig(tenantId, empresaSlug);
    if (!config || !config.avecEmail || !config.avecSenha) {
      throw new Error("Configuração do Avec não encontrada. Configure email e senha nas configurações da empresa.");
    }

    // 2. Iterar por cada dia do mês
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const hoje = new Date();
    const mesStr = String(mes).padStart(2, "0");

    for (let d = 1; d <= ultimoDia; d++) {
      const diaStr = String(d).padStart(2, "0");
      const dataYMD = `${ano}-${mesStr}-${diaStr}`;

      // Não sincronizar dias futuros
      const dataDia = new Date(`${dataYMD}T12:00:00Z`);
      if (dataDia > hoje) {
        resultado.diasIgnorados++;
        resultado.detalhes.push({ data: dataYMD, status: "ignorado", mensagem: "Dia futuro" });
        continue;
      }

      try {
        // Buscar faturamento do dia via Relatório 0184
        const dadosDia = await avecBrowserBuscarRelatorio0184(
          config.avecEmail,
          config.avecSenha,
          dataYMD
        );

        if (dadosDia.total === 0) {
          resultado.diasFechados++;
          resultado.detalhes.push({ data: dataYMD, status: "fechado", total: 0, mensagem: "Sem faturamento (fechado ou sem dados)" });
          continue;
        }

        // Salvar no banco: Serviços→cat1, Pacotes→cat2, Produtos→cat3, Caixinha→cat4
        await upsertFaturamentoAvecRel0184({
          tenantId,
          empresaSlug,
          data: dataYMD,
          servicos: dadosDia.servicos,
          pacotes: dadosDia.pacotes,
          produtos: dadosDia.produtos,
          caixinha: dadosDia.caixinha,
        });

        resultado.diasSincronizados++;
        resultado.detalhes.push({
          data: dataYMD,
          status: "sincronizado",
          total: dadosDia.total,
          mensagem: `Serviços R$${dadosDia.servicos.toFixed(2)}, Pacotes R$${dadosDia.pacotes.toFixed(2)}, Produtos R$${dadosDia.produtos.toFixed(2)}, Caixinha R$${dadosDia.caixinha.toFixed(2)}`,
        });

        // Pausa entre dias para não sobrecarregar o Avec
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resultado.detalhes.push({ data: dataYMD, status: "erro", mensagem: msg });
        console.error(`[Avec Sync] Erro no dia ${dataYMD}:`, msg);
      }
    }

    // 3. Atualizar status de sincronização
    const statusFinal = resultado.diasSincronizados > 0 ? "sucesso" : "sem_dados";
    await atualizarStatusSync(tenantId, empresaSlug, statusFinal);
    await salvarSyncLog({
      tenantId,
      empresaSlug,
      origem,
      status: statusFinal,
      mes,
      ano,
      diasSincronizados: resultado.diasSincronizados,
      diasIgnorados: resultado.diasIgnorados + resultado.diasFechados,
    });

    console.log(
      `[Avec Sync] ${origem} concluído para ${empresaSlug} ${mes}/${ano}: ` +
      `${resultado.diasSincronizados} sincronizados, ${resultado.diasFechados} fechados, ${resultado.diasIgnorados} ignorados`
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    resultado.erros = msg;
    console.error(`[Avec Sync] Erro crítico:`, msg);

    try {
      await salvarSyncLog({
        tenantId,
        empresaSlug,
        origem,
        status: "erro",
        mes,
        ano,
        diasSincronizados: resultado.diasSincronizados,
        diasIgnorados: resultado.diasIgnorados,
        erros: msg,
      });
    } catch { /* silenciar */ }
  }

  return resultado;
}
