import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] p-5">
          <div className="premium-panel flex w-full max-w-lg flex-col items-center p-8 text-center sm:p-10">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
              <AlertTriangle size={26} className="flex-shrink-0 text-red-600" />
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-red-600">Não foi possível carregar</p>
            <h2 className="mb-3 font-heading text-2xl font-bold text-[#12233f]">Ocorreu um erro inesperado</h2>
            <p className="mb-7 max-w-sm text-sm leading-relaxed text-slate-500">
              Atualize a página para tentar novamente. Se o problema continuar, informe o administrador do sistema.
            </p>

            <button
              onClick={() => window.location.reload()}
              className={cn(
                "premium-action flex items-center gap-2 rounded-xl px-5 py-3",
                "bg-[#12233f] text-white shadow-sm",
                "cursor-pointer hover:bg-[#1a3157]"
              )}
            >
              <RotateCcw size={16} />
              Atualizar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
