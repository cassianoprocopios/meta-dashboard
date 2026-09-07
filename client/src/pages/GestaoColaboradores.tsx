import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserX,
  Trash2,
  Building2,
  Loader2,
  AlertTriangle,
  X,
  Tag,
} from "lucide-react";

type Colaborador = {
  id: number;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  cargo: string | null;
  empresaSlug: string;
  categoriaRanking: "barbeiro" | "auxiliar" | "recepcao";
  exibirNoRanking: boolean;
  ativo: boolean;
  isGerencia: boolean;
  cashbarberProfissionalId: number | null;
  pinAcesso: string | null;
  telefone: string | null;
  metaMensal: number | null;
};

const EMPRESAS = [
  { slug: "barbiero-mascote", label: "Barbiero Mascote" },
  { slug: "barbiero-morumbi", label: "Barbiero Morumbi" },
  { slug: "barbiero-grupo", label: "Grupo (sem unidade)" },
];

const CATEGORIAS = [
  { value: "barbeiro", label: "Barbeiro" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "recepcao", label: "Recepção" },
];

function empresaLabel(slug: string) {
  return EMPRESAS.find((e) => e.slug === slug)?.label ?? slug;
}

function empresaBadgeColor(slug: string) {
  if (slug === "barbiero-mascote") return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (slug === "barbiero-morumbi") return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
}

const EMPTY_FORM = {
  id: undefined as number | undefined,
  nome: "",
  apelido: "",
  cargo: "Barbeiro",
  empresaSlug: "barbiero-mascote",
  categoriaRanking: "barbeiro" as "barbeiro" | "auxiliar" | "recepcao",
  cashbarberProfissionalId: "" as string,
  pinAcesso: "",
  telefone: "",
  metaMensal: "" as string,
  exibirNoRanking: true,
  ativo: true,
  isGerencia: false,
};

