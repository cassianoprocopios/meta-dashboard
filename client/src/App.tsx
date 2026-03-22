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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
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
      <Route path={"/admin"}>{() => <AdminDashboard onBack={() => window.history.back()} />}</Route>
      <Route path={"/register"}>{() => <TenantRegister onBack={() => window.history.back()} onSuccess={() => window.location.href = "/"} />}</Route>
      <Route path={"/dev"} component={DevPanel} />
      <Route path={"/admin-panel"} component={AdminPanel} />
      <Route path={"/historico-acuracia"} component={HistoricoAcuracia} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <AuthGate>
            <Router />
          </AuthGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
