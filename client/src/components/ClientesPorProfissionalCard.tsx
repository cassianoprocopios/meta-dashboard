import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientesPorProfissionalProps {
  dados: Array<{
    profissional: string;
    totalClientes: number;
    totalAtendimentos: number;
    faturamentoTotal: number;
  }>;
  isLoading?: boolean;
  empresas: Array<{ slug: string; nome: string }>;
  empresaSelecionada?: string;
  onEmpresaChange?: (slug: string) => void;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function ClientesPorProfissionalCard({
  dados,
  isLoading,
  empresas,
  empresaSelecionada,
  onEmpresaChange,
}: ClientesPorProfissionalProps) {
  const [filtroSelecionado, setFiltroSelecionado] = useState<string | null>(null);

  const dadosFiltrados = filtroSelecionado
    ? dados.filter((d) => d.profissional === filtroSelecionado)
    : dados;

  const totalClientesUnicos = dados.reduce((sum, d) => sum + d.totalClientes, 0);
  const totalAtendimentos = dados.reduce((sum, d) => sum + d.totalAtendimentos, 0);
  const ticketMedio = totalAtendimentos > 0 ? dados.reduce((sum, d) => sum + d.faturamentoTotal, 0) / totalAtendimentos : 0;

  if (isLoading) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-semibold text-foreground">Clientes por Profissional</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-semibold text-foreground">Clientes por Profissional</h3>
        </div>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Clientes por Profissional</h3>
            <p className="text-xs text-muted-foreground">{dados.length} profissionais</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {empresas.length > 1 && onEmpresaChange && (
          <Select value={empresaSelecionada || ""} onValueChange={onEmpresaChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Selecione unidade" />
            </SelectTrigger>
            <SelectContent>
              {empresas.map((emp) => (
                <SelectItem key={emp.slug} value={emp.slug}>
                  {emp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filtroSelecionado || ""} onValueChange={(v) => setFiltroSelecionado(v || null)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os profissionais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os profissionais</SelectItem>
            {dados.map((d) => (
              <SelectItem key={d.profissional} value={d.profissional}>
                {d.profissional}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Métricas consolidadas */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total de Clientes</p>
          <p className="text-lg font-bold text-foreground">{totalClientesUnicos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Atendimentos</p>
          <p className="text-lg font-bold text-foreground">{totalAtendimentos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
          <p className="text-lg font-bold text-foreground">{fmt(ticketMedio)}</p>
        </div>
      </div>

      {/* Ranking */}
      <div className="space-y-2">
        {dadosFiltrados.map((prof, idx) => (
          <div
            key={prof.profissional}
            className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                  #{idx + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{prof.profissional}</span>
              </div>
              <span className="text-sm font-bold text-primary">{prof.totalClientes} clientes</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{prof.totalAtendimentos} atendimentos</span>
              <span>{fmt(prof.faturamentoTotal)}</span>
            </div>
            {/* Barra de progresso */}
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{
                  width: `${Math.min((prof.totalClientes / dados[0].totalClientes) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
