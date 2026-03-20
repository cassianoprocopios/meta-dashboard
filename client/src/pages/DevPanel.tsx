import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Plus, Edit2, Power, Calendar, Users, BarChart2,
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, X, Loader2,
  Shield, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";

type Plano = "trial" | "basico" | "pro";

const planoLabel: Record<Plano, string> = {
  trial: "Trial",
  basico: "Básico",
  pro: "Pro",
};

const planoCor: Record<Plano, string> = {
  trial: "bg-amber-100 text-amber-700 border-amber-200",
  basico: "bg-blue-100 text-blue-700 border-blue-200",
  pro: "bg-purple-100 text-purple-700 border-purple-200",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function isExpired(validadeAte: Date | string | null | undefined) {
  if (!validadeAte) return false;
  return new Date(validadeAte) < new Date();
}

function isExpiringSoon(validadeAte: Date | string | null | undefined) {
  if (!validadeAte) return false;
  const diff = new Date(validadeAte).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7 dias
}

// ─── Modal de Criação de Tenant ────────────────────────────────────────────────
function ModalCriarTenant({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nome: "",
    slug: "",
    adminEmail: "",
    adminNome: "",
    adminSenha: "",
    plano: "trial" as Plano,
    validadeAte: "",
    observacoes: "",
  });
  const [showSenha, setShowSenha] = useState(false);
  const criar = trpc.devPanel.criarTenant.useMutation();

  const handleSlugAuto = (nome: string) => {
    const slug = nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
    setForm(f => ({ ...f, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await criar.mutateAsync({
        ...form,
        validadeAte: form.validadeAte || null,
        observacoes: form.observacoes || null,
      });
      toast.success(`Tenant "${form.nome}" criado com sucesso!`);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar tenant.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Novo Tenant</h2>
              <p className="text-xs text-slate-500">Cadastrar nova empresa cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dados do Tenant */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Dados da Empresa</h3>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Empresa *</label>
              <Input
                value={form.nome}
                onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); handleSlugAuto(e.target.value); }}
                placeholder="Ex: Salão Beleza Total"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Slug (identificador único) *</label>
              <Input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="Ex: salao-beleza-total"
                required
                pattern="[a-z0-9-]+"
              />
              <p className="text-xs text-slate-400 mt-1">Apenas letras minúsculas, números e hífens</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Plano *</label>
                <select
                  value={form.plano}
                  onChange={e => setForm(f => ({ ...f, plano: e.target.value as Plano }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trial">Trial (gratuito)</option>
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Validade</label>
                <Input
                  type="date"
                  value={form.validadeAte}
                  onChange={e => setForm(f => ({ ...f, validadeAte: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Dados do Admin */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Acesso do Administrador</h3>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nome do Admin *</label>
              <Input
                value={form.adminNome}
                onChange={e => setForm(f => ({ ...f, adminNome: e.target.value }))}
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Email de Acesso * <span className="text-slate-400 font-normal">(pode ser genérico, ex: joao@salaobeleza)</span>
              </label>
              <Input
                value={form.adminEmail}
                onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                placeholder="Ex: admin@salao-beleza-total"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Senha Inicial *</label>
              <div className="relative">
                <Input
                  type={showSenha ? "text" : "password"}
                  value={form.adminSenha}
                  onChange={e => setForm(f => ({ ...f, adminSenha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações internas</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Notas sobre este cliente, contrato, etc."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Tenant
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Edição de Tenant ────────────────────────────────────────────────
function ModalEditarTenant({ tenant, onClose, onSuccess }: { tenant: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nome: tenant.nome ?? "",
    plano: (tenant.plano ?? "trial") as Plano,
    ativo: tenant.ativo ?? 1,
    validadeAte: tenant.validadeAte ? new Date(tenant.validadeAte).toISOString().split("T")[0] : "",
    observacoes: tenant.observacoes ?? "",
  });
  const editar = trpc.devPanel.editarTenant.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await editar.mutateAsync({
        tenantId: tenant.id,
        nome: form.nome,
        plano: form.plano,
        ativo: form.ativo,
        validadeAte: form.validadeAte || null,
        observacoes: form.observacoes || null,
      });
      toast.success("Tenant atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar tenant.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Editar Tenant</h2>
              <p className="text-xs text-slate-500">{tenant.nome} · #{tenant.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Nome da Empresa *</label>
            <Input
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Plano *</label>
              <select
                value={form.plano}
                onChange={e => setForm(f => ({ ...f, plano: e.target.value as Plano }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="basico">Básico</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
              <select
                value={form.ativo}
                onChange={e => setForm(f => ({ ...f, ativo: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Ativo</option>
                <option value={0}>Bloqueado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Validade do Acesso</label>
            <Input
              type="date"
              value={form.validadeAte}
              onChange={e => setForm(f => ({ ...f, validadeAte: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">Deixe em branco para acesso sem validade</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observações internas</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={editar.isPending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              {editar.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal do DevPanel ─────────────────────────────────────────────
export default function DevPanel() {
  const { user, loading } = useAuth();
  const [showCriar, setShowCriar] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "bloqueados" | "expirados">("todos");

  const { data: tenants = [], isLoading, refetch } = trpc.devPanel.listarTenants.useQuery(
    undefined,
    { enabled: !!user && user.role === "admin" && !(user as any).tenantId }
  );
  const toggleAtivo = trpc.devPanel.toggleAtivo.useMutation();

  // Verificar acesso
  const isSuperDev = user?.role === "admin" && !(user as any)?.tenantId;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isSuperDev) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-slate-500">Este painel é exclusivo para o desenvolvedor do sistema.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline text-sm">← Voltar ao início</a>
        </div>
      </div>
    );
  }

  // Filtrar tenants
  const tenantsFiltrados = tenants.filter(t => {
    const matchBusca = !busca || t.nome.toLowerCase().includes(busca.toLowerCase()) || t.slug.includes(busca.toLowerCase()) || t.adminEmail.toLowerCase().includes(busca.toLowerCase());
    const expired = isExpired(t.validadeAte);
    if (filtroStatus === "ativos") return matchBusca && t.ativo === 1 && !expired;
    if (filtroStatus === "bloqueados") return matchBusca && t.ativo === 0;
    if (filtroStatus === "expirados") return matchBusca && expired;
    return matchBusca;
  });

  // Estatísticas
  const totalAtivos = tenants.filter(t => t.ativo === 1 && !isExpired(t.validadeAte)).length;
  const totalBloqueados = tenants.filter(t => t.ativo === 0).length;
  const totalExpirados = tenants.filter(t => isExpired(t.validadeAte)).length;
  const totalUsers = tenants.reduce((s, t) => s + (t.totalUsers ?? 0), 0);

  const handleToggleAtivo = async (t: any) => {
    const novoAtivo = t.ativo === 1 ? 0 : 1;
    try {
      await toggleAtivo.mutateAsync({ tenantId: t.id, ativo: novoAtivo });
      toast.success(novoAtivo === 1 ? `"${t.nome}" ativado.` : `"${t.nome}" bloqueado.`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao alterar status.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Painel do Desenvolvedor</h1>
              <p className="text-xs text-slate-500">Gestão de tenants e licenças</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/" className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              ← Voltar
            </a>
            <Button
              onClick={() => setShowCriar(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" /> Novo Tenant
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total de Tenants", value: tenants.length, icon: Building2, cor: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Ativos", value: totalAtivos, icon: CheckCircle, cor: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Bloqueados / Expirados", value: totalBloqueados + totalExpirados, icon: XCircle, cor: "text-red-500", bg: "bg-red-50" },
            { label: "Total de Usuários", value: totalUsers, icon: Users, cor: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ label, value, icon: Icon, cor, bg }) => (
            <Card key={label} className="p-4 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${cor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, slug ou email..."
            className="flex-1"
          />
          <div className="flex gap-2">
            {(["todos", "ativos", "bloqueados", "expirados"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  filtroStatus === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Tenants */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : tenantsFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum tenant encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenantsFiltrados.map(t => {
              const expired = isExpired(t.validadeAte);
              const expiringSoon = isExpiringSoon(t.validadeAte);
              const statusOk = t.ativo === 1 && !expired;

              return (
                <Card key={t.id} className={`p-4 border-0 shadow-sm transition-all hover:shadow-md ${!statusOk ? "opacity-75" : ""}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 truncate">{t.nome}</h3>
                        <span className="text-xs text-slate-400 font-mono">#{t.id} · {t.slug}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${planoCor[t.plano as Plano] ?? planoCor.trial}`}>
                          {planoLabel[t.plano as Plano] ?? t.plano}
                        </span>
                        {t.ativo === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                            Bloqueado
                          </span>
                        )}
                        {expired && t.ativo === 1 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">
                            Expirado
                          </span>
                        )}
                        {expiringSoon && !expired && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Expira em breve
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{t.adminEmail}</p>
                      {t.observacoes && (
                        <p className="text-xs text-slate-400 mt-1 italic truncate">{t.observacoes}</p>
                      )}
                    </div>

                    {/* Estatísticas */}
                    <div className="flex items-center gap-4 text-sm text-slate-500 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{t.totalUsers} usuários</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{t.totalEmpresas} unidades</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 text-slate-400" />
                        <span>{t.totalLancamentos} lançamentos</span>
                      </div>
                    </div>

                    {/* Validade */}
                    <div className="flex items-center gap-1.5 text-sm shrink-0">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className={expired ? "text-red-500 font-medium" : expiringSoon ? "text-yellow-600 font-medium" : "text-slate-500"}>
                        {t.validadeAte ? formatDate(t.validadeAte) : "Sem validade"}
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setEditando(t)}
                        className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors text-slate-400"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(t)}
                        disabled={toggleAtivo.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          t.ativo === 1
                            ? "hover:bg-red-50 hover:text-red-600 text-slate-400"
                            : "hover:bg-emerald-50 hover:text-emerald-600 text-slate-400"
                        }`}
                        title={t.ativo === 1 ? "Bloquear" : "Ativar"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Último acesso */}
                  {t.ultimoAcesso && (
                    <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>Último acesso: {formatDate(t.ultimoAcesso)}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modais */}
      {showCriar && (
        <ModalCriarTenant
          onClose={() => setShowCriar(false)}
          onSuccess={() => refetch()}
        />
      )}
      {editando && (
        <ModalEditarTenant
          tenant={editando}
          onClose={() => setEditando(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
