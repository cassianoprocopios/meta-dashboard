import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AvecSyncModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaSlug: string;
  mes: number;
  ano: number;
}

export default function AvecSyncModal({
  open,
  onOpenChange,
  empresaSlug,
  mes,
  ano,
}: AvecSyncModalProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const sincronizarMutation = trpc.avec.sincronizar.useMutation({
    onSuccess: (data) => {
      setSyncing(false);
      setLastResult(data);
      if (data.erros) {
        toast.error(`Erro: ${data.erros}`);
      } else {
        toast.success(
          `✅ Sincronização concluída! ${data.diasSincronizados} dias importados, ${data.diasFechados} fechados.`
        );
      }
    },
    onError: (err) => {
      setSyncing(false);
      toast.error(`Erro na sincronização: ${err.message}`);
      setLastResult({ erros: err.message });
    },
  });

  const handleSync = () => {
    setSyncing(true);
    setLastResult(null);
    sincronizarMutation.mutate({ empresaSlug, mes, ano });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar Faturamento Seraphine</DialogTitle>
          <DialogDescription>
            Sincronize os dados de faturamento da Seraphine do Avec para {mes}/{ano}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status da sincronização */}
          {syncing && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-600 dark:text-blue-400">
                Sincronizando dados...
              </span>
            </div>
          )}

          {/* Resultado da sincronização */}
          {lastResult && !syncing && (
            <div className={`p-3 rounded-lg ${
              lastResult.erros
                ? "bg-red-50 dark:bg-red-500/10"
                : "bg-green-50 dark:bg-green-500/10"
            }`}>
              <div className="flex items-start gap-3">
                {lastResult.erros ? (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  {lastResult.erros ? (
                    <p className="text-red-600 dark:text-red-400">
                      Erro: {lastResult.erros}
                    </p>
                  ) : (
                    <div className="space-y-1 text-green-600 dark:text-green-400">
                      <p className="font-medium">Sincronização concluída!</p>
                      <p>📊 Dias sincronizados: {lastResult.diasSincronizados}</p>
                      <p>✅ Dias fechados: {lastResult.diasFechados}</p>
                      <p>⏭️ Dias ignorados: {lastResult.diasIgnorados}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Informações */}
          <div className="p-3 bg-gray-50 dark:bg-gray-500/10 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <p>
              A sincronização importará dados do relatório 0184 (Faturamento por tipos de venda) do Avec para o mês selecionado.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={syncing}
            >
              Fechar
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="gap-2 bg-pink-600 hover:bg-pink-700"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sincronizar Agora
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
