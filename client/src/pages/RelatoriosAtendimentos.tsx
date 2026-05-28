import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function RelatoriosAtendimentos() {
  const [empresaSlug, setEmpresaSlug] = useState("barbiero-morumbi");
  const [dataInicio, setDataInicio] = useState(new Date(new Date().setDate(1)).toISOString().split("T")[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split("T")[0]);

  const { data: relatorio, isLoading } = trpc.relatorios.clientesAtendidos.useQuery(
    { empresaSlug, dataInicio, dataFim },
    { enabled: !!empresaSlug }
  );

  const empresas = [
    { slug: "barbiero-morumbi", nome: "Barbiero Morumbi" },
    { slug: "barbiero-mascote", nome: "Barbiero Mascote" },
    { slug: "barbiero-seraphine", nome: "Barbiero Seraphine" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Relatórios de Atendimentos</h1>
          <p className="text-muted-foreground">Acompanhe clientes atendidos e desempenho por período</p>
        </div>

        {/* Filtros */}
        <Card className="p-6 mb-8 bg-card border-border">
          <h2 className="text-lg font-semibold text-card-foreground mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Unidade</label>
              <select
                value={empresaSlug}
                onChange={(e) => setEmpresaSlug(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {empresas.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Data Início</label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Data Fim</label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-end">
              <Button className="w-full">Gerar Relatório</Button>
            </div>
          </div>
        </Card>

        {/* Métricas Principais */}
        {relatorio && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Clientes</p>
                    <p className="text-3xl font-bold text-card-foreground">{relatorio.totalClientes}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Atendimentos</p>
                    <p className="text-3xl font-bold text-card-foreground">{relatorio.totalAtendimentos}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Faturamento Total</p>
                    <p className="text-3xl font-bold text-card-foreground">
                      R$ {relatorio.faturamentoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-amber-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                    <p className="text-3xl font-bold text-card-foreground">
                      R${" "}
                      {(relatorio.faturamentoTotal / (relatorio.totalAtendimentos || 1)).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <Calendar className="w-12 h-12 text-purple-500 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Atendimentos por Profissional */}
            <Card className="p-6 bg-card border-border mb-8">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Atendimentos por Profissional</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Profissional</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Atendimentos</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Faturamento</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(relatorio.atendimentosPorProfissional).map(([prof, atendimentos]: [string, any]) => {
                      const faturamento = relatorio.faturamentoPorProfissional[prof] || 0;
                      const ticketMedio = (atendimentos as number) > 0 ? faturamento / (atendimentos as number) : 0;
                      return (
                        <tr key={prof} className="border-b border-border hover:bg-background/50">
                          <td className="py-3 px-4 text-card-foreground">{prof}</td>
                          <td className="text-right py-3 px-4 text-card-foreground font-medium">{atendimentos as number}</td>
                          <td className="text-right py-3 px-4 text-card-foreground font-medium">
                            R$ {faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right py-3 px-4 text-muted-foreground">
                            R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Clientes por Dia */}
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-card-foreground mb-4">Clientes por Dia</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Data</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Clientes Atendidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(relatorio.clientesPorDia)
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([data, clientes]: [string, any]) => (
                        <tr key={data} className="border-b border-border hover:bg-background/50">
                          <td className="py-3 px-4 text-card-foreground">
                            {new Date(data).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="text-right py-3 px-4 text-card-foreground font-medium">{clientes as number}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando relatório...</p>
          </div>
        )}
      </div>
    </div>
  );
}