export default function GestaoColaboradores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGerente = user?.perfil === "gerente";
  const podeGerenciarUnidades = isAdmin || isGerente;
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [novaExclusao, setNovaExclusao] = useState("");

  const { data: colaboradores = [], isLoading, refetch } = trpc.profissionais.listar.useQuery(
    undefined,
    { enabled: podeGerenciarUnidades }
  );
  const { data: empresas = [] } = trpc.empresa.listar.useQuery(
    undefined,
    { enabled: podeGerenciarUnidades }
  );

  // Exclusões de categorias do colaborador em edição
  const { data: exclusoes = [], refetch: refetchExclusoes } = trpc.profissionais.listarExclusoes.useQuery(
    { colaboradorId: form.id! },
    { enabled: !!form.id && isAdmin }
  );

  const adicionarExclusao = trpc.profissionais.adicionarExclusao.useMutation({
    onSuccess: () => {
      setNovaExclusao("");
      refetchExclusoes();
      toast.success("Categoria excluída do ranking");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const removerExclusao = trpc.profissionais.removerExclusao.useMutation({
    onSuccess: () => {
      refetchExclusoes();
      toast.success("Regra removida");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const salvar = trpc.profissionais.salvar.useMutation({
    onSuccess: () => {
      toast.success(form.id ? `Colaborador atualizado: ${form.nome}` : `Colaborador criado: ${form.nome}`);
      setDialogAberto(false);
      refetch();
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const atualizarUnidade = trpc.profissionais.atualizarUnidade.useMutation({
    onSuccess: () => {
      toast.success(`Unidade atualizada para ${empresaLabel(form.empresaSlug)}`);
      setDialogAberto(false);
      refetch();
    },
    onError: (e) => toast.error(`Erro ao atualizar unidade: ${e.message}`),
  });

  const toggleAtivo = trpc.profissionais.toggleAtivo.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const deletar = trpc.profissionais.deletar.useMutation({
    onSuccess: () => {
      toast.success("Colaborador removido");
      setConfirmDeleteId(null);
      refetch();
    },
    onError: (e) => toast.error(`Erro ao remover: ${e.message}`),
  });

  const listaFiltrada = useMemo(() => {
    return colaboradores.filter((c) => {
      const matchBusca =
        busca === "" ||
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.apelido ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchEmpresa =
        filtroEmpresa === "todas" || c.empresaSlug === filtroEmpresa;
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativos" && c.ativo) ||
        (filtroStatus === "inativos" && !c.ativo);
      return matchBusca && matchEmpresa && matchStatus;
    });
  }, [colaboradores, busca, filtroEmpresa, filtroStatus]);

  // Estatísticas
  const stats = useMemo(() => {
    const ativos = colaboradores.filter((c) => c.ativo);
    const semUnidade = colaboradores.filter(
      (c) => c.empresaSlug === "barbiero-grupo" || !c.empresaSlug
    );
    const semCbId = colaboradores.filter(
      (c) => c.ativo && !c.cashbarberProfissionalId
    );
    return { total: colaboradores.length, ativos: ativos.length, semUnidade: semUnidade.length, semCbId: semCbId.length };
  }, [colaboradores]);

  function abrirNovo() {
    setForm({ ...EMPTY_FORM });
    setDialogAberto(true);
  }

  function abrirEditar(c: Colaborador) {
    setForm({
      id: c.id,
      nome: c.nome,
      apelido: c.apelido ?? "",
      cargo: c.cargo ?? "Barbeiro",
      empresaSlug: c.empresaSlug,
      categoriaRanking: c.categoriaRanking,
      cashbarberProfissionalId: c.cashbarberProfissionalId?.toString() ?? "",
      pinAcesso: c.pinAcesso ?? "",
      telefone: c.telefone ?? "",
      metaMensal: c.metaMensal?.toString() ?? "",
      exibirNoRanking: c.exibirNoRanking,
      ativo: c.ativo,
      isGerencia: c.isGerencia,
    });
    setDialogAberto(true);
  }

  function handleSalvar() {
    if (!isAdmin) {
      if (!isGerente || !form.id) {
        toast.error("Acesso restrito a gerentes e administradores");
        return;
      }
      atualizarUnidade.mutate({
        id: form.id,
        empresaSlug: form.empresaSlug,
      });
      return;
    }
    if (!form.nome.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    salvar.mutate({
      id: form.id,
      nome: form.nome.trim(),
      apelido: form.apelido.trim() || null,
      cargo: form.cargo.trim() || "Barbeiro",
      empresaSlug: form.empresaSlug,
      categoriaRanking: form.categoriaRanking,
      cashbarberProfissionalId: form.cashbarberProfissionalId
        ? parseInt(form.cashbarberProfissionalId)
        : null,
      pinAcesso: form.pinAcesso.trim() || null,
      telefone: form.telefone.trim() || null,
      metaMensal: form.metaMensal ? parseFloat(form.metaMensal) : null,
      exibirNoRanking: form.exibirNoRanking,
      ativo: form.ativo,
      isGerencia: form.isGerencia,
    });
  }

  const slugsEmpresasDisponiveis = useMemo(() => {
    const slugsDoBackend = empresas.map((e: any) => e.slug);
    return EMPRESAS.filter(
      (e) => slugsDoBackend.includes(e.slug) || e.slug === "barbiero-grupo"
    );
  }, [empresas]);

  if (!podeGerenciarUnidades) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-[#12233f]">Acesso restrito</h1>
            <p className="text-slate-500 text-sm mt-2">
              A Gestão de Colaboradores está disponível somente para gerentes e administradores.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="people-light-scope space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#12233f]">Gestão de Colaboradores</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin
              ? "Gerencie unidades, status e dados de cada profissional"
              : "Defina a unidade de cada profissional"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </Button>
        )}
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs">Total</p>
          <p className="text-white text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-xs">Ativos</p>
          <p className="text-green-400 text-2xl font-bold">{stats.ativos}</p>
        </div>
        <div className={`border rounded-xl p-4 ${stats.semUnidade > 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/5 border-white/10"}`}>
          <p className="text-white/50 text-xs">Sem Unidade</p>
          <p className={`text-2xl font-bold ${stats.semUnidade > 0 ? "text-yellow-400" : "text-white"}`}>
            {stats.semUnidade}
          </p>
        </div>
        <div className={`border rounded-xl p-4 ${stats.semCbId > 0 ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"}`}>
          <p className="text-white/50 text-xs">Sem ID CashBarber</p>
          <p className={`text-2xl font-bold ${stats.semCbId > 0 ? "text-orange-400" : "text-white"}`}>
            {stats.semCbId}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {stats.semUnidade > 0 && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm">
            <strong>{stats.semUnidade} colaborador(es)</strong> sem unidade definida — eles não aparecem no ranking de nenhuma unidade. Clique em editar para corrigir.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border-slate-300 bg-white pl-9 text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
          <SelectTrigger className="w-full border-slate-300 bg-white text-slate-900 sm:w-52">
            <SelectValue placeholder="Todas as unidades" />
          </SelectTrigger>
          <SelectContent className="people-select-content">
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {EMPRESAS.map((e) => (
              <SelectItem key={e.slug} value={e.slug}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full border-slate-300 bg-white text-slate-900 sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="people-select-content">
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <p>Nenhum colaborador encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-white/50 font-medium px-4 py-3">Nome</th>
                <th className="text-left text-white/50 font-medium px-4 py-3">Unidade</th>
                <th className="text-left text-white/50 font-medium px-4 py-3 hidden md:table-cell">Cargo / Categoria</th>
                <th className="text-left text-white/50 font-medium px-4 py-3 hidden lg:table-cell">Meta Mensal</th>
                <th className="text-left text-white/50 font-medium px-4 py-3 hidden lg:table-cell">ID CashBarber</th>
                <th className="text-center text-white/50 font-medium px-4 py-3">Status</th>
                <th className="text-center text-white/50 font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${!c.ativo ? "opacity-70" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.fotoUrl ? (
                        <img src={c.fotoUrl} alt={c.nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-300 text-xs font-bold">{c.nome.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{c.nome}</p>
                        {c.apelido && <p className="text-white/40 text-xs">{c.apelido}</p>}
                        {c.isGerencia && <span className="text-xs text-amber-400">Gerência</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${empresaBadgeColor(c.empresaSlug)}`}>
                      <Building2 className="w-3 h-3" />
                      {empresaLabel(c.empresaSlug)}
                    </span>
                    {(c.empresaSlug === "barbiero-grupo" || !c.empresaSlug) && (
                      <span className="ml-1 text-yellow-400 text-xs">⚠️</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-white/80">{c.cargo ?? "—"}</p>
                    <p className="text-white/40 text-xs capitalize">{c.categoriaRanking}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.metaMensal ? (
                      <span className="text-green-400 font-medium">
                        R$ {c.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {c.cashbarberProfissionalId ? (
                      <span className="text-white/60 font-mono text-xs">#{c.cashbarberProfissionalId}</span>
                    ) : (
                      <span className="text-orange-400 text-xs">Não vinculado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => isAdmin && toggleAtivo.mutate({ id: c.id, ativo: !c.ativo })}
                      disabled={!isAdmin}
                      className={`inline-flex items-center gap-1.5 ${isAdmin ? "transition-opacity hover:opacity-80" : "cursor-default"}`}
                      title={isAdmin ? (c.ativo ? "Desativar" : "Ativar") : "Somente administradores alteram o status"}
                    >
                      {c.ativo ? (
                        <UserCheck className="w-4 h-4 text-green-400" />
                      ) : (
                        <UserX className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-xs ${c.ativo ? "text-green-400" : "text-red-400"}`}>
                        {c.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(c)}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                        title={isAdmin ? "Editar" : "Alterar unidade"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contagem */}
      {!isLoading && (
        <p className="text-white/30 text-xs text-right">
          {listaFiltrada.length} de {colaboradores.length} colaboradores
        </p>
      )}

      {/* Dialog de edição/criação */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="premium-form-scope bg-white border-slate-200 text-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAdmin
                ? (form.id ? "Editar Colaborador" : "Novo Colaborador")
                : `Alterar unidade — ${form.nome}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome e Apelido */}
            {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Apelido</Label>
                <Input
                  value={form.apelido}
                  onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
                  placeholder="Como é chamado"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            )}

            {/* Unidade */}
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-xs font-medium">Unidade *</Label>
              <Select
                value={form.empresaSlug}
                onValueChange={(v) => setForm((f) => ({ ...f, empresaSlug: v }))}
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="people-select-content">
                  {EMPRESAS.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.empresaSlug === "barbiero-grupo" && (
                <p className="text-amber-700 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Sem unidade: não aparece no ranking de nenhuma unidade
                </p>
              )}
            </div>

            {/* Cargo e Categoria */}
            {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Cargo</Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                  placeholder="Barbeiro"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Categoria Ranking</Label>
                <Select
                  value={form.categoriaRanking}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoriaRanking: v as any }))}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="people-select-content">
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}

            {/* Meta Mensal e ID CashBarber */}
            {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">Meta Mensal (R$)</Label>
                <Input
                  type="number"
                  value={form.metaMensal}
                  onChange={(e) => setForm((f) => ({ ...f, metaMensal: e.target.value }))}
                  placeholder="Ex: 5000"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">ID CashBarber</Label>
                <Input
                  type="number"
                  value={form.cashbarberProfissionalId}
                  onChange={(e) => setForm((f) => ({ ...f, cashbarberProfissionalId: e.target.value }))}
                  placeholder="Ex: 29459"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            )}

            {/* PIN e Telefone */}
            {isAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">PIN de Acesso</Label>
                <Input
                  value={form.pinAcesso}
                  onChange={(e) => setForm((f) => ({ ...f, pinAcesso: e.target.value }))}
                  placeholder="Ex: 1234"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-medium">WhatsApp</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="5511999999999"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
            )}

            {/* Switches */}
            {isAdmin && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                />
                <Label className="text-slate-700 text-xs font-medium text-center">Ativo</Label>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Switch
                  checked={form.exibirNoRanking}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, exibirNoRanking: v }))}
                />
                <Label className="text-slate-700 text-xs font-medium text-center">No Ranking</Label>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Switch
                  checked={form.isGerencia}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isGerencia: v }))}
                />
                <Label className="text-slate-700 text-xs font-medium text-center">Gerência</Label>
              </div>
            </div>
            )}

            {/* Exclusões de categorias do ranking (apenas ao editar) */}
            {isAdmin && form.id && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <Label className="text-slate-700 text-xs font-medium">Categorias excluídas do ranking</Label>
                </div>
                <p className="text-slate-500 text-xs">Serviços com esses nomes não serão somados no faturamento deste profissional.</p>
                {/* Lista de exclusões existentes */}
                {exclusoes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {exclusoes.map((exc: any) => (
                      <span
                        key={exc.id}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                      >
                        {exc.nomeCategoria}
                        <button
                          type="button"
                          onClick={() => removerExclusao.mutate({ id: exc.id })}
                          className="ml-0.5 text-amber-700 transition-colors hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Adicionar nova exclusão */}
                <div className="flex gap-2">
                  <Input
                    value={novaExclusao}
                    onChange={(e) => setNovaExclusao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novaExclusao.trim() && form.id) {
                        adicionarExclusao.mutate({ colaboradorId: form.id, nomeCategoria: novaExclusao.trim() });
                      }
                    }}
                    placeholder="Ex: Corte Cabelo, Barba..."
                    className="h-8 border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (novaExclusao.trim() && form.id) {
                        adicionarExclusao.mutate({ colaboradorId: form.id, nomeCategoria: novaExclusao.trim() });
                      }
                    }}
                    disabled={!novaExclusao.trim() || adicionarExclusao.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-3 text-xs flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogAberto(false)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvar.isPending || atualizarUnidade.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {salvar.isPending || atualizarUnidade.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
              ) : (
                isAdmin ? (form.id ? "Salvar Alterações" : "Criar Colaborador") : "Salvar Unidade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="premium-form-scope bg-white border-slate-200 text-slate-900 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">
            Tem certeza que deseja remover este colaborador? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDeleteId && deletar.mutate({ id: confirmDeleteId })}
              disabled={deletar.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
