import { useState } from "react";
import {
  TrendingUp,
  Calendar,
  Target,
  CheckCircle2,
  Trophy,
  Users,
  Building2,
  Shield,
  Sparkles,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  UserCircle,
  Star,
  Settings,
  LogOut,
  Zap,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Code2,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

type Tab =
  | "dashboard"
  | "lancamentos"
  | "metas"
  | "bonificacao"
  | "historico"
  | "usuarios"
  | "empresas"
  | "auditoria"
  | "ia"
  | "dpote";

interface SidebarItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string;
  badgeColor?: string;
}

interface SidebarLinkItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  external?: boolean;
  requiresAdmin?: boolean;
  requiresGerente?: boolean;
}

interface AppSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  tabsVisiveis: Tab[];
  isAdmin: boolean;
  isGerente: boolean;
  isRecepcionista: boolean;
  userName?: string;
  userRole?: string;
  onLogout: () => void;
  onSyncCB?: () => void;
  onSyncDpote?: () => void;
  syncingCB?: boolean;
  syncingDpote?: boolean;
  onTestarMetaDiaria?: () => void;
  testingMetaDiaria?: boolean;
  onRecalcularRanking?: () => void;
  recalculandoRanking?: boolean;
}

export default function AppSidebar({
  activeTab,
  onTabChange,
  tabsVisiveis,
  isAdmin,
  isGerente,
  isRecepcionista,
  userName,
  userRole,
  onLogout,
  onSyncCB,
  onSyncDpote,
  syncingCB,
  syncingDpote,
  onTestarMetaDiaria,
  testingMetaDiaria,
  onRecalcularRanking,
  recalculandoRanking,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // Mobile: drawer aberto/fechado
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const allTabs: SidebarItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      description: "Visão geral e KPIs",
    },
    {
      id: "lancamentos",
      label: "Lançamentos",
      icon: <Calendar className="w-4 h-4" />,
      description: "Registrar faturamento diário",
    },
    {
      id: "metas",
      label: "Metas",
      icon: <Target className="w-4 h-4" />,
      description: "Configurar metas mensais",
    },
    {
      id: "bonificacao",
      label: "Bonificação",
      icon: <CheckCircle2 className="w-4 h-4" />,
      description: "Calcular bonificações",
    },
    {
      id: "historico",
      label: "Histórico",
      icon: <Trophy className="w-4 h-4" />,
      description: "Acurácia e histórico",
    },
    {
      id: "dpote",
      label: "Dpote",
      icon: <Repeat2 className="w-4 h-4" />,
      description: "Distribuição de recorrência",
    },
    {
      id: "ia",
      label: "Análise IA",
      icon: <Sparkles className="w-4 h-4" />,
      description: "Insights com inteligência artificial",
      badge: "IA",
      badgeColor: "bg-violet-500",
    },
    {
      id: "usuarios",
      label: "Usuários",
      icon: <Users className="w-4 h-4" />,
      description: "Gerenciar equipe",
    },
    {
      id: "empresas",
      label: "Empresas",
      icon: <Building2 className="w-4 h-4" />,
      description: "Configurar unidades",
    },
    {
      id: "auditoria",
      label: "Auditoria",
      icon: <Shield className="w-4 h-4" />,
      description: "Log de acessos",
    },
  ];

  const externalLinks: SidebarLinkItem[] = [
    {
      href: "/profissionais",
      label: "Profissionais",
      icon: <UserCircle className="w-4 h-4" />,
      description: "Gerenciar equipe e ranking",
      requiresGerente: true,
    },
    {
      href: "/ranking",
      label: "Ranking",
      icon: <Star className="w-4 h-4" />,
      description: "Ranking público de faturamento",
    },
    {
      href: "/historico-acuracia",
      label: "Acurácia",
      icon: <BarChart3 className="w-4 h-4" />,
      description: "Histórico de acurácia",
      requiresGerente: true,
    },
    {
      href: "/admin-panel",
      label: "Painel Admin",
      icon: <Settings className="w-4 h-4" />,
      description: "Administração do sistema",
      requiresAdmin: true,
    },
    {
      href: "/dev",
      label: "Dev Panel",
      icon: <Code2 className="w-4 h-4" />,
      description: "Painel do desenvolvedor",
      requiresAdmin: true,
    },
  ];

  const visibleTabs = allTabs.filter((t) => tabsVisiveis.includes(t.id));
  const visibleLinks = externalLinks.filter((l) => {
    if (l.requiresAdmin && !isAdmin) return false;
    if (l.requiresGerente && !isGerente && !isAdmin) return false;
    return true;
  });

  const roleLabel =
    userRole === "admin"
      ? "Administrador"
      : userRole === "gerente"
      ? "Gerente"
      : userRole === "recepcionista"
      ? "Recepcionista"
      : "Usuário";

  const roleColor =
    userRole === "admin"
      ? "text-amber-400"
      : userRole === "gerente"
      ? "text-blue-400"
      : "text-emerald-400";

  // Conteúdo interno da sidebar (reutilizado em desktop e mobile drawer)
  function SidebarContent({ isMobile = false }: { isMobile?: boolean }) {
    const isCollapsed = isMobile ? false : collapsed;
    const handleTabClick = (tab: Tab) => {
      onTabChange(tab);
      if (isMobile) setMobileOpen(false);
    };
    return (
      <>
        {/* Logo + Collapse Button */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06]">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-none truncate">Meta Dashboard</p>
                <p className="text-[10px] text-white/40 leading-none mt-0.5 truncate">Gestão de Metas</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!isMobile && !isCollapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors flex-shrink-0"
              title="Recolher menu"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {!isMobile && isCollapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute -right-3 top-[52px] w-6 h-6 rounded-full bg-[#0f1117] border border-white/10 flex items-center justify-center text-white/50 hover:text-white/90 hover:border-white/30 transition-all shadow-lg z-10"
              title="Expandir menu"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors flex-shrink-0"
              title="Fechar menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 px-2 scrollbar-none">
          {/* Módulos principais */}
          {!isCollapsed && (
            <p className="text-[9px] font-bold text-white/25 tracking-[0.15em] uppercase px-2 pb-1">
              Módulos
            </p>
          )}
          {visibleTabs.map((item) => {
            const isActive = activeTab === item.id && location === "/";
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`
                  w-full flex items-center gap-2.5 rounded-xl transition-all duration-150
                  ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                  ${
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-transparent"
                  }
                `}
              >
                <span className={`flex-shrink-0 ${isActive ? "text-indigo-400" : ""}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${item.badgeColor} text-white leading-none`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}
                {!isCollapsed && isActive && (
                  <div className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                )}
              </button>
            );
          })}

          {/* Separador */}
          {visibleLinks.length > 0 && (
            <div className="my-2 border-t border-white/[0.06]" />
          )}

          {/* Páginas externas */}
          {!isCollapsed && visibleLinks.length > 0 && (
            <p className="text-[9px] font-bold text-white/25 tracking-[0.15em] uppercase px-2 pb-1">
              Páginas
            </p>
          )}
          {visibleLinks.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <button
                  onClick={() => isMobile && setMobileOpen(false)}
                  title={isCollapsed ? link.label : undefined}
                  className={`
                    w-full flex items-center gap-2.5 rounded-xl transition-all duration-150
                    ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                    ${
                      isActive
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.05] border border-transparent"
                    }
                  `}
                >
                  <span className={`flex-shrink-0 ${isActive ? "text-violet-400" : ""}`}>
                    {link.icon}
                  </span>
                  {!isCollapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium truncate">{link.label}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
                      </div>
                      <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                        {link.description}
                      </p>
                    </div>
                  )}
                </button>
              </Link>
            );
          })}

          {/* Ações rápidas */}
          {(isGerente || isAdmin) && (
            <>
              <div className="my-2 border-t border-white/[0.06]" />
              {!isCollapsed && (
                <p className="text-[9px] font-bold text-white/25 tracking-[0.15em] uppercase px-2 pb-1">
                  Ações Rápidas
                </p>
              )}
              <button
                onClick={() => { onSyncCB?.(); isMobile && setMobileOpen(false); }}
                disabled={syncingCB}
                title={isCollapsed ? "Sync CashBarber" : undefined}
                className={`
                  w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 border border-transparent
                  ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                  text-white/40 hover:text-emerald-400 hover:bg-emerald-500/[0.07] hover:border-emerald-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <RefreshCw className={`w-4 h-4 flex-shrink-0 ${syncingCB ? "animate-spin text-emerald-400" : ""}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-medium truncate block">Sync CashBarber</span>
                    <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                      Atualizar dados operacionais
                    </p>
                  </div>
                )}
              </button>
              <button
                onClick={() => { onSyncDpote?.(); isMobile && setMobileOpen(false); }}
                disabled={syncingDpote}
                title={isCollapsed ? "Sync Dpote" : undefined}
                className={`
                  w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 border border-transparent
                  ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                  text-white/40 hover:text-violet-400 hover:bg-violet-500/[0.07] hover:border-violet-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Zap className={`w-4 h-4 flex-shrink-0 ${syncingDpote ? "animate-pulse text-violet-400" : ""}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-medium truncate block">Sync Dpote</span>
                    <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                      Recalcular recorrência
                    </p>
                  </div>
                )}
              </button>
              <button
                onClick={() => { onTestarMetaDiaria?.(); isMobile && setMobileOpen(false); }}
                disabled={testingMetaDiaria}
                title={isCollapsed ? "Verificar Meta Diária" : undefined}
                className={`
                  w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 border border-transparent
                  ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                  text-white/40 hover:text-amber-400 hover:bg-amber-500/[0.07] hover:border-amber-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Target className={`w-4 h-4 flex-shrink-0 ${testingMetaDiaria ? "animate-pulse text-amber-400" : ""}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-medium truncate block">Meta Diária</span>
                    <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                      Verificar e notificar gerente
                    </p>
                  </div>
                )}
              </button>
              <button
                onClick={() => { onRecalcularRanking?.(); isMobile && setMobileOpen(false); }}
                disabled={recalculandoRanking}
                title={isCollapsed ? "Recalcular Ranking" : undefined}
                className={`
                  w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 border border-transparent
                  ${isCollapsed ? "justify-center p-2" : "px-2.5 py-2.5"}
                  text-white/40 hover:text-emerald-400 hover:bg-emerald-500/[0.07] hover:border-emerald-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Trophy className={`w-4 h-4 flex-shrink-0 ${recalculandoRanking ? "animate-pulse text-emerald-400" : ""}`} />
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-medium truncate block">Recalcular Ranking</span>
                    <p className="text-[10px] text-white/25 truncate leading-none mt-0.5">
                      Reprocessar mês atual
                    </p>
                  </div>
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer: perfil + logout */}
        <div className="border-t border-white/[0.06] p-2">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white/80">
                  {userName?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate leading-none">{userName ?? "Usuário"}</p>
                <p className={`text-[10px] font-medium leading-none mt-0.5 ${roleColor}`}>{roleLabel}</p>
              </div>
              <button
                onClick={onLogout}
                title="Sair"
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              title="Sair"
              className="w-full flex items-center justify-center p-2 rounded-xl text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── BOTÃO HAMBÚRGUER MOBILE (visível apenas em telas pequenas) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl bg-[#0f1117] border border-white/10 flex items-center justify-center text-white/60 hover:text-white shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* ── OVERLAY MOBILE ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── DRAWER MOBILE ── */}
      <div
        className={`
          md:hidden fixed top-0 left-0 z-50 h-full w-[260px]
          bg-[#0f1117] border-r border-white/[0.06] flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent isMobile={true} />
      </div>

      {/* ── SIDEBAR DESKTOP (oculta em mobile) ── */}
      <aside
        className={`
          hidden md:flex flex-col h-screen sticky top-0 z-30
          bg-[#0f1117] border-r border-white/[0.06]
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[64px]" : "w-[220px]"}
          flex-shrink-0
        `}
      >
        <SidebarContent isMobile={false} />
      </aside>
    </>
  );
}
