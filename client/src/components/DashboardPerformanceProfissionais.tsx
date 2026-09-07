import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ProfissionalPerformance {
  profissional: string;
  totalAtendimentos: number;
  clientesUnicos: number;
  faturamentoTotal: number;
  duracaoTotal: number;
  ticketMedio: number;
}

interface DashboardPerformanceProfissionaisProps {
  empresaSlug: string;
  dataInicio: string;
  dataFim: string;
}

export default function DashboardPerformanceProfissionais({
  empresaSlug,
  dataInicio,
  dataFim,
}: DashboardPerformanceProfissionaisProps) {
  const { data: profissionais, isLoading } = trpc.relatorios.export.consolidadoPorProfissional.useQuery(
    {
      empresaSlug,
      dataInicio,
      dataFim,
    },
    { enabled: !!empresaSlug }
  );

  if (isLoading) {
    return (
      <div className="premium-panel flex items-center justify-center h-64">
        <div className="text-slate-500">Carregando dados...</div>
      </div>
    );
  }

  if (!profissionais || profissionais.length === 0) {
    return (
      <div className="premium-panel flex items-center justify-center h-64">
        <div className="text-slate-500">Nenhum profissional encontrado neste período</div>
      </div>
    );
  }

  // Pódio (top 3)
  const podio = profissionais.slice(0, 3);
  const restantes = profissionais.slice(3);

  const getMedalColor = (posicao: number) => {
    switch (posicao) {
      case 0:
        return "text-yellow-500"; // Ouro
      case 1:
        return "text-gray-400"; // Prata
      case 2:
        return "text-orange-600"; // Bronze
      default:
        return "text-gray-400";
    }
  };

  const getMedalBgColor = (posicao: number) => {
    switch (posicao) {
      case 0:
        return "bg-yellow-50";
      case 1:
        return "bg-gray-50";
      case 2:
        return "bg-orange-50";
      default:
        return "bg-white";
    }
  };

  return (
    <div className="space-y-6">
      {/* Pódio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {podio.map((prof: ProfissionalPerformance, idx: number) => (
          <div
            key={prof.profissional}
            className={`${getMedalBgColor(idx)} rounded-xl p-6 border shadow-sm transition-transform hover:-translate-y-0.5 ${
              idx === 0 ? "border-yellow-300" : idx === 1 ? "border-gray-300" : "border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className={`w-6 h-6 ${getMedalColor(idx)}`} />
              <span className="text-2xl font-bold text-[#12233f]">#{idx + 1}</span>
              </div>
              <span className="text-sm font-semibold text-gray-600">
                {idx === 0 ? "OURO" : idx === 1 ? "PRATA" : "BRONZE"}
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#12233f] mb-4">{prof.profissional}</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Atendimentos
                </span>
                <span className="font-bold text-gray-900">{prof.totalAtendimentos}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Faturamento
                </span>
                <span className="font-bold text-green-600">
                  R$ {prof.faturamentoTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ticket Médio</span>
                <span className="font-bold text-gray-900">
                  R$ {prof.ticketMedio.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duração Total
                </span>
                <span className="font-bold text-gray-900">{prof.duracaoTotal} min</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Clientes Únicos</span>
                <span className="font-bold text-gray-900">{prof.clientesUnicos}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ranking completo */}
      {profissionais.length > 3 && (
        <Card className="premium-panel p-6">
          <h3 className="text-lg font-bold text-[#12233f] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Ranking Completo
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Profissional</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Atendimentos</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Clientes</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Faturamento</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Ticket Médio</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Duração (min)</th>
                </tr>
              </thead>
              <tbody>
                {profissionais.map((prof: ProfissionalPerformance, idx: number) => (
                  <tr
                    key={prof.profissional}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition ${
                      idx < 3 ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-gray-900">#{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{prof.profissional}</td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {prof.totalAtendimentos}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{prof.clientesUnicos}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      R$ {prof.faturamentoTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      R$ {prof.ticketMedio.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{prof.duracaoTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Estatísticas gerais */}
      <Card className="p-6 border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-sm">
        <h3 className="text-lg font-bold text-[#12233f] mb-4">Estatísticas do Período</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total de Profissionais</p>
            <p className="text-2xl font-bold text-gray-900">{profissionais.length}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Total de Atendimentos</p>
            <p className="text-2xl font-bold text-gray-900">
              {profissionais.reduce((sum: number, p: ProfissionalPerformance) => sum + p.totalAtendimentos, 0)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Faturamento Total</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {profissionais.reduce((sum: number, p: ProfissionalPerformance) => sum + p.faturamentoTotal, 0).toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Ticket Médio Geral</p>
            <p className="text-2xl font-bold text-gray-900">
              R${" "}
              {(
                profissionais.reduce((sum: number, p: ProfissionalPerformance) => sum + p.faturamentoTotal, 0) /
                profissionais.reduce((sum: number, p: ProfissionalPerformance) => sum + p.totalAtendimentos, 0)
              ).toFixed(2)}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
