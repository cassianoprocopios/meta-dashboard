import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Filter } from "lucide-react";
import DashboardPerformanceProfissionais from "@/components/DashboardPerformanceProfissionais";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function PerformanceProfissionais() {
  const { user } = useAuth();
  const [empresaSlug, setEmpresaSlug] = useState("todas");
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split("T")[0]);

  // Buscar empresas do usuário
  const { data: profissionais } = trpc.profissionais.listar.useQuery(undefined, {
    enabled: !!user,
  });

  // Extrair empresas únicas
  const empresas = React.useMemo(() => {
    if (!profissionais) return [];
    const empresasMap = new Map();
    profissionais.forEach((prof: any) => {
      if (prof.empresaSlug && !empresasMap.has(prof.empresaSlug)) {
        empresasMap.set(prof.empresaSlug, {
          slug: prof.empresaSlug,
          nome: prof.empresaSlug === "MASCOTE" ? "Mascote" : prof.empresaSlug === "MORUMBI" ? "Morumbi" : prof.empresaSlug === "SERAPHINE" ? "Lephyne" : prof.empresaSlug,
        });
      }
    });
    return [{ slug: "todas", nome: "Todas as unidades" }, ...Array.from(empresasMap.values())];
  }, [profissionais]);

  // Atualizar empresa padrão quando empresas forem carregadas
  useEffect(() => {
    if (empresas && empresas.length > 0) {
      const empresaValida = empresas.find((e: any) => e.slug === empresaSlug);
      if (!empresaValida) {
        setEmpresaSlug(empresas[0].slug);
      }
    }
  }, [empresas]);

  // Mutations para exportação
  const exportarPDF = trpc.relatorios.export.exportarPDF.useMutation();
  const exportarExcel = trpc.relatorios.export.exportarExcel.useMutation();
  const exportarConsolidado = trpc.relatorios.export.exportarConsolidadoProfissional.useMutation();

  const handleExportarPDF = async () => {
    try {
      const resultado = await exportarPDF.mutateAsync({
        empresaSlug: empresaSlug === "todas" ? empresas.filter((e: any) => e.slug !== "todas")[0]?.slug ?? "" : empresaSlug,
        dataInicio,
        dataFim,
      });

      // Download do arquivo
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${resultado.data}`;
      link.download = resultado.filename;
      link.click();
    } catch (erro) {
      console.error("Erro ao exportar PDF:", erro);
    }
  };

  const handleExportarExcel = async () => {
    try {
      const resultado = await exportarExcel.mutateAsync({
        empresaSlug,
        dataInicio,
        dataFim,
      });

      // Download do arquivo
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${resultado.data}`;
      link.download = resultado.filename;
      link.click();
    } catch (erro) {
      console.error("Erro ao exportar Excel:", erro);
    }
  };

  const handleExportarConsolidado = async () => {
    try {
      const resultado = await exportarConsolidado.mutateAsync({
        empresaSlug,
        dataInicio,
        dataFim,
      });

      // Download do arquivo
      const link = document.createElement("a");
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${resultado.data}`;
      link.download = resultado.filename;
      link.click();
    } catch (erro) {
      console.error("Erro ao exportar consolidado:", erro);
    }
  };

  return (
    <DashboardLayout>
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#12233f]">Performance dos Profissionais</h1>
        <p className="text-slate-500 mt-2">
          Analise o desempenho e o ranking de seus profissionais por período
        </p>
      </div>

      {/* Filtros */}
      <Card className="premium-panel p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-[#12233f]">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Seleção de Empresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unidade</label>
            <select
              value={empresaSlug}
              onChange={(e) => setEmpresaSlug(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-[10px] bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {empresas.map((emp: any) => (
                <option key={emp.slug} value={emp.slug}>
                  {emp.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex flex-col gap-2 justify-end">
            <div className="flex gap-2">
              <Button
                onClick={handleExportarPDF}
                disabled={exportarPDF.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                onClick={handleExportarExcel}
                disabled={exportarExcel.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
            </div>
            <Button
              onClick={handleExportarConsolidado}
              disabled={exportarConsolidado.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Consolidado
            </Button>
          </div>
        </div>
      </Card>

      {/* Dashboard de Performance */}
      {empresaSlug === "todas" ? (
        <Card className="premium-panel p-6 text-slate-600">Selecione uma unidade para visualizar o ranking detalhado dos profissionais. O consolidado anual entre unidades será exibido no Dashboard Gerencial.</Card>
      ) : (
      <DashboardPerformanceProfissionais
        empresaSlug={empresaSlug}
        dataInicio={dataInicio}
        dataFim={dataFim}
      />
      )}
    </div>
    </DashboardLayout>
  );
}
