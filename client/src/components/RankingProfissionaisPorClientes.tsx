import { Card } from "@/components/ui/card";
import { Users, TrendingUp } from "lucide-react";

interface ProfissionalClientes {
  profissional: string;
  totalAtendimentos: number;
  clientesUnicos: number;
  faturamentoTotal: number;
  ticketMedio: number;
}

interface RankingProfissionaisPorClientesProps {
  dados: ProfissionalClientes[];
  isLoading?: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export default function RankingProfissionaisPorClientes({
  dados,
  isLoading,
}: RankingProfissionaisPorClientesProps) {
  if (isLoading) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
        </div>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </div>
      </Card>
    );
  }

  // Calcular totais consolidados
  const totalClientesUnicos = dados.reduce((sum, d) => sum + d.clientesUnicos, 0);
  const totalAtendimentos = dados.reduce((sum, d) => sum + d.totalAtendimentos, 0);
  const totalFaturamento = dados.reduce((sum, d) => sum + d.faturamentoTotal, 0);
  const ticketMedioGeral = totalAtendimentos > 0 ? totalFaturamento / totalAtendimentos : 0;

  // Encontrar máximo de clientes para a barra de progresso
  const maxClientes = Math.max(...dados.map(d => d.clientesUnicos), 1);

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
            <p className="text-xs text-muted-foreground">{dados.length} profissionais</p>
          </div>
        </div>
      </div>

      {/* Métricas consolidadas */}
      <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total de Clientes</p>
          <p className="text-lg font-bold text-foreground">{totalClientesUnicos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Atendimentos</p>
          <p className="text-lg font-bold text-foreground">{totalAtendimentos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalFaturamento)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
          <p className="text-lg font-bold text-foreground">{fmtFull(ticketMedioGeral)}</p>
        </div>
      </div>

      {/* Ranking */}
      <div className="space-y-3">
        {dados.map((prof, idx) => (
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
              <span className="text-sm font-bold text-primary">{prof.clientesUnicos} clientes</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2 text-xs text-muted-foreground">
              <span>{prof.totalAtendimentos} atendimentos</span>
              <span>{fmtFull(prof.faturamentoTotal)}</span>
              <span className="font-semibold text-foreground">Ticket: {fmtFull(prof.ticketMedio)}</span>
              <span className="text-right">{((prof.clientesUnicos / totalClientesUnicos) * 100).toFixed(1)}%</span>
            </div>

            {/* Barra de progresso */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                style={{
                  width: `${Math.min((prof.clientesUnicos / maxClientes) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
