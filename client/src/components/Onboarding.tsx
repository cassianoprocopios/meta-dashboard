import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Building2, Users, Target, ChevronRight, ChevronLeft,
  CheckCircle2, Eye, EyeOff, RefreshCw, Loader2, Sparkles,
  ArrowRight, X, Rocket, Shield, BarChart2
} from "lucide-react";

type Perfil = "gerente" | "recepcionista" | "operador";

const perfilDesc: Record<Perfil, { label: string; desc: string; cor: string }> = {
  gerente: {
    label: "Gerente",
    desc: "Acesso completo: dashboard, metas e bonificações",
    cor: "border-blue-400 bg-blue-50",
  },
  recepcionista: {
    label: "Recepcionista",
    desc: "Apenas lançamento de faturamentos diários",
    cor: "border-purple-400 bg-purple-50",
  },
  operador: {
    label: "Operador",
    desc: "Visualização do dashboard sem edições",
    cor: "border-slate-300 bg-slate-50",
  },
};

// ─── Barra de progresso ───────────────────────────────────────────────────────
function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
              i < step
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : i === step
                ? "bg-blue-100 text-blue-700 border-2 border-blue-500"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${i < step ? "bg-blue-500" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Etapa 0: Boas-vindas ─────────────────────────────────────────────────────
function StepBoasVindas({ userName, onNext, onSkip }: {
  userName: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl shadow-blue-200 mb-6">
        <Rocket className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Bem-vindo, {userName}!
      </h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
        Seu painel está pronto. Vamos configurar sua conta em <strong>3 passos simples</strong> para que você possa começar a monitorar suas metas.
      </p>

      {/* Cards de funcionalidades */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Building2, label: "Empresas", desc: "Crie suas unidades", cor: "bg-blue-100 text-blue-600" },
          { icon: Users, label: "Usuários", desc: "Adicione sua equipe", cor: "bg-purple-100 text-purple-600" },
          { icon: BarChart2, label: "Dashboard", desc: "Monitore as metas", cor: "bg-emerald-100 text-emerald-600" },
        ].map((item) => (
          <div key={item.label} className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
            <div className={`w-10 h-10 rounded-xl ${item.cor} flex items-center justify-center mx-auto mb-2`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 text-sm"
      >
        Começar configuração
        <ArrowRight className="w-4 h-4" />
      </button>

      <button
        onClick={onSkip}
        className="mt-3 w-full py-2.5 rounded-2xl text-slate-400 hover:text-slate-600 text-sm transition-colors"
      >
        Pular por agora e configurar depois
      </button>
    </div>
  );
}

// ─── Etapa 1: Criar Empresa ───────────────────────────────────────────────────
function StepCriarEmpresa({ onNext, onBack }: {
  onNext: (empresa: { id: number; nome: string; slug: string }) => void;
  onBack: () => void;
}) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [cor, setCor] = useState("#3b82f6");

  const coresPreset = [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#ef4444", "#06b6d4", "#f97316",
  ];

  const criar = trpc.empresa.criar.useMutation({
    onSuccess: (data) => {
      toast.success("Empresa criada com sucesso!");
      onNext({ id: (data as any).id ?? 0, nome, slug });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleNome = (v: string) => {
    setNome(v);
    setSlug(v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30));
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Criar primeira empresa</h2>
          <p className="text-sm text-slate-500">Cada empresa representa uma unidade ou filial</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome da Empresa <span className="text-red-400">*</span>
          </label>
          <input
            value={nome}
            onChange={(e) => handleNome(e.target.value)}
            placeholder="Ex: Salão Centro, Unidade Norte..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            autoFocus
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Identificador único
          </label>
          <div className="relative">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="salao-centro"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Gerado automaticamente. Usado internamente para identificar a empresa.</p>
        </div>

        {/* Cor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cor de identificação
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {coresPreset.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={`w-8 h-8 rounded-xl transition-all ${cor === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="w-8 h-8 rounded-xl border border-slate-200 cursor-pointer overflow-hidden"
              title="Cor personalizada"
            />
          </div>
        </div>

        {/* Preview */}
        {nome && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cor + "33" }}
            >
              <Building2 className="w-5 h-5" style={{ color: cor }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{nome}</p>
              <p className="text-xs text-slate-400 font-mono">{slug}</p>
            </div>
            <div
              className="ml-auto w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: cor }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <button
          onClick={() => criar.mutate({ nome, slug, cor })}
          disabled={!nome || !slug || criar.isPending}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {criar.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Criar empresa e continuar</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Etapa 2: Criar Usuário ───────────────────────────────────────────────────
function StepCriarUsuario({ empresa, onNext, onBack, onSkip }: {
  empresa: { id: number; nome: string; slug: string };
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>("gerente");

  const utils = trpc.useUtils();
  const definirEmpresas = trpc.admin.definirEmpresasUsuario.useMutation();

  const criar = trpc.admin.criarUsuario.useMutation({
    onSuccess: async (data) => {
      if (data.userId) {
        await definirEmpresas.mutateAsync({ userId: data.userId, slugs: [empresa.slug] });
      }
      toast.success("Usuário criado com sucesso!");
      utils.admin.listarUsuarios.invalidate();
      onNext();
    },
    onError: (err) => toast.error(err.message),
  });

  const gerarSenha = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    const nova = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setSenha(nova);
    setShowSenha(true);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
          <Users className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Adicionar primeiro usuário</h2>
          <p className="text-sm text-slate-500">
            Será vinculado à <span className="font-medium text-slate-700">{empresa.nome}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome completo <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            autoFocus
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email de acesso <span className="text-red-400">*</span>
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@salao ou maria@empresa"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">Pode ser genérico. Deve ser único na plataforma.</p>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Senha <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              className="px-3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Gerar
            </button>
          </div>
        </div>

        {/* Perfil */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Nível de acesso</label>
          <div className="space-y-2">
            {(["gerente", "recepcionista", "operador"] as Perfil[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPerfil(p)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  perfil === p
                    ? `${perfilDesc[p].cor} border-opacity-100`
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors ${
                  perfil === p ? "border-blue-500 bg-blue-500" : "border-slate-300"
                }`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{perfilDesc[p].label}</p>
                  <p className="text-xs text-slate-500">{perfilDesc[p].desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <button
          onClick={() => criar.mutate({ name, email, senha, perfil })}
          disabled={!name || !email || !senha || criar.isPending}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {criar.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Criar usuário e finalizar</>
          )}
        </button>
      </div>

      <button
        onClick={onSkip}
        className="mt-3 w-full py-2 text-slate-400 hover:text-slate-600 text-sm transition-colors"
      >
        Pular — adicionar usuários depois
      </button>
    </div>
  );
}

// ─── Etapa 3: Conclusão ───────────────────────────────────────────────────────
function StepConclusao({ empresa, onFinish }: {
  empresa: { nome: string } | null;
  onFinish: () => void;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl shadow-emerald-200 mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-2">Tudo pronto!</h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
        {empresa
          ? <>Sua empresa <strong className="text-slate-700">{empresa.nome}</strong> foi criada e sua equipe está configurada. Agora você pode começar a monitorar as metas.</>
          : "Sua conta está configurada. Você pode criar empresas e usuários a qualquer momento no Painel Admin."
        }
      </p>

      {/* Checklist do que foi feito */}
      <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3">
        {[
          { label: "Conta de administrador ativa", done: true },
          { label: empresa ? `Empresa "${empresa.nome}" criada` : "Empresa criada", done: !!empresa },
          { label: "Primeiro usuário adicionado", done: true },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${item.done ? "bg-emerald-500" : "bg-slate-200"}`}>
              {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <p className={`text-sm ${item.done ? "text-slate-700 font-medium" : "text-slate-400"}`}>{item.label}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm"
      >
        <Target className="w-4 h-4" />
        Ir para o Painel Admin
      </button>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
interface OnboardingProps {
  userName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function Onboarding({ userName, onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [empresaCriada, setEmpresaCriada] = useState<{ id: number; nome: string; slug: string } | null>(null);
  const [usuarioCriado, setUsuarioCriado] = useState(false);

  // Total de etapas: boas-vindas (0), empresa (1), usuário (2), conclusão (3)
  const totalSteps = 3;

  const handleEmpresaCriada = (empresa: { id: number; nome: string; slug: string }) => {
    setEmpresaCriada(empresa);
    setStep(2);
  };

  const handleUsuarioCriado = () => {
    setUsuarioCriado(true);
    setStep(3);
  };

  const handleSkipUsuario = () => {
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="premium-form-scope relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Gradiente decorativo no topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

        <div className="p-8">
          {/* Botão fechar (apenas nas etapas intermediárias) */}
          {step > 0 && step < 3 && (
            <button
              onClick={onSkip}
              className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 transition-colors"
              title="Pular onboarding"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Barra de progresso (exceto boas-vindas e conclusão) */}
          {step > 0 && step < 3 && (
            <StepBar step={step - 1} total={totalSteps - 1} />
          )}

          {/* Etapas */}
          {step === 0 && (
            <StepBoasVindas
              userName={userName}
              onNext={() => setStep(1)}
              onSkip={onSkip}
            />
          )}
          {step === 1 && (
            <StepCriarEmpresa
              onNext={handleEmpresaCriada}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && empresaCriada && (
            <StepCriarUsuario
              empresa={empresaCriada}
              onNext={handleUsuarioCriado}
              onBack={() => setStep(1)}
              onSkip={handleSkipUsuario}
            />
          )}
          {step === 3 && (
            <StepConclusao
              empresa={empresaCriada}
              onFinish={onComplete}
            />
          )}
        </div>

        {/* Indicador de etapa no rodapé */}
        {step > 0 && step < 3 && (
          <div className="px-8 pb-6 flex justify-center gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? "w-6 bg-blue-500" : step > s ? "w-6 bg-blue-200" : "w-3 bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
