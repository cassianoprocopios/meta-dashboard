import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Building2, Users, Plus, Power, LogOut, Loader2,
  Eye, EyeOff, X, CheckCircle, Target, Shield, BarChart2,
  AlertTriangle, UserPlus, RefreshCw, Pencil, KeyRound, Save, Trash2,
  Clock, History, Filter, Link2, Zap
} from "lucide-react";
import Onboarding from "@/components/Onboarding";
import VinculosPanel from "@/components/VinculosPanel";
import CashBarberIntegracao from "@/components/CashBarberIntegracao";

type Perfil = "gerente" | "recepcionista" | "operador";

const perfilLabel: Record<Perfil, string> = {
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  operador: "Operador",
};

const perfilCor: Record<Perfil, string> = {
  gerente: "bg-blue-100 text-blue-700 border-blue-200",
  recepcionista: "bg-purple-100 text-purple-700 border-purple-200",
  operador: "bg-slate-100 text-slate-600 border-slate-200",
};

const perfilDesc: Record<Perfil, string> = {
  gerente: "Acesso completo ao dashboard, metas e bonificações",
  recepcionista: "Apenas lançamento de faturamentos",
  operador: "Visualização do dashboard",
};

// ─── Modal de Criar Empresa ───────────────────────────────────────────────────
function ModalCriarEmpresa({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");

  const criar = trpc.empresa.criar.useMutation({
    onSuccess: () => {
      toast.success("Empresa criada com sucesso!");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNome = (v: string) => {
    setNome(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Nova Empresa</h2>
              <p className="text-xs text-slate-500">Adicionar unidade ao seu tenant</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa</label>
            <input
              value={nome}
              onChange={(e) => handleNome(e.target.value)}
              placeholder="Ex: Salão Centro"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Identificador (slug)</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="salao-centro"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">Gerado automaticamente. Apenas letras, números e hífens.</p>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => criar.mutate({ nome, slug })}
            disabled={!nome || !slug || criar.isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar Empresa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Criar Usuário ───────────────────────────────────────────────────
function ModalCriarUsuario({ empresas, onClose, onSuccess }: {
  empresas: Array<{ id: number; nome: string; slug: string }>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>("gerente");
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const definirEmpresas = trpc.admin.definirEmpresasUsuario.useMutation();

  const criar = trpc.admin.criarUsuario.useMutation({
    onSuccess: async (data) => {
      // Definir empresas vinculadas ao usuário criado
      if (empresasSelecionadas.length > 0 && data.userId) {
        await definirEmpresas.mutateAsync({ userId: data.userId, slugs: empresasSelecionadas });
      }
      toast.success("Usuário criado com sucesso!");
      utils.admin.listarUsuarios.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEmpresa = (slug: string) => {
    setEmpresasSelecionadas(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const gerarSenha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    setSenha(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
    setShowSenha(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Novo Usuário</h2>
              <p className="text-xs text-slate-500">Adicionar membro à equipe</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email de Acesso</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@seudominio ou maria@salao"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Pode ser genérico (ex: maria@salao). Deve ser único na plataforma.</p>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={gerarSenha}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Gerar
              </button>
            </div>
          </div>

          {/* Perfil */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nível de Acesso</label>
            <div className="space-y-2">
              {(["gerente", "recepcionista", "operador"] as Perfil[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerfil(p)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    perfil === p ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                    perfil === p ? "border-blue-500 bg-blue-500" : "border-slate-300"
                  }`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{perfilLabel[p]}</p>
                    <p className="text-xs text-slate-500">{perfilDesc[p]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Empresas */}
          {empresas.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Empresas com Acesso</label>
              <div className="space-y-2">
                {empresas.map((emp) => (
                  <button
                    key={emp.slug}
                    type="button"
                    onClick={() => toggleEmpresa(emp.slug)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      empresasSelecionadas.includes(emp.slug)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      empresasSelecionadas.includes(emp.slug) ? "border-blue-500 bg-blue-500" : "border-slate-300"
                    }`}>
                      {empresasSelecionadas.includes(emp.slug) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{emp.nome}</p>
                      <p className="text-xs text-slate-400 font-mono">{emp.slug}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0 sticky bottom-0 bg-white rounded-b-2xl border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => criar.mutate({ name, email, senha, perfil })}
            disabled={!name || !email || !senha || criar.isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Criar Usuário
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Confirmar Exclusão ──────────────────────────────────────────────
function ModalConfirmarExclusao({ usuario, onClose, onSuccess }: {
  usuario: { id: number; name: string; email: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [confirmacao, setConfirmacao] = useState("");
  const utils = trpc.useUtils();

  const excluir = trpc.admin.excluirUsuario.useMutation({
    onSuccess: () => {
      toast.success(`Usuário "${usuario.name}" excluído com sucesso.`);
      utils.admin.listarUsuarios.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const nomeConfirmado = confirmacao.trim().toLowerCase() === usuario.name.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Excluir Usuário</h2>
              <p className="text-xs text-slate-500">Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Atenção: ação irreversível</p>
            <p className="text-sm text-red-600">
              O usuário <strong>{usuario.name}</strong> será permanentemente removido do sistema,
              incluindo todos os seus registros de acesso e vínculos com empresas.
            </p>
          </div>

          {/* Card do usuário */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-slate-600">
                {usuario.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{usuario.name}</p>
              <p className="text-xs text-slate-400 truncate">{usuario.email}</p>
            </div>
          </div>

          {/* Campo de confirmação */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Digite <span className="font-bold text-slate-900">{usuario.name}</span> para confirmar
            </label>
            <input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={`Digite o nome do usuário...`}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
              autoFocus
            />
            {confirmacao.length > 0 && !nomeConfirmado && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                O nome digitado não corresponde.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => excluir.mutate({ userId: usuario.id })}
            disabled={!nomeConfirmado || excluir.isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {excluir.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Excluir Definitivamente</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Editar Usuário ─────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, empresas, onClose, onSuccess }: {
  usuario: { id: number; name: string; email: string; perfil: string; ativo: boolean };
  empresas: Array<{ id: number; nome: string; slug: string }>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(usuario.name);
  const [perfil, setPerfil] = useState<Perfil>((usuario.perfil as Perfil) || "gerente");
  const [novaSenha, setNovaSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "senha">("dados");
  const [senhaCopiada, setSenhaCopiada] = useState(false);

  const utils = trpc.useUtils();

  // Carregar empresas vinculadas atuais
  const { data: empresasVinculadas = [] } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: usuario.id },
    {
      onSuccess: (slugs: string[]) => setEmpresasSelecionadas(slugs),
    } as any
  );

  // Sincronizar empresas vinculadas quando carregarem
  useEffect(() => {
    if (empresasVinculadas.length > 0) {
      setEmpresasSelecionadas(empresasVinculadas);
    }
  }, [empresasVinculadas.join(",")]);

  const definirEmpresas = trpc.admin.definirEmpresasUsuario.useMutation();

  const editar = trpc.admin.editarUsuario.useMutation({
    onSuccess: async () => {
      await definirEmpresas.mutateAsync({ userId: usuario.id, slugs: empresasSelecionadas });
      toast.success("Usuário atualizado com sucesso!");
      utils.admin.listarUsuarios.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const redefinirSenha = trpc.admin.editarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setNovaSenha("");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleEmpresa = (slug: string) => {
    setEmpresasSelecionadas(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const gerarSenha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    const nova = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setNovaSenha(nova);
    setShowSenha(true);
  };

  const copiarSenha = () => {
    navigator.clipboard.writeText(novaSenha);
    setSenhaCopiada(true);
    setTimeout(() => setSenhaCopiada(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Editar Usuário</h2>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{usuario.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100">
          {(["dados", "senha"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                abaAtiva === aba
                  ? "text-blue-600 border-b-2 border-blue-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {aba === "dados" ? (
                <span className="flex items-center justify-center gap-1.5"><Save className="w-3.5 h-3.5" /> Dados e Acesso</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Redefinir Senha</span>
              )}
            </button>
          ))}
        </div>

        {/* Aba: Dados e Acesso */}
        {abaAtiva === "dados" && (
          <div className="p-6 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Email (somente leitura) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                value={usuario.email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-400 bg-slate-50 text-sm cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">O email não pode ser alterado.</p>
            </div>

            {/* Perfil */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nível de Acesso</label>
              <div className="space-y-2">
                {(["gerente", "recepcionista", "operador"] as Perfil[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPerfil(p)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      perfil === p ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                      perfil === p ? "border-blue-500 bg-blue-500" : "border-slate-300"
                    }`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{perfilLabel[p]}</p>
                      <p className="text-xs text-slate-500">{perfilDesc[p]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Empresas */}
            {empresas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Empresas com Acesso</label>
                <div className="space-y-2">
                  {empresas.map((emp) => (
                    <button
                      key={emp.slug}
                      type="button"
                      onClick={() => toggleEmpresa(emp.slug)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        empresasSelecionadas.includes(emp.slug)
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        empresasSelecionadas.includes(emp.slug) ? "border-blue-500 bg-blue-500" : "border-slate-300"
                      }`}>
                        {empresasSelecionadas.includes(emp.slug) && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{emp.nome}</p>
                        <p className="text-xs text-slate-400 font-mono">{emp.slug}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {empresasSelecionadas.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Nenhuma empresa selecionada — o usuário não terá acesso a dados.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aba: Redefinir Senha */}
        {abaAtiva === "senha" && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              <p className="font-semibold mb-1">Atenção</p>
              <p>Ao redefinir a senha, o usuário precisará usar a nova senha no próximo login. Certifique-se de repassar as credenciais com segurança.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova Senha</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={gerarSenha}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Gerar
                </button>
              </div>
            </div>

            {/* Botão copiar senha */}
            {novaSenha && showSenha && (
              <button
                type="button"
                onClick={copiarSenha}
                className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {senhaCopiada ? (
                  <><CheckCircle className="w-4 h-4 text-emerald-500" /> Senha copiada!</>
                ) : (
                  <><Shield className="w-4 h-4" /> Copiar senha gerada</>
                )}
              </button>
            )}

            <button
              onClick={() => redefinirSenha.mutate({ userId: usuario.id, novaSenha })}
              disabled={!novaSenha || novaSenha.length < 6 || redefinirSenha.isPending}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {redefinirSenha.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redefinindo...</>
              ) : (
                <><KeyRound className="w-4 h-4" /> Redefinir Senha</>  
              )}
            </button>
          </div>
        )}

        {/* Footer: Salvar (apenas na aba dados) */}
        {abaAtiva === "dados" && (
          <div className="flex gap-3 p-6 pt-0 sticky bottom-0 bg-white rounded-b-2xl border-t border-slate-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => editar.mutate({ userId: usuario.id, name, perfil })}
              disabled={!name || editar.isPending}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {editar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        )}
        {abaAtiva === "senha" && (
          <div className="p-6 pt-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [aba, setAba] = useState<"empresas" | "usuarios" | "vinculos" | "historico" | "cashbarber">("empresas");
  const [filtroHistorico, setFiltroHistorico] = useState<"todos" | "empresa_criada" | "usuario_criado" | "acesso">("todos");
  const [showCriarEmpresa, setShowCriarEmpresa] = useState(false);
  const [showCriarUsuario, setShowCriarUsuario] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<any>(null);

  const utils = trpc.useUtils();

  const { data: empresas = [], isLoading: loadingEmpresas, refetch: refetchEmpresas } = trpc.admin.listarTodasEmpresas.useQuery();
  const { data: usuarios = [], refetch: refetchUsuarios } = trpc.admin.listarUsuarios.useQuery();
  const { data: historico = [], isLoading: loadingHistorico } = trpc.admin.listarHistorico.useQuery(
    { limit: 300 },
    { enabled: aba === "historico" }
  );

  // Detectar primeiro acesso: exibir onboarding se não há empresas e o admin tem tenantId
  useEffect(() => {
    if (!loadingEmpresas && empresas.length === 0 && user && (user as any).tenantId) {
      // Verificar se o usuário já pulou o onboarding nesta sessão
      const skipped = sessionStorage.getItem("onboarding_skipped");
      if (!skipped) {
        setShowOnboarding(true);
      }
    }
  }, [loadingEmpresas, empresas.length, user]);

  const toggleEmpresa = trpc.admin.toggleEmpresaAtiva.useMutation({
    onSuccess: () => { toast.success("Status da empresa atualizado!"); refetchEmpresas(); },
    onError: (err) => toast.error(err.message),
  });

  const toggleUsuario = trpc.admin.toggleUsuarioAtivo.useMutation({
    onSuccess: () => { toast.success("Status do usuário atualizado!"); refetchUsuarios(); },
    onError: (err) => toast.error(err.message),
  });

  const totalEmpresas = empresas.length;
  const empresasAtivas = empresas.filter((e: any) => e.ativo).length;
  const totalUsuarios = usuarios.length;
  const usuariosAtivos = usuarios.filter((u: any) => u.ativo).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">Painel Administrativo</h1>
              <p className="text-xs text-slate-500 hidden sm:block">{user?.name || "Administrador"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              Dashboard
            </a>
            <a href="/" className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors" title="Dashboard">
              <BarChart2 className="w-4 h-4" />
            </a>
            {empresas.length === 0 && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                <Shield className="w-4 h-4" />
                Guia de configuração
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Empresas", value: totalEmpresas, sub: `${empresasAtivas} ativas`, icon: Building2, bg: "bg-blue-100", text: "text-blue-600" },
            { label: "Usuários", value: totalUsuarios, sub: `${usuariosAtivos} ativos`, icon: Users, bg: "bg-purple-100", text: "text-purple-600" },
            { label: "Ativas", value: empresasAtivas, sub: "de " + totalEmpresas, icon: CheckCircle, bg: "bg-emerald-100", text: "text-emerald-600" },
            { label: "Inativos", value: totalUsuarios - usuariosAtivos, sub: "usuários", icon: AlertTriangle, bg: "bg-amber-100", text: "text-amber-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 ${card.text}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              <p className="text-xs text-slate-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tab Header */}
          <div className="flex flex-col sm:flex-row border-b border-slate-200">
            <div className="flex overflow-x-auto scrollbar-none">
              <button
                onClick={() => setAba("empresas")}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  aba === "empresas"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Empresas
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{totalEmpresas}</span>
              </button>
              <button
                onClick={() => setAba("usuarios")}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  aba === "usuarios"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Users className="w-4 h-4" />
                Usuários
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{totalUsuarios}</span>
              </button>
              <button
                onClick={() => setAba("vinculos")}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  aba === "vinculos"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Link2 className="w-4 h-4" />
                Vínculos
              </button>
              <button
                onClick={() => setAba("historico")}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  aba === "historico"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <History className="w-4 h-4" />
                Histórico
              </button>
              <button
                onClick={() => setAba("cashbarber")}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                  aba === "cashbarber"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Zap className="w-4 h-4" />
                CashBarber
              </button>
            </div>

            <div className="ml-auto flex items-center px-3 sm:px-4 py-2 sm:py-0 border-t sm:border-t-0 border-slate-100">
              {aba === "empresas" && (
                <button
                  onClick={() => setShowCriarEmpresa(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Empresa</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              )}
              {aba === "usuarios" && (
                <button
                  onClick={() => setShowCriarUsuario(true)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Usuário</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              )}
            </div>
          </div>

          {/* Aba Empresas */}
          {aba === "empresas" && (
            <div>
              {empresas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhuma empresa cadastrada</h3>
                  <p className="text-sm text-slate-400 mb-4">Crie sua primeira unidade para começar.</p>
                  <button
                    onClick={() => setShowCriarEmpresa(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Primeira Empresa
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {empresas.map((emp: any) => (
                    <div key={emp.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: emp.cor ? emp.cor + "22" : "#3b82f622" }}
                        >
                          <Building2 className="w-5 h-5" style={{ color: emp.cor || "#3b82f6" }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{emp.nome}</p>
                          <p className="text-xs text-slate-400 font-mono">{emp.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          emp.ativo
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {emp.ativo ? "Ativa" : "Inativa"}
                        </span>
                        <button
                          onClick={() => toggleEmpresa.mutate({ empresaId: emp.id, ativo: !emp.ativo })}
                          disabled={toggleEmpresa.isPending}
                          className={`p-2 rounded-lg transition-colors ${
                            emp.ativo
                              ? "text-slate-400 hover:text-red-500 hover:bg-red-50"
                              : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                          }`}
                          title={emp.ativo ? "Desativar" : "Ativar"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Usuários */}
          {aba === "usuarios" && (
            <div>
              {usuarios.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhum usuário cadastrado</h3>
                  <p className="text-sm text-slate-400 mb-4">Adicione membros à sua equipe.</p>
                  <button
                    onClick={() => setShowCriarUsuario(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Adicionar Primeiro Usuário
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {usuarios.map((u: any) => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 hover:bg-slate-50 transition-colors gap-3">
                      {/* Info do usuário */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-slate-600">
                            {u.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              perfilCor[u.perfil as Perfil] || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {perfilLabel[u.perfil as Perfil] || u.perfil}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          {/* Badges de empresas vinculadas */}
                          {u.empresasSlugs && u.empresasSlugs.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(u.empresasSlugs as string[]).map((slug: string) => {
                                const emp = (empresas as any[]).find((e: any) => e.slug === slug);
                                return (
                                  <span
                                    key={slug}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium"
                                  >
                                    <Building2 className="w-3 h-3" />
                                    {emp?.nome || slug}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Sem empresa vinculada
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 flex-shrink-0 pl-14 sm:pl-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          u.ativo
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                        {/* Botão Editar */}
                        <button
                          onClick={() => setUsuarioEditando(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar usuário"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Botão Ativar/Desativar */}
                        <button
                          onClick={() => toggleUsuario.mutate({ userId: u.id, ativo: !u.ativo })}
                          disabled={toggleUsuario.isPending}
                          className={`p-2 rounded-lg transition-colors ${
                            u.ativo
                              ? "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                              : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                          }`}
                          title={u.ativo ? "Desativar" : "Ativar"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        {/* Botão Excluir */}
                        <button
                          onClick={() => setUsuarioExcluindo(u)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba Vínculos */}
          {aba === "vinculos" && (
            <div className="p-4 sm:p-6">
              <VinculosPanel />
            </div>
          )}

          {/* Aba CashBarber */}
          {aba === "cashbarber" && (
            <CashBarberIntegracao empresas={empresas as Array<{ id: number; nome: string; slug: string; ativo: number }>} />
          )}

          {/* Aba Histórico */}
          {aba === "historico" && (
            <div>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50">
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
                  <Filter className="w-3.5 h-3.5" /> Filtrar:
                </span>
                {([
                  { value: "todos", label: "Todos" },
                  { value: "empresa_criada", label: "Empresas" },
                  { value: "usuario_criado", label: "Usuários" },
                  { value: "acesso", label: "Acessos" },
                ] as const).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFiltroHistorico(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filtroHistorico === f.value
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingHistorico ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhum evento registrado</h3>
                  <p className="text-sm text-slate-400">Os cadastros e acessos aparecerão aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historico
                    .filter((e: any) => filtroHistorico === "todos" || e.tipo === filtroHistorico)
                    .map((evento: any, idx: number) => {
                      const tipoConfig = {
                        empresa_criada: { icon: Building2, bg: "bg-blue-100", text: "text-blue-600", label: "Empresa" },
                        usuario_criado: { icon: Users, bg: "bg-purple-100", text: "text-purple-600", label: "Usuário" },
                        acesso: { icon: Clock, bg: "bg-slate-100", text: "text-slate-500", label: "Acesso" },
                      }[evento.tipo as string] || { icon: Clock, bg: "bg-slate-100", text: "text-slate-500", label: "Evento" };
                      const IconComp = tipoConfig.icon;
                      const dataEvento = new Date(evento.data);
                      return (
                        <div key={idx} className="flex items-start gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${tipoConfig.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <IconComp className={`w-4 h-4 ${tipoConfig.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                              <p className="text-sm font-semibold text-slate-800 leading-tight">{evento.titulo}</p>
                              <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                {dataEvento.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{evento.descricao}</p>
                            {evento.extra && (
                              <p className="text-xs text-slate-400 mt-0.5">IP: {evento.extra}</p>
                            )}
                          </div>
                          <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${
                            evento.tipo === "empresa_criada" ? "bg-blue-50 text-blue-700 border-blue-100" :
                            evento.tipo === "usuario_criado" ? "bg-purple-50 text-purple-700 border-purple-100" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {tipoConfig.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info de acesso */}
        <div className="mt-6 flex items-start sm:items-center gap-2 text-xs text-slate-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span>Você está gerenciando apenas as empresas e usuários do seu tenant. Os dados de outros clientes são completamente isolados.</span>
        </div>
      </main>

      {/* Modais */}
      {showCriarEmpresa && (
        <ModalCriarEmpresa
          onClose={() => setShowCriarEmpresa(false)}
          onSuccess={refetchEmpresas}
        />
      )}
      {showCriarUsuario && (
        <ModalCriarUsuario
          empresas={empresas as Array<{ id: number; nome: string; slug: string }>}
          onClose={() => setShowCriarUsuario(false)}
          onSuccess={refetchUsuarios}
        />
      )}

      {/* Modal de Confirmar Exclusão */}
      {usuarioExcluindo && (
        <ModalConfirmarExclusao
          usuario={usuarioExcluindo}
          onClose={() => setUsuarioExcluindo(null)}
          onSuccess={() => setUsuarioExcluindo(null)}
        />
      )}

      {/* Modal de Editar Usuário */}
      {usuarioEditando && (
        <ModalEditarUsuario
          usuario={usuarioEditando}
          empresas={empresas as Array<{ id: number; nome: string; slug: string }>}
          onClose={() => setUsuarioEditando(null)}
          onSuccess={() => {
            refetchUsuarios();
            setUsuarioEditando(null);
          }}
        />
      )}

      {/* Onboarding de primeiro acesso */}
      {showOnboarding && (
        <Onboarding
          userName={user?.name || "Administrador"}
          onComplete={() => {
            setShowOnboarding(false);
            refetchEmpresas();
            refetchUsuarios();
          }}
          onSkip={() => {
            sessionStorage.setItem("onboarding_skipped", "1");
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
