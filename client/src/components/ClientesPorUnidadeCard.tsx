import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, TrendingUp, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientesUnidade {
  unidade: string;
  totalClientes: number;
  variacaoPercentual?: number;
}

interface ClientesPorUnidadeCardProps {
  dados: ClientesUnidade[];
  isLoading?: boolean;
  mes?: number;
  ano?: number;
  onMesChange?: (mes: number, ano: number) => void;
  mesesDisponiveis?: Array<{ mes: number; ano: number; label: string }>;
}

export default function ClientesPorUnidadeCard({
  dados,
  isLoading,
  mes,
  ano,
  onMesChange,
  mesesDisponiveis = [],
}: ClientesPorUnidadeCardProps) {
  const [mesSelecionado, setMesSelecionado] = React.useState<string>(
    mes && ano ? `${ano}-${String(mes).padStart(2, "0")}` : ""
  );
  if (isLoading) {
    return (
      <Card className="p-6 bg-slate-900/50 border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalGeral = dados.reduce((sum, d) => sum + d.totalClientes, 0);

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="space-y-4">
        {/* Header com Filtro */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Clientes por Unidade</h3>
          </div>
          {mesesDisponiveis.length > 0 ? (
            <Select
              value={mesSelecionado}
              onValueChange={(value) => {
                setMesSelecionado(value);
                const [ano, mes] = value.split("-");
                if (onMesChange) {
                  onMesChange(parseInt(mes), parseInt(ano));
                }
              }}
            >
              <SelectTrigger className="w-40 h-8 text-xs bg-slate-800 border-slate-700">
                <Calendar className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Selecione mês" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {mesesDisponiveis.map((item) => (
                  <SelectItem
                    key={`${item.ano}-${item.mes}`}
                    value={`${item.ano}-${String(item.mes).padStart(2, "0")}`}
                    className="text-slate-100"
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : mes && ano ? (
            <span className="text-xs text-slate-400">
              {new Date(ano, mes - 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </span>
          ) : null}
        </div>

        {/* Total Geral */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-1">Total de Clientes</p>
          <p className="text-2xl font-bold text-white">{totalGeral.toLocaleString("pt-BR")}</p>
        </div>

        {/* Detalhes por Unidade */}
        <div className="space-y-3">
          {dados.map((unidade) => {
            const percentualTotal = totalGeral > 0 ? (unidade.totalClientes / totalGeral) * 100 : 0;

            return (
              <div
                key={unidade.unidade}
                className="bg-slate-800/30 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-sm">{unidade.unidade}</h4>
                    {unidade.variacaoPercentual !== undefined && unidade.variacaoPercentual !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                          unidade.variacaoPercentual > 0
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {unidade.variacaoPercentual > 0 ? "+" : ""}
                        {unidade.variacaoPercentual.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-blue-400">
                    {unidade.totalClientes.toLocaleString("pt-BR")}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentualTotal}%` }}
                  ></div>
                </div>

                {/* Percentual */}
                <p className="text-xs text-slate-400 mt-2">{percentualTotal.toFixed(1)}% do total</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
