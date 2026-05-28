import cron from "node-cron";
import { getDb } from "./db";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Job automático para sincronizar atendimentos do CashBarber
 * Roda a cada 1 hora para manter os dados atualizados
 */

interface AtendimentoCashBarber {
  id: string;
  dataAtendimento: string; // YYYY-MM-DD
  empresaSlug: string; // MASCOTE ou MORUMBI
  profissionalId: string;
  profissionalNome: string;
  clienteId: string;
  clienteNome: string;
  servico: string;
  valor: number;
  duracao: number; // em minutos
}

/**
 * Simula busca de dados do CashBarber
 * Em produção, isso seria uma chamada à API ou scraping do CashBarber
 */
async function buscarAtendimentosCashBarber(
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<AtendimentoCashBarber[]> {
  // TODO: Implementar integração real com CashBarber API ou scraping
  // Por enquanto, retorna array vazio
  console.log(
    `[CashBarber Atendimentos Sync] Buscando atendimentos de ${empresaSlug} entre ${dataInicio} e ${dataFim}`
  );
  return [];
}

/**
 * Sincroniza atendimentos para um período específico
 */
async function sincronizarAtendimentosPeriodo(
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<number> {
  try {
    const atendimentos = await buscarAtendimentosCashBarber(
      empresaSlug,
      dataInicio,
      dataFim
    );

    if (atendimentos.length === 0) {
      console.log(
        `[CashBarber Atendimentos Sync] Nenhum atendimento encontrado para ${empresaSlug}`
      );
      return 0;
    }

    const database = await getDb();
    if (!database) throw new Error("Database connection failed");

    // Limpar dados antigos do período
    await database
      .delete(cashbarberAtendimentos)
      .where(eq(cashbarberAtendimentos.empresaSlug, empresaSlug));

    // Inserir novos dados
    let inseridos = 0;
    for (const atendimento of atendimentos) {
      try {
        await database.insert(cashbarberAtendimentos).values({
          empresaSlug: atendimento.empresaSlug,
          dataAtendimento: new Date(atendimento.dataAtendimento),
          profissionalId: atendimento.profissionalId,
          profissionalNome: atendimento.profissionalNome,
          clienteId: atendimento.clienteId,
          clienteNome: atendimento.clienteNome,
          servico: atendimento.servico,
          valor: atendimento.valor,
          duracao: atendimento.duracao,
        } as any);
        inseridos++;
      } catch (e) {
        console.warn(
          `[CashBarber Atendimentos Sync] Erro ao inserir atendimento:`,
          e
        );
      }
    }

    console.log(
      `[CashBarber Atendimentos Sync] ${inseridos} atendimentos sincronizados para ${empresaSlug}`
    );
    return inseridos;
  } catch (erro) {
    console.error(
      `[CashBarber Atendimentos Sync] Erro ao sincronizar ${empresaSlug}:`,
      erro
    );
    return 0;
  }
}

/**
 * Executa sincronização para o mês atual
 */
async function sincronizarMesAtual(): Promise<void> {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();

  const dataInicio = `${ano}-${mes}-01`;
  const dataFim = `${ano}-${mes}-31`;

  console.log(
    `[CashBarber Atendimentos Sync] Iniciando sincronização do mês ${mes}/${ano}`
  );

  // Sincronizar Mascote
  await sincronizarAtendimentosPeriodo("MASCOTE", dataInicio, dataFim);

  // Sincronizar Morumbi
  await sincronizarAtendimentosPeriodo("MORUMBI", dataInicio, dataFim);

  console.log(`[CashBarber Atendimentos Sync] Sincronização concluída`);
}

/**
 * Inicia o job automático
 */
export function iniciarSyncAtendimentos(): void {
  // Roda a cada 1 hora
  cron.schedule("0 * * * *", async () => {
    console.log(
      `[CashBarber Atendimentos Sync] Executando sincronização automática...`
    );
    await sincronizarMesAtual();
  });

  console.log(
    `[CashBarber Atendimentos Sync] Job automático iniciado (a cada 1 hora)`
  );
}

/**
 * Função para sincronização manual (para testes)
 */
export async function sincronizarAtendimentosManual(
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<number> {
  return await sincronizarAtendimentosPeriodo(empresaSlug, dataInicio, dataFim);
}
