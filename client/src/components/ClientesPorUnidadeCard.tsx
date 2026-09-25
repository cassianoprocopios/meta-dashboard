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
      <Card className="border-slate-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-slate-200"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-slate-100"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const totalGeral = dados.reduce((sum, d) => sum + d.totalClientes, 0);

  return (
    <Card className="border-slate-200 bg-white p-6 text-slate-900">
      <div className="space-y-4">
        {/* Header com Filtro */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Clientes por Unidade</h3>
              <p className="text-xs text-slate-500">Clientes distintos • Fonte CashBarber</p>
            </div>
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
              <SelectTrigger className="h-8 w-40 border-slate-300 bg-white text-xs text-slate-900">
                <Calendar className="w-3 h-3 mr-2" />
                <SelectValue placeholder="Selecione mês" />
              </SelectTrigger>
              <SelectContent className="people-select-content">
                {mesesDisponiveis.map((item) => (
                  <SelectItem
                    key={`${item.ano}-${item.mes}`}
                    value={`${item.ano}-${String(item.mes).padStart(2, "0")}`}
                    className="text-slate-700"
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm text-slate-500">Soma por unidade</p>
          <p className="text-2xl font-bold text-slate-900">{totalGeral.toLocaleString("pt-BR")}</p>
        </div>

        {/* Detalhes por Unidade */}
        <div className="space-y-3">
          {dados.map((unidade) => {
            const percentualTotal = totalGeral > 0 ? (unidade.totalClientes / totalGeral) * 100 : 0;

            return (
              <div
                key={unidade.unidade}
                className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{unidade.unidade}</h4>
                    {unidade.variacaoPercentual !== undefined && unidade.variacaoPercentual !== 0 && (
                      <div
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                          unidade.variacaoPercentual > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {unidade.variacaoPercentual > 0 ? "+" : ""}
                        {unidade.variacaoPercentual.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-blue-700">
                    {unidade.totalClientes.toLocaleString("pt-BR")}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentualTotal}%` }}
                  ></div>
                </div>

                {/* Percentual */}
                <p className="mt-2 text-xs text-slate-500">{percentualTotal.toFixed(1)}% do total</p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
