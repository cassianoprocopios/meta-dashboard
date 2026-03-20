import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ShieldX, Clock, PhoneCall, LogOut } from "lucide-react";

interface Props {
  status: "blocked" | "expired" | "not_found";
  message?: string;
}

export default function TenantBloqueado({ status, message }: Props) {
  const logout = trpc.auth.logoutApp.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const isExpired = status === "expired";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          {/* Ícone */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isExpired ? "bg-amber-500/20" : "bg-red-500/20"
          }`}>
            {isExpired
              ? <Clock className="w-10 h-10 text-amber-400" />
              : <ShieldX className="w-10 h-10 text-red-400" />
            }
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-white mb-2">
            {isExpired ? "Licença Expirada" : "Acesso Bloqueado"}
          </h1>

          {/* Mensagem */}
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            {message ?? (
              isExpired
                ? "O período de acesso da sua empresa expirou. Entre em contato com o suporte para renovar sua licença."
                : "O acesso da sua empresa foi suspenso. Entre em contato com o suporte para mais informações."
            )}
          </p>

          {/* Card de contato */}
          <div className={`rounded-2xl p-4 mb-6 ${isExpired ? "bg-amber-500/10 border border-amber-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpired ? "bg-amber-500/20" : "bg-red-500/20"}`}>
                <PhoneCall className={`w-5 h-5 ${isExpired ? "text-amber-400" : "text-red-400"}`} />
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400">Para renovar ou reativar</p>
                <p className="text-sm font-semibold text-white">Entre em contato com o suporte</p>
              </div>
            </div>
          </div>

          {/* Botão de logout */}
          <Button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </Button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Sistema de Gestão de Metas — Meta Dashboard
        </p>
      </div>
    </div>
  );
}
