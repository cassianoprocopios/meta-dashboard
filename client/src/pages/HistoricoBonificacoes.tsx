import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CheckCircle, Clock, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const EMPRESAS = [
  { slug: "barbiero-mascote", label: "Mascote" },
  { slug: "barbiero-morumbi", label: "Morumbi" },
];

const fmt = (v: string | number | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const pct = (total: number, meta: number) => {
  if (!meta) return 0;
  return Math.round((total / meta) * 100);
};

type HistoricoRow = {
  id: number;
  empresaSlug: string;
  mes: number;
  ano: number;
  faturamentoTotal: string;
  metaMensal: string;
  superMeta: string;
  atingiuMeta: number;
  atingiuSuperMeta: number;
  valorQuinzenal: string;
  valorMensal: string;
  valorSuperMeta: string;
  totalPago: string;
  observacao: string | null;
  pagoEm: Date | null;
};

type FormData = {
  id?: number;
  empresaSlug: string;
  mes: number;
  ano: number;
  faturamentoTotal: string;
  metaMensal: string;
  superMeta: string;
  atingiuMeta: number;
  atingiuSuperMeta: number;
  valorQuinzenal: string;
  valorMensal: string;
  valorSuperMeta: string;
  totalPago: string;
  observacao: string;
  pagoEm: string;
};

const emptyForm = (ano: number): FormData => ({
  empresaSlug: "barbiero-mascote",
  mes: new Date().getMonth() + 1,
  ano,
  faturamentoTotal: "0",
  metaMensal: "0",
  superMeta: "0",
  atingiuMeta: 0,
  atingiuSuperMeta: 0,
  valorQuinzenal: "0",
  valorMensal: "0",
  valorSuperMeta: "0",
  totalPago: "0",
  observacao: "",
  pagoEm: "",
});

export default function HistoricoBonificacoes() {
  const { user } = useAuth();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm(anoAtual));

  const mesAtual = new Date().getMonth() + 1;
  const { data: historico, isLoading, refetch } = trpc.bonificacao.listarHistorico.useQuery({ ano });
  const salvar = trpc.bonificacao.salvarHistorico.useMutation({
    onSuccess: () => { toast.success("Registro salvo!"); setDialogOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deletar = trpc.bonificacao.deletarHistorico.useMutation({
    onSuccess: () => { toast.success("Registro excluído!"); setDeleteId(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const fecharMes = trpc.bonificacao.fecharMesAutomatico.useMutation({
    onSuccess: () => {
      toast.success(`Fechamento de ${MESES[mesAtual - 1]}/${ano} concluído! Histórico atualizado.`);
      refetch();
    },
    onError: (e) => toast.error(`Erro ao fechar mês: ${e.message}`),
  });

  const isAdmin = user?.role === "admin";

  const openNew = () => {
    setForm(emptyForm(ano));
    setDialogOpen(true);
  };

  const openEdit = (row: HistoricoRow) => {
    setForm({
      id: row.id,
      empresaSlug: row.empresaSlug,
      mes: row.mes,
      ano: row.ano,
      faturamentoTotal: row.faturamentoTotal,
      metaMensal: row.metaMensal,
      superMeta: row.superMeta,
      atingiuMeta: row.atingiuMeta,
      atingiuSuperMeta: row.atingiuSuperMeta,
      valorQuinzenal: row.valorQuinzenal,
      valorMensal: row.valorMensal,
      valorSuperMeta: row.valorSuperMeta,
      totalPago: row.totalPago,
      observacao: row.observacao ?? "",
      pagoEm: row.pagoEm ? new Date(row.pagoEm).toISOString().split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    salvar.mutate({
      ...form,
      pagoEm: form.pagoEm ? new Date(form.pagoEm) : null,
    });
  };

  // Agrupar por mês
  const porMes: Record<number, HistoricoRow[]> = {};
  (historico ?? []).forEach((row) => {
    if (!porMes[row.mes]) porMes[row.mes] = [];
    porMes[row.mes].push(row as HistoricoRow);
  });
  const mesesComDados = Object.keys(porMes).map(Number).sort((a, b) => b - a);

  // Totais anuais
  const totalAnual = (historico ?? []).reduce((acc: number, r) => acc + parseFloat(r.totalPago || "0"), 0);
  const totalFaturamento = (historico ?? []).reduce((acc: number, r) => acc + parseFloat(r.faturamentoTotal || "0"), 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#12233f]">Histórico de Bonificações</h1>
            <p className="text-slate-500 text-sm mt-1">Registro mensal de bonificações pagas por unidade</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de ano */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-[10px] px-2 py-1 shadow-sm">
              <button onClick={() => setAno(a => a - 1)} className="p-1 text-slate-400 hover:text-[#12233f]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[#12233f] font-semibold w-12 text-center">{ano}</span>
              <button onClick={() => setAno(a => a + 1)} className="p-1 text-slate-400 hover:text-[#12233f]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {(isAdmin || user?.perfil === "gerente") && (
              <Button
                onClick={() => fecharMes.mutate({ mes: mesAtual, ano })}
                disabled={fecharMes.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                title={`Calcular e salvar automaticamente o histórico de ${MESES[mesAtual - 1]}/${ano}`}
              >
                {fecharMes.isPending ? (
                  <span className="flex items-center gap-1"><span className="animate-spin">⏳</span> Calculando...</span>
                ) : (
                  <span className="flex items-center gap-1">📊 Fechar {MESES[mesAtual - 1]}</span>
                )}
              </Button>
            )}
            {isAdmin && (
              <Button onClick={openNew} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> Registrar
              </Button>
            )}
          </div>
        </div>

        {/* Cards de resumo anual */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="premium-kpi p-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Faturamento Total {ano}</p>
            <p className="text-[#12233f] text-xl font-bold">{fmt(totalFaturamento)}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-emerald-700 text-xs uppercase tracking-widest mb-1">Total Pago em Bonificações {ano}</p>
            <p className="text-emerald-800 text-xl font-bold">{fmt(totalAnual)}</p>
          </div>
          <div className="premium-kpi p-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">% Bonif. / Faturamento</p>
            <p className="text-[#12233f] text-xl font-bold">
              {totalFaturamento > 0 ? ((totalAnual / totalFaturamento) * 100).toFixed(2) : "0.00"}%
            </p>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12 text-slate-400">Carregando...</div>
        )}

        {/* Sem dados */}
        {!isLoading && mesesComDados.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Nenhum registro para {ano}</p>
            {isAdmin && (
              <Button onClick={openNew} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-1" /> Registrar primeiro mês
              </Button>
            )}
          </div>
        )}

        {/* Tabela por mês */}
        {mesesComDados.map((mes) => {
          const rows = porMes[mes];
          const totalMes = rows.reduce((acc, r) => acc + parseFloat(r.totalPago || "0"), 0);
          return (
            <div key={mes} className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Header do mês */}
              <div className="px-5 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-[#12233f] font-bold text-base">{MESES[mes - 1]} {ano}</span>
                  <span className="text-slate-400 text-sm">{rows.length} unidade{rows.length > 1 ? "s" : ""}</span>
                </div>
                <span className="text-emerald-700 font-bold">{fmt(totalMes)}</span>
              </div>

              {/* Linhas por unidade */}
              {rows.map((row) => {
                const empresa = EMPRESAS.find(e => e.slug === row.empresaSlug);
                const pctMeta = pct(parseFloat(row.faturamentoTotal), parseFloat(row.metaMensal));
                return (
                  <div key={row.id} className="px-5 py-4 border-t border-slate-100 bg-white transition-colors hover:bg-slate-50/70">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[#12233f] font-semibold">{empresa?.label ?? row.empresaSlug}</span>
                          {row.atingiuSuperMeta ? (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-medium">Super Meta ⭐</span>
                          ) : row.atingiuMeta ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-medium">Meta atingida ✅</span>
                          ) : (
                            <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full font-medium">Sem meta</span>
                          )}
                          {row.pagoEm && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Pago em {new Date(row.pagoEm).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {!row.pagoEm && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                        </div>

                        {/* Grid de valores */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wide">Faturamento</p>
                            <p className="text-slate-800 text-sm font-medium">{fmt(row.faturamentoTotal)}</p>
                            <p className="text-slate-400 text-[10px]">{pctMeta}% da meta</p>
                          </div>
                          {parseFloat(row.valorQuinzenal) > 0 && (
                            <div>
                              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Quinzenal</p>
                              <p className="text-blue-300 text-sm font-medium">{fmt(row.valorQuinzenal)}</p>
                            </div>
                          )}
                          {parseFloat(row.valorMensal) > 0 && (
                            <div>
                              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Mensal</p>
                              <p className="text-emerald-300 text-sm font-medium">{fmt(row.valorMensal)}</p>
                            </div>
                          )}
                          {parseFloat(row.valorSuperMeta) > 0 && (
                            <div>
                              <p className="text-slate-500 text-[10px] uppercase tracking-wide">Super Meta</p>
                              <p className="text-purple-300 text-sm font-medium">{fmt(row.valorSuperMeta)}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wide">Total Pago</p>
                            <p className="text-emerald-300 text-base font-bold">{fmt(row.totalPago)}</p>
                          </div>
                        </div>

                        {row.observacao && (
                          <p className="text-slate-400 text-xs mt-2 italic">"{row.observacao}"</p>
                        )}
                      </div>

                      {/* Ações */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-blue-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-900/20">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dialog de edição/criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="premium-form-scope max-w-lg border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Registro" : "Novo Registro de Bonificação"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-slate-300">Unidade</Label>
              <Select value={form.empresaSlug} onValueChange={v => setForm(f => ({ ...f, empresaSlug: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {EMPRESAS.map(e => <SelectItem key={e.slug} value={e.slug} className="text-slate-700">{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Mês</Label>
              <Select value={String(form.mes)} onValueChange={v => setForm(f => ({ ...f, mes: Number(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)} className="text-slate-700">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Ano</Label>
              <Input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Faturamento Total</Label>
              <Input value={form.faturamentoTotal} onChange={e => setForm(f => ({ ...f, faturamentoTotal: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Meta Mensal</Label>
              <Input value={form.metaMensal} onChange={e => setForm(f => ({ ...f, metaMensal: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Super Meta</Label>
              <Input value={form.superMeta} onChange={e => setForm(f => ({ ...f, superMeta: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Valor Quinzenal</Label>
              <Input value={form.valorQuinzenal} onChange={e => setForm(f => ({ ...f, valorQuinzenal: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Valor Mensal</Label>
              <Input value={form.valorMensal} onChange={e => setForm(f => ({ ...f, valorMensal: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Valor Super Meta</Label>
              <Input value={form.valorSuperMeta} onChange={e => setForm(f => ({ ...f, valorSuperMeta: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Total Pago</Label>
              <Input value={form.totalPago} onChange={e => setForm(f => ({ ...f, totalPago: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1 font-bold" placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-300">Data de Pagamento</Label>
              <Input type="date" value={form.pagoEm} onChange={e => setForm(f => ({ ...f, pagoEm: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Atingiu Meta?</Label>
              <Select value={String(form.atingiuMeta)} onValueChange={v => setForm(f => ({ ...f, atingiuMeta: Number(v) }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="0" className="text-slate-700">Não</SelectItem>
                  <SelectItem value="1" className="text-slate-700">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-slate-300">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white mt-1" placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={salvar.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="premium-form-scope max-w-sm border-slate-200 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-slate-600 text-slate-300">
              Cancelar
            </Button>
            <Button onClick={() => deleteId && deletar.mutate({ id: deleteId })}
              disabled={deletar.isPending} className="bg-red-600 hover:bg-red-700">
              {deletar.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
