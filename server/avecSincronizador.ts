/**
 * Módulo de sincronização do Avec
 *
 * Busca dados de faturamento do Avec por dia e distribui por categoria
 * usando o mapeamento configurado (avecMapeamento).
 *
 * Estratégia de coleta:
 * 1. Login no Avec via browser headless (terminal.avec.beauty)
 * 2. Para cada dia do período, busca o faturamento por categoria
 * 3. Salva no banco via upsertFaturamento (preservando cats não mapeadas)
 */

import { getDb } from "./db";
import { avecBrowserLogin, avecBrowserBuscarFaturamentoDia, avecBrowserInvalidarSessao } from "./avecBrowser";

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

async function getAvecMapeamento(tenantId: number, empresaSlug: string) {
  const db = await getDb();
  if (!db) return [];
  const { avecMapeamento } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  return db
    .select()
    .from(avecMapeamento)
    .where(and(eq(avecMapeamento.tenantId, tenantId), eq(avecMapeamento.empresaSlug, empresaSlug)));
}

async function upsertFaturamentoAvec(params: {
  tenantId: number;
  empresaSlug: string;
  data: string; // YYYY-MM-DD
  valores: Partial<Record<"cat1" | "cat2" | "cat3" | "cat4" | "cat5", number>>;
  catsMapeadas: Set<string>;
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

  const dadosUpdate: Record<string, number> = {};
  for (const cat of Array.from(params.catsMapeadas)) {
    const key = cat as keyof typeof params.valores;
    if (params.valores[key] !== undefined) {
      dadosUpdate[cat] = params.valores[key]!;
    }
  }

  if (existente.length > 0) {
    // Atualizar apenas as categorias mapeadas pelo Avec
    await db
      .update(faturamentos)
      .set({ ...dadosUpdate, updatedAt: new Date() })
      .where(
        and(
          eq(faturamentos.tenantId, params.tenantId),
          eq(faturamentos.empresaSlug, params.empresaSlug),
          eq(faturamentos.data, params.data)
        )
      );
  } else {
    // Inserir novo registro
    await db.insert(faturamentos).values({
      tenantId: params.tenantId,
      empresaSlug: params.empresaSlug,
      data: params.data,
      ...dadosUpdate,
      lancadoPor: "avec-sync",
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
 * Sincroniza o faturamento da Seraphine via Avec para um período.
 *
 * @param tenantId - ID do tenant
 * @param empresaSlug - Slug da empresa (ex: "seraphine")
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
  const resultado: ResultadoSincAvec = {
    diasSincronizados: 0,
    diasIgnorados: 0,
    diasFechados: 0,
    detalhes: [],
  };

  try {
    // 1. Buscar configuração do Avec
    const config = await getAvecConfig(tenantId, empresaSlug);
    if (!config || !config.avecEmail || !config.avecSenha) {
      throw new Error("Configuração do Avec não encontrada. Configure email e senha nas configurações da empresa.");
    }

    // 2. Buscar mapeamento de categorias
    const mapeamento = await getAvecMapeamento(tenantId, empresaSlug);
    if (mapeamento.length === 0) {
      throw new Error("Mapeamento de categorias do Avec não configurado.");
    }

    // Construir mapa: avecCategoria -> metaCategoria (cat1..cat5)
    const mapaCategoria: Record<string, string> = {};
    const catsMapeadas = new Set<string>();
    for (const m of mapeamento) {
      if (m.avecCategoria && m.metaCategoria) {
        mapaCategoria[m.avecCategoria.toLowerCase()] = m.metaCategoria;
        catsMapeadas.add(m.metaCategoria);
      }
    }

    // 3. Fazer login no Avec via browser headless (valida credenciais)
    try {
      await avecBrowserLogin(config.avecEmail, config.avecSenha);
    } catch (e) {
      avecBrowserInvalidarSessao();
      throw new Error(`Falha no login do Avec: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 4. Iterar por cada dia do mês
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
        // Buscar faturamento do dia por categoria via browser headless
        const dadosDia = await avecBrowserBuscarFaturamentoDia(config.avecEmail, config.avecSenha, dataYMD);

        if (dadosDia.total === 0) {
          resultado.diasFechados++;
          resultado.detalhes.push({ data: dataYMD, status: "fechado", total: 0, mensagem: "Sem caixa (fechado)" });
          continue;
        }

        // Mapear categorias Avec -> cats do meta usando o mapeamento configurado
        const valores: Partial<Record<"cat1" | "cat2" | "cat3" | "cat4" | "cat5", number>> = {};

        const catCabelo = mapaCategoria["cabelo"] as "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | undefined;
        const catManicure = mapaCategoria["manicure e pedicure"] as "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | undefined;
        const catSobrancelha = mapaCategoria["sobrancelha"] as "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | undefined;
        const catPacote = mapaCategoria["pacote"] as "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | undefined;
        const catRecorrencia = mapaCategoria["recorrência"] as "cat1" | "cat2" | "cat3" | "cat4" | "cat5" | undefined;

        if (catCabelo) valores[catCabelo] = dadosDia.cabelo;
        if (catManicure) valores[catManicure] = dadosDia.manicurePedicure;
        if (catSobrancelha) valores[catSobrancelha] = dadosDia.sobrancelha;
        if (catPacote) valores[catPacote] = dadosDia.pacote;
        if (catRecorrencia) valores[catRecorrencia] = dadosDia.recorrencia;

        await upsertFaturamentoAvec({
          tenantId,
          empresaSlug,
          data: dataYMD,
          valores,
          catsMapeadas,
        });

        resultado.diasSincronizados++;
        resultado.detalhes.push({ data: dataYMD, status: "sincronizado", total: dadosDia.total });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resultado.detalhes.push({ data: dataYMD, status: "erro", mensagem: msg });
        console.error(`[Avec Sync] Erro no dia ${dataYMD}:`, msg);
      }
    }

    // 5. Atualizar status de sincronização
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
