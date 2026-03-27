import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Target, RefreshCw, Trophy, TrendingUp, Edit2, Eye, EyeOff, Plus, Star
} from "lucide-react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ColaboradoresMetas() {
  const { user } = useAuth();


  const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [empresaSlug, setEmpresaSlug] = useState<string>("");
  const [editando, setEditando] = useState<null | {
    colaboradorId: number; nome: string; metaProdutos: number;
    bonificacaoMeta: number; bonificacaoSuperMeta: number; superMetaPct: number;
  }>(null);

  const empresasQuery = trpc.empresa.listar.useQuery(undefined, { enabled: !!user });
  const empresas = empresasQuery.data ?? [];

  // Selecionar primeira empresa automaticamente
  const empresaAtual = empresaSlug || empresas[0]?.slug || "";

  const colaboradoresQuery = trpc.colaboradores.listar.useQuery(
    { empresaSlug: empresaAtual },
    { enabled: !!empresaAtual }
  );
  const metasQuery = trpc.colaboradores.listarMetas.useQuery(
    { empresaSlug: empresaAtual, mes, ano },
    { enabled: !!empresaAtual }
  );
  const faturamentosQuery = trpc.colaboradores.rankingPublico.useQuery(
    { tenantSlug: "default", mes, ano },
    { enabled: false } // só para admin ver preview
  );

  const colaboradores = colaboradoresQuery.data ?? [];
  const metas = metasQuery.data ?? [];
  const metasMap = useMemo(() => new Map(metas.map((m) => [m.colaboradorId, m])), [metas]);

  const sincronizarMutation = trpc.colaboradores.sincronizar.useMutation({
    onSuccess: (res) => {
      toast.success(`Sincronizado! ${res.faturamentosAtualizados} colaboradores atualizados.`);
      colaboradoresQuery.refetch();
      metasQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const salvarMetaMutation = trpc.colaboradores.salvarMeta.useMutation({
    onSuccess: () => {
      toast.success("Meta salva!");
      setEditando(null);
      metasQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const salvarColaboradorMutation = trpc.colaboradores.salvar.useMutation({
    onSuccess: () => { colaboradoresQuery.refetch(); },
  });

  const handleToggleRanking = (col: { id: number; nome: string; apelido: string | null; exibirNoRanking: number }) => {
    salvarColaboradorMutation.mutate({
      id: col.id,
      empresaSlug: empresaAtual,
      nome: col.nome,
      exibirNoRanking: col.exibirNoRanking === 1 ? 0 : 1,
    });
  };

  const handleSalvarMeta = () => {
    if (!editando) return;
    salvarMetaMutation.mutate({
      colaboradorId: editando.colaboradorId,
      empresaSlug: empresaAtual,
      mes,
      ano,
      metaProdutos: editando.metaProdutos,
      bonificacaoMeta: editando.bonificacaoMeta,
      bonificacaoSuperMeta: editando.bonificacaoSuperMeta,
      superMetaPct: editando.superMetaPct,
    });
  };

  const rankingUrl = `${window.location.origin}/ranking`;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Metas de Colaboradores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure metas mensais e acompanhe o ranking de produtos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de empresa */}
            {empresas.length > 1 && (
              <Select value={empresaAtual} onValueChange={setEmpresaSlug}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Filtro de mês */}
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[ano - 1, ano, ano + 1].map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Sincronizar */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => sincronizarMutation.mutate({ empresaSlug: empresaAtual })}
              disabled={sincronizarMutation.isPending || !empresaAtual}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${sincronizarMutation.isPending ? "animate-spin" : ""}`} />
              Sincronizar CashBarber
            </Button>
          </div>
        </div>

        {/* Link do ranking público */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <Trophy className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium">Ranking público (acesso pelo celular):</span>
            <a
              href={rankingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline break-all"
            >
              {rankingUrl}
            </a>
          </CardContent>
        </Card>

        {/* Tabela de colaboradores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Colaboradores — {MESES[mes - 1]}/{ano}
              <Badge variant="secondary" className="ml-auto">{colaboradores.length} cadastrados</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaboradoresQuery.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : colaboradores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum colaborador cadastrado.</p>
                <p className="text-xs mt-1">Clique em "Sincronizar CashBarber" para importar automaticamente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Colaborador</th>
                      <th className="text-right py-2 px-2 font-medium">Meta Produtos</th>
                      <th className="text-right py-2 px-2 font-medium">Bonif. Meta</th>
                      <th className="text-right py-2 px-2 font-medium">Super Meta</th>
                      <th className="text-center py-2 px-2 font-medium">Ranking</th>
                      <th className="text-right py-2 pl-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map((col) => {
                      const meta = metasMap.get(col.id);
                      return (
                        <tr key={col.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {(col.apelido || col.nome).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{col.nome}</p>
                                {col.apelido && col.apelido !== col.nome && (
                                  <p className="text-xs text-muted-foreground">{col.apelido}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-2 px-2">
                            {meta ? fmtBRL(parseFloat(String(meta.metaProdutos))) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-right py-2 px-2">
                            {meta ? fmtBRL(parseFloat(String(meta.bonificacaoMeta ?? 0))) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-right py-2 px-2">
                            {meta ? (
                              <span className="text-xs">
                                {parseFloat(String(meta.superMetaPct ?? 120))}% → {fmtBRL(parseFloat(String(meta.bonificacaoSuperMeta ?? 0)))}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="text-center py-2 px-2">
                            <button
                              onClick={() => handleToggleRanking(col)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={col.exibirNoRanking ? "Ocultar do ranking" : "Exibir no ranking"}
                            >
                              {col.exibirNoRanking ? (
                                <Eye className="w-4 h-4 text-green-500" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="text-right py-2 pl-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditando({
                                colaboradorId: col.id,
                                nome: col.nome,
                                metaProdutos: parseFloat(String(meta?.metaProdutos ?? 0)),
                                bonificacaoMeta: parseFloat(String(meta?.bonificacaoMeta ?? 0)),
                                bonificacaoSuperMeta: parseFloat(String(meta?.bonificacaoSuperMeta ?? 0)),
                                superMetaPct: parseFloat(String(meta?.superMetaPct ?? 120)),
                              })}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de edição de meta */}
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Meta de {editando?.nome}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Meta de Produtos (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={editando.metaProdutos}
                  onChange={(e) => setEditando({ ...editando, metaProdutos: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Bonificação ao atingir meta (R$)</label>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={editando.bonificacaoMeta}
                  onChange={(e) => setEditando({ ...editando, bonificacaoMeta: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" /> Super Meta (%)
                  </label>
                  <Input
                    type="number"
                    min={100}
                    max={300}
                    step={10}
                    value={editando.superMetaPct}
                    onChange={(e) => setEditando({ ...editando, superMetaPct: parseFloat(e.target.value) || 120 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bonif. Super Meta (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={editando.bonificacaoSuperMeta}
                    onChange={(e) => setEditando({ ...editando, bonificacaoSuperMeta: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {editando.metaProdutos > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">Resumo:</p>
                  <p>Meta: {fmtBRL(editando.metaProdutos)} → Bonif: {fmtBRL(editando.bonificacaoMeta)}</p>
                  <p>Super Meta ({editando.superMetaPct}%): {fmtBRL(editando.metaProdutos * editando.superMetaPct / 100)} → Bonif: {fmtBRL(editando.bonificacaoSuperMeta)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarMeta} disabled={salvarMetaMutation.isPending}>
              {salvarMetaMutation.isPending ? "Salvando..." : "Salvar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
