import { LayoutDashboard, Calendar, Target, CheckCircle2, Trophy, Plus } from "lucide-react";

type Tab = "dashboard" | "lancamentos" | "metas" | "bonificacao" | "historico" | "usuarios" | "empresas" | "auditoria" | "ia" | "dpote";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  tabsVisiveis: Tab[];
  /** Se true, exibe o botão FAB (+) centralizado para lançamento rápido */
  showFab?: boolean;
  /** Callback ao clicar no FAB */
  onFabClick?: () => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Início",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: "lancamentos",
    label: "Lançamentos",
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: "metas",
    label: "Metas",
    icon: <Target className="w-5 h-5" />,
  },
  {
    id: "bonificacao",
    label: "Bonificação",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  {
    id: "historico",
    label: "Histórico",
    icon: <Trophy className="w-5 h-5" />,
  },
];

export default function BottomNav({
  activeTab,
  onTabChange,
  tabsVisiveis,
  showFab = false,
  onFabClick,
}: BottomNavProps) {
  // Mostrar apenas os itens que o usuário tem acesso, limitado a 4 para não ficar apertado
  const visibleItems = NAV_ITEMS.filter((item) => tabsVisiveis.includes(item.id)).slice(0, 4);

  if (visibleItems.length === 0) return null;

  // Com FAB: dividir os itens em dois grupos (esquerda e direita) para o FAB ficar no centro
  const leftItems = showFab ? visibleItems.slice(0, Math.ceil(visibleItems.length / 2)) : visibleItems;
  const rightItems = showFab ? visibleItems.slice(Math.ceil(visibleItems.length / 2)) : [];

  function NavButton({ item }: { item: (typeof NAV_ITEMS)[0] }) {
    const isActive = activeTab === item.id;
    return (
      <button
        onClick={() => onTabChange(item.id)}
        className={`
          flex-1 flex flex-col items-center justify-center gap-0.5 px-1
          transition-colors duration-150
          ${isActive
            ? "text-indigo-400"
            : "text-muted-foreground hover:text-foreground"
          }
        `}
        aria-label={item.label}
      >
        <div className={`
          flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150
          ${isActive ? "bg-indigo-500/15" : ""}
        `}>
          <span className={`transition-transform duration-150 ${isActive ? "scale-110" : ""}`}>
            {item.icon}
          </span>
          <span className={`text-[10px] font-medium leading-none ${isActive ? "text-indigo-400 font-semibold" : ""}`}>
            {item.label}
          </span>
        </div>
      </button>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-pb">
      <div className="flex items-stretch h-16 relative">
        {/* Itens da esquerda */}
        {leftItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}

        {/* Botão FAB centralizado */}
        {showFab && (
          <div className="flex items-center justify-center px-2 relative">
            {/* Recorte visual na barra */}
            <button
              onClick={onFabClick}
              className="
                w-12 h-12 rounded-full
                bg-gradient-to-br from-indigo-500 to-violet-600
                flex items-center justify-center
                shadow-[0_4px_20px_rgba(99,102,241,0.55)]
                active:scale-95 transition-transform duration-100
                -mt-5
                border-2 border-card
              "
              aria-label="Novo lançamento"
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Itens da direita */}
        {rightItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </div>
      {/* Safe area para iPhone com notch */}
      <div className="h-safe-bottom bg-card" />
    </nav>
  );
}
