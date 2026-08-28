import { useEffect, useMemo, useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface EmpresaFechamento {
  slug: string;
  nome: string;
  cor: string;
}

interface Props {
  mes: number;
  ano: number;
  empresasData: EmpresaFechamento[];
  podeEditar: boolean;
}

function formatarData(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function FechamentosConfig({ mes, ano, empresasData, podeEditar }: Props) {
  const utils = trpc.useUtils();
  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const fimMes = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  const [empresaSlug, setEmpresaSlug] = useState(empresasData[0]?.slug ?? "");
  const [data, setData] = useState(inicioMes);
  const [motivo, setMotivo] = useState("");

  const { data: fechamentos = [], isLoading } = trpc.fechamentos.listar.useQuery({ mes, ano });
  const criar = trpc.fechamentos.criar.useMutation();
  const excluir = trpc.fechamentos.excluir.useMutation();

  useEffect(() => {
    if (!empresasData.some((empresa) => empresa.slug === empresaSlug)) {
      setEmpresaSlug(empresasData[0]?.slug ?? "");
    }
  }, [empresaSlug, empresasData]);

  useEffect(() => {
    setData(inicioMes);
  }, [inicioMes]);

  const empresasPorSlug = useMemo(
    () => Object.fromEntries(empresasData.map((empresa) => [empresa.slug, empresa])),
    [empresasData]
  );

  const atualizar = async () => {
    await utils.fechamentos.listar.invalidate({ mes, ano });
  };

  const handleCriar = async () => {
    if (!empresaSlug || !data || motivo.trim().length < 2) {
      toast.error("Selecione a unidade, a data e informe o motivo do fechamento.");
      return;
    }
    if (data < inicioMes || data > fimMes) {
      toast.error("A data deve pertencer ao mês selecionado.");
      return;
    }

    try {
      await criar.mutateAsync({ empresaSlug, data, motivo: motivo.trim() });
      setMotivo("");
      await atualizar();
      toast.success("Fechamento cadastrado. Os dias restantes foram recalculados.");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível cadastrar o fechamento.");
    }
  };

  const handleExcluir = async (id: number) => {
    try {
      await excluir.mutateAsync({ id });
      await atualizar();
      toast.success("Fechamento removido. Os dias restantes foram recalculados.");
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível remover o fechamento.");
    }
  };

  return (
    <Card className="border border-gray-800 bg-gray-950 p-5 shadow-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <CalendarOff className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Feriados e fechamentos excepcionais</h3>
            <p className="mt-1 text-sm text-gray-400">
              Cadastre dias sem expediente para ajustar automaticamente Dias rest., R$/dia e projeção.
            </p>
          </div>
        </div>

        {podeEditar && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(180px,0.8fr)_170px_minmax(220px,1.4fr)_auto]">
            <select
              value={empresaSlug}
              onChange={(event) => setEmpresaSlug(event.target.value)}
              className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              aria-label="Unidade do fechamento"
            >
              {empresasData.map((empresa) => (
                <option key={empresa.slug} value={empresa.slug}>{empresa.nome}</option>
              ))}
            </select>
            <Input
              type="date"
              value={data}
              min={inicioMes}
              max={fimMes}
              onChange={(event) => setData(event.target.value)}
              className="border-gray-700 bg-gray-900 text-white"
              aria-label="Data do fechamento"
            />
            <Input
              value={motivo}
              maxLength={255}
              onChange={(event) => setMotivo(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") void handleCriar(); }}
              placeholder="Motivo: feriado, manutenção, evento..."
              className="border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
              aria-label="Motivo do fechamento"
            />
            <Button
              onClick={() => void handleCriar()}
              disabled={criar.isPending || !empresaSlug}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
            >
              {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando fechamentos...
            </div>
          ) : fechamentos.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Nenhum fechamento excepcional neste mês.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {fechamentos.map((fechamento) => {
                const empresa = empresasPorSlug[fechamento.empresaSlug];
                return (
                  <div key={fechamento.id} className="flex items-center gap-3 bg-black/20 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: empresa?.cor ?? "#64748b" }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {formatarData(fechamento.data)} · {empresa?.nome ?? fechamento.empresaSlug}
                      </p>
                      <p className="truncate text-xs text-gray-400">{fechamento.motivo}</p>
                    </div>
                    {podeEditar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleExcluir(fechamento.id)}
                        disabled={excluir.isPending}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        aria-label={`Excluir fechamento de ${formatarData(fechamento.data)}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
