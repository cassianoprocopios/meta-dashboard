import { LayoutDashboard, Calendar, Target, CheckCircle2, Trophy } from "lucide-react";

type Tab = "dashboard" | "lancamentos" | "metas" | "bonificacao" | "historico" | "usuarios" | "empresas" | "auditoria" | "ia" | "dpote";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  tabsVisiveis: Tab[];
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

export default function BottomNav({ activeTab, onTabChange, tabsVisiveis }: BottomNavProps) {
  // Mostrar apenas os itens que o usuário tem acesso, limitado a 4 para não ficar apertado
  const visibleItems = NAV_ITEMS.filter((item) => tabsVisiveis.includes(item.id)).slice(0, 4);

  if (visibleItems.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-pb">
      <div className="flex items-stretch h-16">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
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
              {/* Indicador ativo */}
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
        })}
      </div>
      {/* Safe area para iPhone com notch */}
      <div className="h-safe-bottom bg-card" />
    </nav>
  );
}
