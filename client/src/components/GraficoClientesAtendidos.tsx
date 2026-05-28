import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

interface DadosClientesAtendidos {
  mes: string;
  clientes: number;
  atendimentos: number;
}

interface GraficoClientesAtendidosProps {
  dados: DadosClientesAtendidos[];
  titulo?: string;
  altura?: number;
}

export default function GraficoClientesAtendidos({
  dados,
  titulo = "Clientes Atendidos por Mês",
  altura = 300,
}: GraficoClientesAtendidosProps) {
  if (!dados || dados.length === 0) {
    return (
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">{titulo}</h3>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Sem dados disponíveis</p>
        </div>
      </Card>
    );
  }

  // Encontrar o máximo para escalar o gráfico
  const maxClientes = Math.max(...dados.map((d) => d.clientes));
  const maxAtendimentos = Math.max(...dados.map((d) => d.atendimentos));
  const escalaClientes = maxClientes > 0 ? 100 / maxClientes : 1;
  const escalaAtendimentos = maxAtendimentos > 0 ? 100 / maxAtendimentos : 1;

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-card-foreground">{titulo}</h3>
      </div>

      <div style={{ height: `${altura}px` }} className="flex items-end gap-4 justify-between">
        {dados.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            {/* Barras */}
            <div className="flex items-end gap-1 h-full w-full">
              {/* Barra de Clientes */}
              <div className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md relative group">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all hover:from-blue-600 hover:to-blue-500"
                  style={{ height: `${item.clientes * escalaClientes}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                    {item.clientes} clientes
                  </div>
                </div>
              </div>

              {/* Barra de Atendimentos */}
              <div className="flex-1 bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-md relative group">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-md transition-all hover:from-purple-600 hover:to-purple-500"
                  style={{ height: `${item.atendimentos * escalaAtendimentos}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                    {item.atendimentos} atendimentos
                  </div>
                </div>
              </div>
            </div>

            {/* Rótulo do mês */}
            <span className="text-xs font-medium text-muted-foreground text-center w-full truncate">
              {item.mes}
            </span>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-6 mt-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500 to-blue-400"></div>
          <span className="text-muted-foreground">Clientes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-purple-500 to-purple-400"></div>
          <span className="text-muted-foreground">Atendimentos</span>
        </div>
      </div>
    </Card>
  );
}
