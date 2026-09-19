import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import TenantRegister from "./pages/TenantRegister";
import DevPanel from "./pages/DevPanel";
import AdminPanel from "./pages/AdminPanel";
import HistoricoAcuracia from "./pages/HistoricoAcuracia";
import Profissionais from "./pages/Profissionais";
import RankingPublico from "./pages/RankingPublico";
import RankingProfissional from "./pages/RankingProfissional";
import SyncStatus from "./pages/SyncStatus";
import AcessoProfissionais from "./pages/AcessoProfissionais";
import RecuperarSenha from "./pages/RecuperarSenha";
import GestaoColaboradores from "./pages/GestaoColaboradores";
import HistoricoBonificacoes from "./pages/HistoricoBonificacoes";
import RelatoriosAtendimentos from "./pages/RelatoriosAtendimentos";
import PerformanceProfissionais from "./pages/PerformanceProfissionais";
import DashboardGerencial from "./pages/DashboardGerencial";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Target, Loader2 } from "lucide-react";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: sessao, isLoading } = trpc.auth.verificarSessao.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  const [loggedUser, setLoggedUser] = useState<any>(null);

  useEffect(() => {
    if (sessao) setLoggedUser(sessao);
  }, [sessao]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#12233f] shadow-[0_12px_32px_rgba(18,35,63,0.18)] mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  if (!sessao && !loggedUser) {
    return <Login onLogin={setLoggedUser} />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard-gerencial"} component={DashboardGerencial} />
      <Route path={"/admin"}>{() => <AdminDashboard onBack={() => window.history.back()} />}</Route>
      <Route path={"/register"}>{() => <TenantRegister onBack={() => window.history.back()} onSuccess={() => window.location.href = "/"} />}</Route>
      <Route path={"/dev"} component={DevPanel} />
      <Route path={"/admin-panel"} component={AdminPanel} />
      <Route path={"/historico-acuracia"} component={HistoricoAcuracia} />
      <Route path={"/profissionais"} component={Profissionais} />
      <Route path={"/ranking"} component={RankingPublico} />
      <Route path={"/sync-status"} component={SyncStatus} />
      <Route path={"/acesso-profissionais"} component={AcessoProfissionais} />
      <Route path={"/colaboradores"} component={GestaoColaboradores} />
      <Route path={"/historico-bonificacoes"} component={HistoricoBonificacoes} />
      <Route path={"/relatorios-atendimentos"} component={RelatoriosAtendimentos} />
      <Route path={"/performance-profissionais"} component={PerformanceProfissionais} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={false}>
        <TooltipProvider>
          <Toaster />
          {/* Rotas públicas (sem AuthGate) */}
          <Switch>
            <Route path="/pro" component={RankingProfissional} />
            <Route path="/recuperar-senha" component={RecuperarSenha} />
            <Route path="/redefinir-senha" component={RecuperarSenha} />
            <Route>
              <AuthGate>
                <Router />
              </AuthGate>
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
