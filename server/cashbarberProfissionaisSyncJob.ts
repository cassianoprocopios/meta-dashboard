/**
 * Job para sincronizar nomes reais dos profissionais do CashBarber
 * Atualiza a tabela cashbarberAtendimentos com os nomes corretos
 */

import { getDb, listCashbarberConfigs } from "./db";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { cashbarberLogin, cashbarberListarBarbeirosAtivos } from "./cashbarber";

/**
 * Sincroniza nomes reais dos profissionais do CashBarber
 */
export async function sincronizarNomesProfissionaisCashBarber(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number
): Promise<{ atualizados: number; erros: number }> {
  try {
    const db = await getDb();
    if (!db) return { atualizados: 0, erros: 0 };

    // 1. Buscar configuração do CashBarber
    const configs = await listCashbarberConfigs(tenantId);
    const config = configs.find((c) => c.empresaSlug === empresaSlug);
    if (!config || !config.cbEmail || !config.cbSenha) {
      console.warn(`[CashBarber Profissionais] Configuração não encontrada para ${empresaSlug}`);
      return { atualizados: 0, erros: 0 };
    }

    // 2. Fazer login no CashBarber
    const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
    if (!token) {
      console.error(`[CashBarber Profissionais] Falha ao fazer login para ${empresaSlug}`);
      return { atualizados: 0, erros: 0 };
    }

    // 3. Buscar lista de profissionais ativos
    const profissionaisAtivos = await cashbarberListarBarbeirosAtivos(token);
    if (!profissionaisAtivos || profissionaisAtivos.length === 0) {
      console.warn(`[CashBarber Profissionais] Nenhum profissional ativo encontrado para ${empresaSlug}`);
      return { atualizados: 0, erros: 0 };
    }

    // 4. Criar mapa de ID -> Nome real
    const mapaProfissionais = new Map<number, string>();
    profissionaisAtivos.forEach((p) => {
      mapaProfissionais.set(p.id, p.usu_name);
    });

    console.log(
      `[CashBarber Profissionais] Mapa de profissionais: ${Array.from(mapaProfissionais.entries())
        .map(([id, nome]) => `${id}=${nome}`)
        .join(", ")}`
    );

    // 5. Buscar atendimentos do período
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);

    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
          gte(cashbarberAtendimentos.dataAtendimento, primeiroDia),
          lte(cashbarberAtendimentos.dataAtendimento, ultimoDia)
        )
      );

    console.log(
      `[CashBarber Profissionais] ${atendimentos.length} atendimentos encontrados para ${empresaSlug} em ${mes}/${ano}`
    );

    // 6. Atualizar nomes dos profissionais
    let atualizados = 0;
    let erros = 0;

    for (const att of atendimentos) {
      try {
        const profissionalId = att.profissionalId ? parseInt(att.profissionalId) : null;
        const nomeReal = profissionalId ? mapaProfissionais.get(profissionalId) : null;

        if (nomeReal && nomeReal !== att.profissionalNome) {
          await db
            .update(cashbarberAtendimentos)
            .set({ profissionalNome: nomeReal })
            .where(eq(cashbarberAtendimentos.id, att.id));

          atualizados++;
          console.log(
            `[CashBarber Profissionais] Atualizado: ${att.profissionalNome} -> ${nomeReal}`
          );
        }
      } catch (err) {
        erros++;
        console.error(
          `[CashBarber Profissionais] Erro ao atualizar atendimento ${att.id}:`,
          err
        );
      }
    }

    console.log(
      `[CashBarber Profissionais] Sincronização concluída: ${atualizados} atualizados, ${erros} erros`
    );

    return { atualizados, erros };
  } catch (erro) {
    console.error(
      `[CashBarber Profissionais] Erro geral ao sincronizar nomes:`,
      erro
    );
    return { atualizados: 0, erros: 1 };
  }
}

/**
 * Sincroniza nomes para todas as empresas do tenant
 */
export async function sincronizarNomesProfissionaisTodosTenant(
  tenantId: number,
  mes: number,
  ano: number
): Promise<{ totalAtualizados: number; totalErros: number }> {
  try {
    const configs = await listCashbarberConfigs(tenantId);
    const empresasUnicas = Array.from(new Set(configs.map((c) => c.empresaSlug)));

    let totalAtualizados = 0;
    let totalErros = 0;

    for (const empresaSlug of empresasUnicas) {
      const resultado = await sincronizarNomesProfissionaisCashBarber(
        tenantId,
        empresaSlug,
        mes,
        ano
      );
      totalAtualizados += resultado.atualizados;
      totalErros += resultado.erros;
    }

    return { totalAtualizados, totalErros };
  } catch (erro) {
    console.error(
      `[CashBarber Profissionais] Erro ao sincronizar para tenant ${tenantId}:`,
      erro
    );
    return { totalAtualizados: 0, totalErros: 1 };
  }
}
