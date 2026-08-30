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
    <div className="premium-page flex min-h-screen items-stretch bg-[#f5f7fa] p-0 lg:p-6">
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden rounded-[28px] bg-[#0b1830] p-12 text-white lg:flex">
        <div className="premium-data-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/10 ring-1 ring-white/15">
            <Target className="h-6 w-6 text-emerald-300" />
          </div>
          <p className="mt-5 text-sm font-semibold tracking-wide text-white/75">META DASHBOARD</p>
        </div>
        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Gestão orientada a dados</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-[-0.04em] text-white xl:text-5xl">
            Toda a operação sob controle, em uma única visão.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
            Metas, faturamento, performance da equipe e indicadores de cada unidade com clareza para decisões mais rápidas.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {[
              ["Metas", "Acompanhamento diário"],
              ["Equipe", "Performance individual"],
              ["Unidades", "Visão consolidada"],
            ].map(([titulo, descricao]) => (
              <div key={titulo}>
                <p className="text-sm font-semibold text-white">{titulo}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{descricao}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-emerald-300" />
          Dados isolados e protegidos por empresa
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-14">
        <div className="premium-panel w-full max-w-[480px] p-7 sm:p-9">
          <div className="mb-9 lg:hidden">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#12233f] shadow-[0_10px_24px_rgba(18,35,63,0.18)]">
              <Target className="h-6 w-6 text-white" />
            </div>
            <p className="mt-4 text-sm font-semibold tracking-wide text-slate-500">META DASHBOARD</p>
          </div>

          <div className="mb-8">
            <p className="premium-eyebrow text-blue-600">Acesso seguro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#12233f]">Bem-vindo de volta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Entre para acompanhar as metas e a operação das suas unidades.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                autoComplete="email"
                disabled={loginMutation.isPending}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Senha</label>
                <a href="/recuperar-senha" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Esqueci minha senha</a>
              </div>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="premium-action mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#12233f] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(18,35,63,0.16)] hover:bg-[#183055] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                "Entrar no painel"
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Ainda não tem uma conta?{" "}
              <button
                onClick={() => setShowRegister(true)}
                className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
              >
                Solicitar novo acesso
              </button>
            </p>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400 lg:hidden">
            <Shield className="h-3.5 w-3.5" />
            Dados isolados e seguros por empresa
          </p>
        </div>
      </main>
    </div>
  );
}
