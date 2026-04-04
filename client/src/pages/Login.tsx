import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Target, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import TenantRegister from "./TenantRegister";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const loginMutation = trpc.auth.loginComSenha.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo, ${data.user.name}!`);
      onLogin(data.user);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Preencha email e senha.");
      return;
    }
    loginMutation.mutate({ email, senha });
  };

  // Após registro bem-sucedido, fazer login automático
  const handleRegistroSuccess = (data: { tenantId: number; slug: string; email: string; senha: string }) => {
    loginMutation.mutate({ email: data.email, senha: data.senha });
  };

  if (showRegister) {
    return (
      <TenantRegister
        onBack={() => setShowRegister(false)}
        onSuccess={handleRegistroSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Meta Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Painel de Gestão de Metas para Salões</p>
        </div>

        {/* Card de login */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoComplete="email"
                disabled={loginMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Link para recuperação de senha */}
          <div className="mt-4 text-center">
            <a
              href="/recuperar-senha"
              className="text-slate-400 hover:text-blue-300 text-sm transition-colors"
            >
              Esqueci minha senha
            </a>
          </div>

          {/* Link para registro */}
          <div className="mt-4 pt-5 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              Ainda não tem uma conta?{" "}
              <button
                onClick={() => setShowRegister(true)}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Criar conta gratuita
              </button>
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-slate-500 text-xs">
            Sistema exclusivo para gestão de metas de salões de beleza.
          </p>
          <p className="text-slate-600 text-xs flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Dados isolados e seguros por empresa
          </p>
        </div>
      </div>
    </div>
  );
}
