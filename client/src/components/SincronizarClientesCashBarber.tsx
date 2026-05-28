import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SincronizarClientesCashBarberProps {
  mes: number;
  ano: number;
}

export default function SincronizarClientesCashBarber({
  mes,
  ano,
}: SincronizarClientesCashBarberProps) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const resultadoComSucesso = resultado?.sucesso === true;
  const resultadoComErro = resultado?.sucesso === false;

  const sincronizarMutation = trpc.clientesCashBarberSync.sincronizarPeriodo.useMutation({
    onSuccess: (data: any) => {
      setSincronizando(false);
      setResultado(data);

      if (data?.sucesso) {
        toast.success(
          `Sincronização concluída! Total: ${data?.totalGeral} clientes distintos`
        );
      } else {
        toast.error(`Erro na sincronização: ${data?.erro}`);
      }
    },
    onError: (erro) => {
      setSincronizando(false);
      toast.error(`Erro ao sincronizar: ${erro.message}`);
    },
  });

  const handleSincronizar = async () => {
    setSincronizando(true);
    setResultado(null);
    await sincronizarMutation.mutateAsync({ mes, ano });
  };

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-green-500/15 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Sincronizar CashBarber</h3>
            <p className="text-xs text-muted-foreground">
              Extrair dados de clientes do painel CashBarber
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Botão de sincronização */}
        <Button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {sincronizando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar {mes}/{ano}
            </>
          )}
        </Button>

        {/* Resultado */}
        {resultado && (
          <div
            className={`p-3 rounded-lg ${
              resultadoComSucesso
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            <div className="flex items-start gap-2">
              {resultadoComSucesso ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              )}

              <div className="flex-1">
                {resultadoComSucesso ? (
                  <div>
                    <p className="text-sm font-bold text-emerald-400 mb-2">
                      Sincronização Concluída!
                    </p>

                    {/* Resumo por unidade */}
                    <div className="space-y-2">
                      {resultado?.unidades?.map((unidade: any) => (
                        <div
                          key={unidade.unidade}
                          className="p-2 bg-muted/50 rounded text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {unidade.unidade}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {unidade.totalClientesDistintos} clientes
                            </span>
                          </div>

                          {/* Serviços */}
                          {Object.entries(unidade.clientesPorServico).length > 0 && (
                            <div className="mt-1 text-muted-foreground text-xs">
                              {Object.entries(unidade.clientesPorServico)
                                .slice(0, 3)
                                .map(([servico, quantidade]: [string, any]) => (
                                  <div key={servico}>
                                    • {servico}: {String(quantidade)}
                                  </div>
                                ))}
                              {Object.entries(unidade.clientesPorServico).length > 3 && (
                                <div>
                                  • +{Object.entries(unidade.clientesPorServico).length - 3} mais
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total geral */}
                    <div className="mt-3 pt-3 border-t border-emerald-500/30">
                      <p className="text-sm font-bold text-emerald-400">
                        Total: {resultado?.totalGeral} clientes distintos
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-red-400">Erro na Sincronização</p>
                    <p className="text-xs text-red-300 mt-1">{resultado?.erro || "Erro desconhecido"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
          <p className="font-medium mb-1">Como funciona:</p>
          <ul className="space-y-1 text-xs">
            <li>• Acessa o painel do CashBarber automaticamente</li>
            <li>• Extrai dados de: Relatório → Gestão → Cliente por Período e Serviço</li>
            <li>• Sincroniza clientes distintos por unidade</li>
            <li>• Atualiza o dashboard com os dados reais</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
