import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [novaExclusao, setNovaExclusao] = useState("");

  const { data: colaboradores = [], isLoading, refetch } = trpc.profissionais.listar.useQuery();
  const { data: empresas = [] } = trpc.empresa.listar.useQuery();

  // Exclusões de categorias do colaborador em edição
  const { data: exclusoes = [], refetch: refetchExclusoes } = trpc.profissionais.listarExclusoes.useQuery(
    { colaboradorId: form.id! },
    { enabled: !!form.id }
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Colaboradores</h1>
          <p className="text-white/50 text-sm mt-1">
            Gerencie unidades, status e dados de cada profissional
          </p>
        </div>
        <Button onClick={abrirNovo} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Colaborador
        </Button>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por nome ou apelido..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
          <SelectTrigger className="w-full sm:w-52 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Todas as unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {EMPRESAS.map((e) => (
              <SelectItem key={e.slug} value={e.slug}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-40 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${!c.ativo ? "opacity-50" : ""}`}
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
                      onClick={() => toggleAtivo.mutate({ id: c.id, ativo: !c.ativo })}
                      className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      title={c.ativo ? "Desativar" : "Ativar"}
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
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        <DialogContent className="bg-[#1a1f2e] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome e Apelido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Apelido</Label>
                <Input
                  value={form.apelido}
                  onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
                  placeholder="Como é chamado"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Unidade */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Unidade *</Label>
              <Select
                value={form.empresaSlug}
                onValueChange={(v) => setForm((f) => ({ ...f, empresaSlug: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPRESAS.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.empresaSlug === "barbiero-grupo" && (
                <p className="text-yellow-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Sem unidade: não aparece no ranking de nenhuma unidade
                </p>
              )}
            </div>

            {/* Cargo e Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Cargo</Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                  placeholder="Barbeiro"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Categoria Ranking</Label>
                <Select
                  value={form.categoriaRanking}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoriaRanking: v as any }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meta Mensal e ID CashBarber */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Meta Mensal (R$)</Label>
                <Input
                  type="number"
                  value={form.metaMensal}
                  onChange={(e) => setForm((f) => ({ ...f, metaMensal: e.target.value }))}
                  placeholder="Ex: 5000"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">ID CashBarber</Label>
                <Input
                  type="number"
                  value={form.cashbarberProfissionalId}
                  onChange={(e) => setForm((f) => ({ ...f, cashbarberProfissionalId: e.target.value }))}
                  placeholder="Ex: 29459"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* PIN e Telefone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">PIN de Acesso</Label>
                <Input
                  value={form.pinAcesso}
                  onChange={(e) => setForm((f) => ({ ...f, pinAcesso: e.target.value }))}
                  placeholder="Ex: 1234"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">WhatsApp</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="5511999999999"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Switches */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-3">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                />
                <Label className="text-white/60 text-xs text-center">Ativo</Label>
              </div>
              <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-3">
                <Switch
                  checked={form.exibirNoRanking}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, exibirNoRanking: v }))}
                />
                <Label className="text-white/60 text-xs text-center">No Ranking</Label>
              </div>
              <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-3">
                <Switch
                  checked={form.isGerencia}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isGerencia: v }))}
                />
                <Label className="text-white/60 text-xs text-center">Gerência</Label>
              </div>
            </div>

            {/* Exclusões de categorias do ranking (apenas ao editar) */}
            {form.id && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <Label className="text-white/70 text-xs">Categorias excluídas do ranking</Label>
                </div>
                <p className="text-white/40 text-xs">Serviços com esses nomes não serão somados no faturamento deste profissional.</p>
                {/* Lista de exclusões existentes */}
                {exclusoes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {exclusoes.map((exc: any) => (
                      <span
                        key={exc.id}
                        className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs px-2 py-0.5 rounded-full"
                      >
                        {exc.nomeCategoria}
                        <button
                          type="button"
                          onClick={() => removerExclusao.mutate({ id: exc.id })}
                          className="text-amber-400 hover:text-red-400 transition-colors ml-0.5"
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-xs h-8"
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
              className="border-white/10 text-white/70 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvar.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {salvar.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
              ) : (
                form.id ? "Salvar Alterações" : "Criar Colaborador"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={confirmDeleteId !== null} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="bg-[#1a1f2e] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 text-sm">
            Tem certeza que deseja remover este colaborador? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              className="border-white/10 text-white/70 hover:bg-white/5"
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
  );
}
