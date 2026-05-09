/**
 * Job de Notificação Push de Novo Recorde Pessoal
 *
 * Roda após cada sincronização do CashBarber (5 min depois, horariamente).
 * Detecta profissionais que bateram recorde pessoal em algum item (serviço extra ou produto)
 * comparando o mês atual com o melhor mês histórico dos últimos 5 meses anteriores.
 * Envia notificação push PWA para o profissional comemorando o recorde.
 */

import cron from "node-cron";
import { getDb, listarRankingPorPeriodo, listarColaboradores, getAllTenants } from "./db";
import { enviarPushParaProfissional } from "./pushNotifications";

const EXCL_SERV = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*m[aá]quina|barba(\s*(completa|simples|na\s*te[sc]oura|na\s*m[aá]quina))?$|pezinho)/i;
const EXCL_PROD = /^(caixinha|[aá]gua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie|guaran[aá]|skol|salgado)/i;

interface ItemVendido {
  nome: string;
  sum: number;
  tipo: "servico" | "produto";
}

async function verificarENotificarRecordes(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();

  // Buscar todos os tenants ativos
  let tenants: Array<{ id: number }> = [];
  try {
    tenants = await getAllTenants();
  } catch (_e) {
    console.warn("[RecordeNotif] Não foi possível listar tenants");
    return;
  }

  for (const tenant of tenants) {
    try {
      const tenantId = tenant.id;

      // Buscar colaboradores do tenant
      const colaboradores = await listarColaboradores(tenantId);
      if (!colaboradores.length) continue;

      // Buscar dados dos últimos 6 meses (5 anteriores + atual)
      const meses: Array<{ mes: number; ano: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(anoAtual, now.getMonth() - i, 1);
        meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }

      const resultados = await Promise.all(
        meses.map(({ mes, ano }) => listarRankingPorPeriodo(tenantId, mes, ano))
      );

      const rankingAtual = resultados[resultados.length - 1];

      for (const col of colaboradores) {
        try {
          // Dados do mês atual
          const fatAtual = rankingAtual.itens.find((i) => i.colaboradorId === col.id);
          if (!fatAtual) continue;

          const rawServAtual: Array<{ ser_nome: string; sum: number; count: number }> =
            fatAtual.detalhesServicos ? JSON.parse(fatAtual.detalhesServicos) : [];
          const rawProdAtual: Array<{ pro_nome: string; sum: number; count: number }> =
            fatAtual.detalhesProdutos ? JSON.parse(fatAtual.detalhesProdutos) : [];

          const servAtual = rawServAtual.filter((s) => !EXCL_SERV.test(s.ser_nome ?? ""));
          const prodAtual = rawProdAtual.filter((p) => !EXCL_PROD.test(p.pro_nome ?? ""));

          // Calcular recorde histórico (máximo dos 5 meses anteriores)
          const recordeServMap = new Map<string, number>();
          const recordeProdMap = new Map<string, number>();

          for (let i = 0; i < resultados.length - 1; i++) {
            const fat = resultados[i].itens.find((it) => it.colaboradorId === col.id);
            if (!fat) continue;
            const srvs: Array<{ ser_nome: string; sum: number }> = fat.detalhesServicos
              ? JSON.parse(fat.detalhesServicos)
              : [];
            const prds: Array<{ pro_nome: string; sum: number }> = fat.detalhesProdutos
              ? JSON.parse(fat.detalhesProdutos)
              : [];
            srvs.forEach((s) => {
              if (!EXCL_SERV.test(s.ser_nome ?? ""))
                recordeServMap.set(s.ser_nome, Math.max(recordeServMap.get(s.ser_nome) ?? 0, s.sum));
            });
            prds.forEach((p) => {
              if (!EXCL_PROD.test(p.pro_nome ?? ""))
                recordeProdMap.set(p.pro_nome, Math.max(recordeProdMap.get(p.pro_nome) ?? 0, p.sum));
            });
          }

          // Detectar novos recordes
          const novosRecordes: ItemVendido[] = [];

          for (const s of servAtual) {
            const recorde = recordeServMap.get(s.ser_nome) ?? 0;
            // Só notifica se tem histórico (recorde > 0) e bateu o recorde
            if (recorde > 0 && s.sum > recorde) {
              novosRecordes.push({ nome: s.ser_nome, sum: s.sum, tipo: "servico" });
            }
          }

          for (const p of prodAtual) {
            const recorde = recordeProdMap.get(p.pro_nome) ?? 0;
            if (recorde > 0 && p.sum > recorde) {
              novosRecordes.push({ nome: p.pro_nome, sum: p.sum, tipo: "produto" });
            }
          }

          if (novosRecordes.length === 0) continue;

          // Ordenar por valor e pegar o mais expressivo
          novosRecordes.sort((a, b) => b.sum - a.sum);
          const melhorRecorde = novosRecordes[0];

          const formatarMoeda = (v: number) =>
            v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

          const titulo =
            novosRecordes.length === 1
              ? `🎯 Novo recorde: ${melhorRecorde.nome}!`
              : `🎯 ${novosRecordes.length} novos recordes este mês!`;

          const corpo =
            novosRecordes.length === 1
              ? `Você bateu seu recorde pessoal em ${melhorRecorde.nome} com ${formatarMoeda(melhorRecorde.sum)} este mês! Continue assim! 🚀`
              : `Você bateu recordes em: ${novosRecordes.map((r) => r.nome).join(", ")}. Mês incrível! 🚀`;

          await enviarPushParaProfissional(tenantId, col.id, {
            title: titulo,
            body: corpo,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: `recorde-${col.id}-${mesAtual}-${anoAtual}`,
            data: { url: "/ranking", tipo: "recorde", itens: novosRecordes },
          });

          console.log(
            `[RecordeNotif] ✓ Notificação de recorde enviada para ${col.nome} (${novosRecordes.length} item(s))`
          );
        } catch (err) {
          console.error(`[RecordeNotif] Erro ao processar colaborador ${col.id}:`, err);
        }
      }
    } catch (err) {
      console.error(`[RecordeNotif] Erro ao processar tenant ${tenant.id}:`, err);
    }
  }
}

let jobRecorde: ReturnType<typeof cron.schedule> | null = null;

export function iniciarJobRecordeNotif(): void {
  if (jobRecorde) return;

  // Roda 5 minutos após cada hora cheia (quando o CashBarber já sincronizou)
  // Ex: 10:05, 11:05, 12:05 ... 20:05 (horário de Brasília)
  jobRecorde = cron.schedule(
    "5 10-20 * * 1-6",
    async () => {
      console.log("[RecordeNotif] Verificando novos recordes...");
      try {
        await verificarENotificarRecordes();
      } catch (err) {
        console.error("[RecordeNotif] Erro:", err);
      }
    },
    { timezone: "America/Sao_Paulo" }
  );

  console.log("[RecordeNotif] Job de notificação de recordes agendado (5 min após cada hora, 10h-20h, seg-sáb)");
}
