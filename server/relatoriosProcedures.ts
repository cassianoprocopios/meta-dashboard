import { protectedProcedure, router } from "./_core/trpc";
import { listCashbarberConfigs } from "./db";
import { z } from "zod";
import { gerarPDFRelatorio, gerarExcelRelatorio, gerarRelatorioConsolidadoProfissional } from "./relatorioExport";
import { obterAtendimentosParaExportacao, obterConsolidadoPorProfissional } from "./relatorioAtendimentosSync";
import { obterConsolidadoCompletoTodosProfissionais } from "./relatorioConsolidadoCompleto";

// Função auxiliar para obter tenantId do contexto
async function getTenantIdFromCtx(ctx: any): Promise<number> {
  if (ctx.user?.tenantId) return ctx.user.tenantId;
  throw new Error("Tenant ID not found in context");
}

/**
 * Router com procedures para exportação de relatórios
 */
export const relatoriosExportRouter = router({
  /**
   * Exporta relatório de atendimentos em PDF
   */
  exportarPDF: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        dataInicio: z.string(),
        dataFim: z.string(),
        profissional: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);

      // Obter atendimentos
      const atendimentos = await obterAtendimentosParaExportacao(
        tenantId,
        input.empresaSlug,
        input.dataInicio,
        input.dataFim,
        input.profissional
      );

      // Converter para formato esperado
      const relatorioFormatado = {
        periodo: {
          inicio: input.dataInicio,
          fim: input.dataFim,
        },
        unidade: input.empresaSlug,
        profissional: input.profissional,
        totalClientes: new Set(atendimentos.map((a) => a.cliente)).size,
        totalAtendimentos: atendimentos.length,
        ticketMedio: atendimentos.length > 0
          ? atendimentos.reduce((sum, a) => sum + a.valor, 0) / atendimentos.length
          : 0,
        atendimentos: atendimentos.map((a) => ({
          data: a.data,
          profissional: a.profissional,
          cliente: a.cliente,
          servico: a.servico,
          valor: a.valor,
          duracao: a.duracao,
        })),
      };

      // Gerar PDF
      const pdfBuffer = await gerarPDFRelatorio(relatorioFormatado);

      // Retornar como base64 para download
      return {
        ok: true,
        data: pdfBuffer.toString("base64"),
        filename: `relatorio_${input.empresaSlug}_${input.dataInicio}_${input.dataFim}.pdf`,
      };
    }),

  /**
   * Exporta relatório de atendimentos em Excel
   */
  exportarExcel: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        dataInicio: z.string(),
        dataFim: z.string(),
        profissional: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);

      // Obter atendimentos
      const atendimentos = await obterAtendimentosParaExportacao(
        tenantId,
        input.empresaSlug,
        input.dataInicio,
        input.dataFim,
        input.profissional
      );

      // Converter para formato esperado
      const relatorioFormatado = {
        periodo: {
          inicio: input.dataInicio,
          fim: input.dataFim,
        },
        unidade: input.empresaSlug,
        profissional: input.profissional,
        totalClientes: new Set(atendimentos.map((a) => a.cliente)).size,
        totalAtendimentos: atendimentos.length,
        ticketMedio: atendimentos.length > 0
          ? atendimentos.reduce((sum, a) => sum + a.valor, 0) / atendimentos.length
          : 0,
        atendimentos: atendimentos.map((a) => ({
          data: a.data,
          profissional: a.profissional,
          cliente: a.cliente,
          servico: a.servico,
          valor: a.valor,
          duracao: a.duracao,
        })),
      };

      // Gerar Excel
      const excelBuffer = await gerarExcelRelatorio(relatorioFormatado);

      // Retornar como base64 para download
      return {
        ok: true,
        data: excelBuffer.toString("base64"),
        filename: `relatorio_${input.empresaSlug}_${input.dataInicio}_${input.dataFim}.xlsx`,
      };
    }),

  /**
   * Exporta relatório consolidado por profissional em Excel
   */
  exportarConsolidadoProfissional: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);

      // Obter atendimentos
      const atendimentos = await obterAtendimentosParaExportacao(
        tenantId,
        input.empresaSlug,
        input.dataInicio,
        input.dataFim
      );

      // Gerar Excel consolidado
      const excelBuffer = await gerarRelatorioConsolidadoProfissional(
        input.empresaSlug,
        input.dataInicio,
        input.dataFim,
        atendimentos
      );

      // Retornar como base64 para download
      return {
        ok: true,
        data: excelBuffer.toString("base64"),
        filename: `consolidado_${input.empresaSlug}_${input.dataInicio}_${input.dataFim}.xlsx`,
      };
    }),

  /**
   * Obtém consolidado por profissional para visualização
   */
  consolidadoPorProfissional: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const consolidado = await obterConsolidadoCompletoTodosProfissionais(
        tenantId,
        input.empresaSlug,
        input.dataInicio,
        input.dataFim
      );
      return consolidado;
    }),
});
