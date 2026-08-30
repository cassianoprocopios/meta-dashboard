import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { LayoutDashboard, LogOut, PanelLeft, Users, Scissors, BarChart2, Building2, Trophy, Target, ClipboardList, Shield, Code2, History, Activity, Smartphone, UserCog, CalendarDays } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  perfis?: string[];
  roles?: string[];
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Scissors, label: "Profissionais", path: "/profissionais", perfis: ["gerente", "operador", "admin"] },
  { icon: UserCog, label: "Gestão de Colaboradores", path: "/colaboradores", perfis: ["gerente"] },
  { icon: Target, label: "Metas", path: "/", perfis: ["gerente", "operador", "admin"] },
  { icon: ClipboardList, label: "Lançamentos", path: "/" },
  { icon: BarChart2, label: "Bonificação", path: "/", perfis: ["gerente", "admin"] },
  { icon: History, label: "Histórico Anual", path: "/", perfis: ["gerente", "admin"] },
  { icon: BarChart2, label: "Histórico Bonificações", path: "/historico-bonificacoes", perfis: ["gerente", "admin"] },
  { icon: Building2, label: "Empresas", path: "/", perfis: ["admin"], roles: ["admin"] },
  { icon: Users, label: "Usuários", path: "/", perfis: ["admin"], roles: ["admin"] },
  { icon: Trophy, label: "Ranking Público", path: "/ranking" },
  { icon: Activity, label: "Status Sync", path: "/sync-status", roles: ["admin"] },
  { icon: Smartphone, label: "Acesso Profissionais", path: "/acesso-profissionais", roles: ["admin"] },
  { icon: Shield, label: "Admin", path: "/admin-panel", roles: ["admin"] },
  { icon: Code2, label: "Dev Panel", path: "/dev", roles: ["admin"] },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
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
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
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
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
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

    const handleMouseUp = () => {
      setIsResizing(false);
    };

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

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-[72px] justify-center border-b border-white/8 px-3">
            <div className="flex items-center gap-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-[10px] bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed ? (
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold tracking-[-0.02em] text-white">Meta Dashboard</span>
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.12em] text-white/35">Gestão de performance</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-3">
            {!isCollapsed && <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">Navegação</p>}
            <SidebarMenu className="gap-1">
              {menuItems
                .filter(item => {
                  // Filtrar por role se especificado
                  if (item.roles && item.roles.length > 0) {
                    if (!item.roles.includes(user?.role ?? "")) return false;
                  }
                  // Administradores têm acesso global; demais usuários respeitam o perfil do item
                  if (item.perfis && item.perfis.length > 0 && user?.role !== "admin") {
                    if (!item.perfis.includes(user?.perfil ?? "")) return false;
                  }
                  return true;
                })
                .map(item => {
                  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                  return (
                    <SidebarMenuItem key={`${item.label}-${item.path}`}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-11 rounded-[10px] font-medium text-white/55 transition-all hover:bg-white/7 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_#34d399]"
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-emerald-300" : "text-white/45"}`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/8 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-[10px] px-1 py-1.5 transition-colors w-full text-left hover:bg-white/7 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                  <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                    <AvatarFallback className="bg-emerald-400/15 text-xs font-semibold text-emerald-200">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white/85">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/35 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[#f5f7fa]">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm" />}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">Meta Dashboard</p>
              <h1 className="text-base font-semibold tracking-[-0.025em] text-[#12233f]">{activeMenuItem?.label ?? "Visão geral"}</h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:flex">
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
