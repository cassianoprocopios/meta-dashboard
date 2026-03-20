import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
  Building2, Users, BarChart2, Shield, Plus, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, TrendingUp, Package, Crown, AlertTriangle,
  ArrowLeft, RefreshCw,
} from "lucide-react";

interface SuperAdminProps {
  onBack: () => void;
}

const PLANOS = {
  trial: { label: "Trial", color: "bg-amber-100 text-amber-700 border-amber-200" },
  basico: { label: "Básico", color: "bg-blue-100 text-blue-700 border-blue-200" },
  pro: { label: "Pro", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function SuperAdmin({ onBack }: SuperAdminProps) {
  const [showCriar, setShowCriar] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  // Form de criar tenant
  const [nome, setNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [plano, setPlano] = useState<"trial" | "basico" | "pro">("trial");

  const { data: tenants = [], isLoading, refetch } = trpc.superAdmin.listarTenants.useQuery();

  const criarMutation = trpc.superAdmin.criarTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant criado com sucesso!");
      setShowCriar(false);
      setNome(""); setAdminEmail(""); setAdminNome(""); setAdminSenha("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleAtivoMutation = trpc.superAdmin.toggleTenantAtivo.useMutation({
    onSuccess: () => { toast.success("Status atualizado."); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const alterarPlanoMutation = trpc.superAdmin.alterarPlano.useMutation({
    onSuccess: () => { toast.success("Plano atualizado."); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !adminEmail || !adminNome || !adminSenha) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const slug = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 64);
    criarMutation.mutate({ nome, slug, adminEmail, adminNome, adminSenha, plano });
  };

  // Estatísticas gerais
  const totalTenants = tenants.length;
  const tenantsAtivos = tenants.filter((t) => t.ativo === 1).length;
  const totalUsers = tenants.reduce((s, t) => s + (t.stats?.totalUsers ?? 0), 0);
  const totalLancamentos = tenants.reduce((s, t) => s + (t.stats?.totalLancamentos ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Super Admin</h1>
                <p className="text-xs text-slate-500">Gestão de Clientes SaaS</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowCriar(!showCriar)}
                className="flex items-center gap-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Novo Cliente
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Total de Clientes</p>
            <p className="text-3xl font-bold mt-1">{fmt(totalTenants)}</p>
            <p className="text-xs opacity-70 mt-1">{tenantsAtivos} ativos</p>
          </Card>
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Utilizadores</p>
            <p className="text-3xl font-bold mt-1">{fmt(totalUsers)}</p>
            <p className="text-xs opacity-70 mt-1">em todos os tenants</p>
          </Card>
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lançamentos</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">{fmt(totalLancamentos)}</p>
            <p className="text-xs text-slate-400 mt-1">registros no total</p>
          </Card>
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inativos</p>
            <p className="text-3xl font-bold mt-1 text-slate-900">{fmt(totalTenants - tenantsAtivos)}</p>
            <p className="text-xs text-slate-400 mt-1">contas bloqueadas</p>
          </Card>
        </div>

        {/* Formulário de criar tenant */}
        {showCriar && (
          <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" /> Criar Novo Cliente
            </h3>
            <form onSubmit={handleCriar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Barbiero Grupo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={criarMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Plano</label>
                <select
                  value={plano}
                  onChange={(e) => setPlano(e.target.value as "trial" | "basico" | "pro")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  disabled={criarMutation.isPending}
                >
                  <option value="trial">Trial (14 dias)</option>
                  <option value="basico">Básico</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Admin *</label>
                <input
                  type="text"
                  value={adminNome}
                  onChange={(e) => setAdminNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={criarMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email do Admin *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@empresa.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={criarMutation.isPending}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Senha Inicial *</label>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={adminSenha}
                    onChange={(e) => setAdminSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={criarMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={criarMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {criarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Criar Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setShowCriar(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Lista de tenants */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" /> Clientes Cadastrados
            </h3>
            <span className="text-xs text-slate-500">{tenants.length} clientes</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Ícone de status */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tenant.ativo === 1
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-500"
                      }`}>
                        {tenant.ativo === 1
                          ? <CheckCircle2 className="w-5 h-5" />
                          : <XCircle className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 text-sm">{tenant.nome}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PLANOS[tenant.plano as keyof typeof PLANOS]?.color ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            {PLANOS[tenant.plano as keyof typeof PLANOS]?.label ?? tenant.plano}
                          </span>
                          {tenant.ativo === 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-medium">
                              Bloqueado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{tenant.adminEmail}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Slug: <code className="bg-slate-100 px-1 rounded">{tenant.slug}</code>
                          {" · "}Criado em {fmtDate(tenant.createdAt)}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3" /> {tenant.stats?.totalUsers ?? 0} utilizadores
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Building2 className="w-3 h-3" /> {tenant.stats?.totalEmpresas ?? 0} unidades
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <BarChart2 className="w-3 h-3" /> {fmt(tenant.stats?.totalLancamentos ?? 0)} lançamentos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Alterar plano */}
                      <select
                        value={tenant.plano}
                        onChange={(e) => alterarPlanoMutation.mutate({
                          tenantId: tenant.id,
                          plano: e.target.value as "trial" | "basico" | "pro",
                        })}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={alterarPlanoMutation.isPending}
                      >
                        <option value="trial">Trial</option>
                        <option value="basico">Básico</option>
                        <option value="pro">Pro</option>
                      </select>

                      {/* Toggle ativo */}
                      <button
                        onClick={() => toggleAtivoMutation.mutate({
                          tenantId: tenant.id,
                          ativo: tenant.ativo === 1 ? 0 : 1,
                        })}
                        disabled={toggleAtivoMutation.isPending}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          tenant.ativo === 1
                            ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                        }`}
                      >
                        {toggleAtivoMutation.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : tenant.ativo === 1 ? "Bloquear" : "Ativar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Aviso de isolamento */}
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Isolamento de Dados</p>
              <p className="text-xs text-amber-700 mt-1">
                Cada cliente tem os seus dados completamente isolados. Um cliente nunca consegue aceder dados de outro.
                O bloqueio de um tenant impede o login de todos os utilizadores desse tenant.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
