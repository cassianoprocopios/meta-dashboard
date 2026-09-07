import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Target, Eye, EyeOff, Loader2, Building2, User, Mail, Lock, Phone, CheckCircle2, ArrowLeft } from "lucide-react";

interface TenantRegisterProps {
  onBack: () => void;
  onSuccess: (data: { tenantId: number; slug: string; email: string; senha: string }) => void;
}

export default function TenantRegister({ onBack, onSuccess }: TenantRegisterProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [registroData, setRegistroData] = useState<{ tenantId: number; slug: string } | null>(null);

  const registroMutation = trpc.registro.novoTenant.useMutation({
    onSuccess: (data) => {
      setRegistroData(data);
      setStep("success");
      toast.success("Conta criada com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa || !nomeAdmin || !email || !senha) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    registroMutation.mutate({ nomeEmpresa, nomeAdmin, email, senha, telefone: telefone || undefined });
  };

  const handleEntrar = () => {
    if (registroData) {
      onSuccess({ ...registroData, email, senha });
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
        <div className="premium-panel w-full max-w-md p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/30 mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#12233f] mb-2">Conta criada!</h1>
          <p className="text-slate-500 mb-8">
            Bem-vindo ao Meta Dashboard. Sua conta foi criada com sucesso e está em período de avaliação gratuita.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 text-left">
            <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Próximos passos</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-slate-600 text-sm">Faça login com o email e senha que acabou de criar</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-slate-600 text-sm">Adicione as unidades do seu salão na aba <strong className="text-[#12233f]">Empresas</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-slate-600 text-sm">Configure as metas mensais e quinzenais por unidade</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</div>
                <p className="text-slate-600 text-sm">Comece a lançar os faturamentos diários</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleEntrar}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all"
          >
            Entrar no sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#12233f]">Meta Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Crie a conta da sua empresa</p>
        </div>

        {/* Card de registro */}
        <div className="premium-form-scope premium-panel p-8">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#12233f] hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-[#12233f]">Criar nova conta</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome da empresa */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Nome da empresa <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                placeholder="Ex: Barbiero Grupo, Studio Bella..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={registroMutation.isPending}
              />
            </div>

            {/* Nome do responsável */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <User className="w-3.5 h-3.5 inline mr-1" />
                Seu nome <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nomeAdmin}
                onChange={(e) => setNomeAdmin(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={registroMutation.isPending}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoComplete="email"
                disabled={registroMutation.isPending}
              />
            </div>

            {/* Telefone (opcional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                Telefone <span className="text-slate-500 text-xs">(opcional)</span>
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={registroMutation.isPending}
              />
            </div>

            {/* Senha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  <Lock className="w-3.5 h-3.5 inline mr-1" />
                  Senha <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={registroMutation.isPending}
                  />
                  <button
                    type="button"
                    aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirmar senha <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmar ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className={`w-full px-4 py-3 pr-10 rounded-xl bg-white/10 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      confirmarSenha && senha !== confirmarSenha ? "border-red-500/50" : "border-white/20"
                    }`}
                    disabled={registroMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            {confirmarSenha && senha !== confirmarSenha && (
              <p className="text-red-400 text-xs -mt-2">As senhas não coincidem</p>
            )}

            {/* Informação sobre o plano trial */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-blue-300 text-xs">
                🎉 <strong>14 dias grátis</strong> — Sem necessidade de cartão de crédito. Após o período de avaliação, entre em contato para continuar.
              </p>
            </div>

            <button
              type="submit"
              disabled={registroMutation.isPending || (!!confirmarSenha && senha !== confirmarSenha)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {registroMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
              ) : (
                "Criar conta gratuita"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Ao criar uma conta, você concorda com os termos de uso do serviço.
        </p>
      </div>
    </div>
  );
}
