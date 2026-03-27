import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Users,
  Trophy,
  BarChart2,
  Scissors,
  Target,
  Percent,
  Calendar,
  Building2,
  Shield,
  Sparkles,
  Repeat2,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";

// Tipos de perfil
type UserPerfil = "gerente" | "operador" | "recepcionista";
type UserRole = "admin" | "user";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  /** Perfis que podem ver este item. Se undefined, todos veem. */
  perfis?: UserPerfil[];
  /** Roles que podem ver este item. Se undefined, todos veem. */
  roles?: UserRole[];
  /** Se true, apenas super-admin (tenantId === null) pode ver */
  superAdminOnly?: boolean;
  /** Grupo de agrupamento na sidebar */
  group: "principal" | "equipe" | "gestao" | "sistema";
}

const ALL_MENU_ITEMS: MenuItem[] = [
  // ─── Principal ────────────────────────────────────────────────
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    group: "principal",
  },
  {
    icon: Calendar,
    label: "Lançamentos",
    path: "/lancamentos",
    group: "principal",
  },
  // ─── Equipe ───────────────────────────────────────────────────
  {
    icon: Scissors,
    label: "Profissionais",
    path: "/profissionais",
    perfis: ["gerente"],
    group: "equipe",
  },
  {
    icon: Users,
    label: "Metas da Equipe",
    path: "/colaboradores",
    perfis: ["gerente"],
    group: "equipe",
  },
  {
    icon: Trophy,
    label: "Ranking Público",
    path: "/ranking",
    perfis: ["gerente"],
    group: "equipe",
  },
  // ─── Gestão ───────────────────────────────────────────────────
  {
    icon: Target,
    label: "Metas",
    path: "/metas",
    perfis: ["gerente"],
    group: "gestao",
  },
  {
    icon: Percent,
    label: "Bonificação",
    path: "/bonificacao",
    perfis: ["gerente"],
    group: "gestao",
  },
  {
    icon: BarChart2,
    label: "Histórico Anual",
    path: "/historico-acuracia",
    perfis: ["gerente"],
    group: "gestao",
  },
  {
    icon: Repeat2,
    label: "Dpote",
    path: "/dpote",
    perfis: ["gerente"],
    group: "gestao",
  },
  {
    icon: Sparkles,
    label: "Análise IA",
    path: "/ia",
    perfis: ["gerente"],
    group: "gestao",
  },
  // ─── Sistema ──────────────────────────────────────────────────
  {
    icon: Building2,
    label: "Empresas",
    path: "/empresas",
    roles: ["admin"],
    group: "sistema",
  },
  {
    icon: Users,
    label: "Usuários",
    path: "/usuarios",
    roles: ["admin"],
    group: "sistema",
  },
  {
    icon: Shield,
    label: "Auditoria",
    path: "/auditoria",
    roles: ["admin"],
    group: "sistema",
  },
  {
    icon: Shield,
    label: "Painel Admin",
    path: "/admin-panel",
    roles: ["admin"],
    group: "sistema",
  },
  {
    icon: Shield,
    label: "Dev Panel",
    path: "/dev",
    superAdminOnly: true,
    group: "sistema",
  },
];

const GROUP_LABELS: Record<string, string> = {
  principal: "Principal",
  equipe: "Equipe",
  gestao: "Gestão",
  sistema: "Sistema",
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Faça login para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso a este painel requer autenticação.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme?.() ?? {};

  // Permissões do usuário
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = isAdmin && !(user as any)?.tenantId;
  const perfil = (user as any)?.perfil as UserPerfil | undefined;

  // Filtrar itens de menu por perfil/role
  const visibleItems = ALL_MENU_ITEMS.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.roles && !item.roles.includes(user?.role as UserRole)) return false;
    if (item.perfis) {
      // Admin sempre vê itens de gerente
      if (isAdmin) return true;
      if (!perfil || !item.perfis.includes(perfil)) return false;
    }
    return true;
  });

  // Agrupar itens visíveis por grupo
  const groups = ["principal", "equipe", "gestao", "sistema"] as const;
  const itemsByGroup = groups.reduce((acc, g) => {
    acc[g] = visibleItems.filter((i) => i.group === g);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  // Encontrar item ativo (match exato ou por prefixo para sub-rotas)
  const activeItem = visibleItems.find(
    (item) => location === item.path || (item.path !== "/" && location.startsWith(item.path))
  );

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header da sidebar */}
          <SidebarHeader className="h-14 justify-center border-b border-border/50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Alternar navegação"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                    <Target className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-semibold tracking-tight truncate text-sm">
                    Meta Dashboard
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Conteúdo da sidebar — grupos de menu */}
          <SidebarContent className="gap-0 pt-2">
            {groups.map((group) => {
              const items = itemsByGroup[group];
              if (!items || items.length === 0) return null;
              return (
                <SidebarGroup key={group} className="px-2 py-0 mb-1">
                  {!isCollapsed && (
                    <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pb-1 pt-2">
                      {GROUP_LABELS[group]}
                    </SidebarGroupLabel>
                  )}
                  <SidebarMenu>
                    {items.map((item) => {
                      const isActive =
                        location === item.path ||
                        (item.path !== "/" && location.startsWith(item.path));
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setLocation(item.path)}
                            tooltip={item.label}
                            className="h-9 transition-all font-normal"
                          >
                            <item.icon
                              className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                            />
                            <span>{item.label}</span>
                            {isActive && !isCollapsed && (
                              <ChevronRight className="ml-auto h-3 w-3 text-primary/60" />
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              );
            })}
          </SidebarContent>

          {/* Footer da sidebar — perfil do usuário */}
          <SidebarFooter className="p-3 border-t border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1 capitalize">
                      {perfil ?? user?.role ?? "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{perfil ?? user?.role}</p>
                </div>
                <DropdownMenuSeparator />
                {toggleTheme && (
                  <>
                    <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                      {theme === "dark" ? (
                        <><Sun className="mr-2 h-4 w-4" /><span>Tema Claro</span></>
                      ) : (
                        <><Moon className="mr-2 h-4 w-4" /><span>Tema Escuro</span></>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Handle de redimensionamento */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Header mobile */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <span className="font-medium text-sm text-foreground">
                {activeItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
