import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Building2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";

interface ComposicaoClientes {
  totalClientes: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  composicaoDisponivel: boolean;
}

interface EvolucaoClientesMes extends ComposicaoClientes {
  mes: number;
  ano: number;
  mesLabel: string;
  porUnidade: {
    MORUMBI: ComposicaoClientes;
    MASCOTE: ComposicaoClientes;
  };
  porProfissional: Record<string, number>;
  fonte?: "cashbarber_relatorio09" | "legado";
  sincronizadoEm?: Date | string | null;
}

interface ClientesEvolucaoChartProps {
  data: EvolucaoClientesMes[];
  isLoading?: boolean;
}

type UnidadeFiltro = "GRUPO" | "MORUMBI" | "MASCOTE";

const FILTROS: Array<{
  valor: UnidadeFiltro;
  rotulo: string;
  icone: typeof Users;
}> = [
  { valor: "GRUPO", rotulo: "Consolidado", icone: Users },
  { valor: "MORUMBI", rotulo: "Morumbi", icone: Building2 },
  { valor: "MASCOTE", rotulo: "Mascote", icone: Building2 },
];

function calcularVariacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function selecionarComposicao(
  item: EvolucaoClientesMes,
  filtro: UnidadeFiltro
): ComposicaoClientes {
  if (filtro === "GRUPO") {
    return {
      totalClientes: item.totalClientes,
      clientesNovos: item.clientesNovos,
      clientesRecorrentes: item.clientesRecorrentes,
      composicaoDisponivel: item.composicaoDisponivel,
    };
  }
  return item.porUnidade[filtro];
}

function VariacaoLabel({ x, y, value }: any) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const percentual = Number(value);
  const positivo = percentual >= 0;
  const texto = `${positivo ? "+" : ""}${percentual.toFixed(1)}%`;
  const largura = 52;

  return (
    <g transform={`translate(${Number(x) - largura / 2}, ${Number(y) - 30})`}>
      <rect
        width={largura}
        height={20}
        rx={10}
        fill={positivo ? "#ecfdf5" : "#fff1f2"}
        stroke={positivo ? "#a7f3d0" : "#fecdd3"}
      />
      <text
        x={largura / 2}
        y={14}
        textAnchor="middle"
        fill={positivo ? "#047857" : "#be123c"}
        fontSize={10}
        fontWeight={700}
      >
        {texto}
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const mesData = payload[0].payload;
  const total = mesData.clientes as number;
  const percentualNovos = total > 0 ? (mesData.clientesNovos / total) * 100 : 0;
  const percentualRecorrentes = total > 0 ? (mesData.clientesRecorrentes / total) * 100 : 0;
  const cresceu = (mesData.variacaoPercentual ?? 0) >= 0;

  return (
    <div className="min-w-64 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <p className="text-sm font-bold capitalize">{mesData.name}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Clientes distintos • CashBarber</p>
        </div>
        {mesData.variacaoPercentual !== null && (
          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${
              cresceu ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {cresceu ? "+" : ""}{mesData.variacaoPercentual.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mb-3 flex items-end justify-between">
        <span className="text-xs font-medium text-slate-500">Total no mês</span>
        <strong className="text-xl text-blue-700">{total.toLocaleString("pt-BR")}</strong>
      </div>

      {mesData.composicaoDisponivel ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-blue-800">
              <UserPlus className="h-3.5 w-3.5" /> Clientes novos
            </span>
            <span className="text-right text-sm font-bold text-blue-800">
              {mesData.clientesNovos.toLocaleString("pt-BR")}
              <small className="ml-1 font-medium">({percentualNovos.toFixed(1)}%)</small>
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-violet-800">
              <UserCheck className="h-3.5 w-3.5" /> Clientes recorrentes
            </span>
            <span className="text-right text-sm font-bold text-violet-800">
              {mesData.clientesRecorrentes.toLocaleString("pt-BR")}
              <small className="ml-1 font-medium">({percentualRecorrentes.toFixed(1)}%)</small>
            </span>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          A divisão entre novos e recorrentes não está disponível para este período legado.
        </p>
      )}

      {mesData.variacaoPercentual !== null && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <span className="text-slate-500">Variação mensal</span>
          <span className={`flex items-center gap-1 font-bold ${cresceu ? "text-emerald-700" : "text-rose-700"}`}>
            {cresceu ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {mesData.variacaoAbsoluta > 0 ? "+" : ""}{mesData.variacaoAbsoluta.toLocaleString("pt-BR")} clientes
          </span>
        </div>
      )}
    </div>
  );
}

export default function ClientesEvolucaoChart({ data, isLoading }: ClientesEvolucaoChartProps) {
  const [filtro, setFiltro] = useState<UnidadeFiltro>("GRUPO");

  const chartData = useMemo(() => {
    return data.map((item, indice) => {
      const composicao = selecionarComposicao(item, filtro);
      const anterior = indice > 0 ? selecionarComposicao(data[indice - 1], filtro) : null;
      const variacaoAbsoluta = anterior
        ? composicao.totalClientes - anterior.totalClientes
        : 0;
      const variacaoPercentual = anterior
        ? calcularVariacaoPercentual(composicao.totalClientes, anterior.totalClientes)
        : null;

      return {
        name: item.mesLabel,
        clientes: composicao.totalClientes,
        clientesNovos: composicao.clientesNovos,
        clientesRecorrentes: composicao.clientesRecorrentes,
        composicaoDisponivel: composicao.composicaoDisponivel,
        variacaoAbsoluta,
        variacaoPercentual,
      };
    });
  }, [data, filtro]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-0 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="rounded-2xl border-0 bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
        </div>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </div>
      </Card>
    );
  }

  const ultimo = chartData.at(-1)!;
  const cresceu = (ultimo.variacaoPercentual ?? 0) >= 0;
  const totais = chartData.map((item) => item.clientes);
  const mediaClientes = Math.round(totais.reduce((total, valor) => total + valor, 0) / totais.length);

  return (
    <Card className="premium-form-scope rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Evolução de Clientes</h3>
            <p className="text-xs text-slate-500">
              Relatório 09 do CashBarber • Novos por data de cadastro
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar evolução por unidade">
          {FILTROS.map(({ valor, rotulo, icone: Icone }) => {
            const ativo = filtro === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={ativo}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97] ${
                  ativo
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <Icone className="h-3.5 w-3.5" />
                {rotulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Visualização atual</p>
          <p className="text-sm font-bold text-slate-900">
            {FILTROS.find((item) => item.valor === filtro)?.rotulo}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">Variação vs. mês anterior</p>
          {ultimo.variacaoPercentual !== null ? (
            <p className={`text-sm font-bold ${cresceu ? "text-emerald-700" : "text-rose-700"}`}>
              {cresceu ? "+" : ""}{ultimo.variacaoPercentual.toFixed(1)}%
              <span className="ml-1 font-medium">
                ({ultimo.variacaoAbsoluta > 0 ? "+" : ""}{ultimo.variacaoAbsoluta})
              </span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-500">Sem base anterior</p>
          )}
        </div>
      </div>

      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 38, right: 28, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#93c5fd", strokeWidth: 2, strokeDasharray: "4 4" }}
            />
            <Legend
              formatter={() => (
                <span className="text-xs font-medium text-slate-600">Clientes distintos</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="clientes"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: "#2563eb", r: 5, strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 7, fill: "#1d4ed8", stroke: "#dbeafe", strokeWidth: 4 }}
              name="Clientes distintos"
            >
              <LabelList
                dataKey="variacaoPercentual"
                content={(props) => <VariacaoLabel {...props} />}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {chartData.map((item) => {
          const itemCresceu = (item.variacaoPercentual ?? 0) >= 0;
          return (
            <div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs capitalize text-slate-500">{item.name}</p>
                  <p className="text-lg font-bold text-slate-900">{item.clientes.toLocaleString("pt-BR")}</p>
                </div>
                {item.variacaoPercentual !== null && (
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                    itemCresceu ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {itemCresceu ? "+" : ""}{item.variacaoPercentual.toFixed(1)}%
                  </span>
                )}
              </div>
              {item.composicaoDisponivel && (
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-200 pt-2 text-[11px]">
                  <span className="text-blue-700">Novos <strong>{item.clientesNovos}</strong></span>
                  <span className="text-violet-700">Recorr. <strong>{item.clientesRecorrentes}</strong></span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-200 pt-4 text-center">
        <div>
          <p className="text-xs text-slate-500">Média</p>
          <p className="text-sm font-bold text-slate-900">{mediaClientes}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Máximo</p>
          <p className="text-sm font-bold text-emerald-700">{Math.max(...totais)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Mínimo</p>
          <p className="text-sm font-bold text-amber-700">{Math.min(...totais)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Último mês</p>
          <p className="text-sm font-bold text-blue-700">{ultimo.clientes}</p>
        </div>
      </div>
    </Card>
  );
}
