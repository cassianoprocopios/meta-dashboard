import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

interface MensalCelebrationProps {
  /** true = meta mensal atingida, dispara confetti e exibe badge */
  atingiu: boolean;
  /** Percentual atingido (ex: 102.5) */
  percentual: number;
  /** Quanto superou a meta (0 se não superou) */
  superou: number;
  /** Nome da unidade (opcional) */
  nomeUnidade?: string;
  /** Cor da empresa (opcional) */
  cor?: string;
  /** Modo compacto: sem confetti automático */
  compact?: boolean;
}

/**
 * Componente de celebração de meta MENSAL.
 * Quando atingiu=true, exibe um badge animado dourado e dispara confetti premium.
 * Visual diferenciado do quinzenal: dourado/âmbar em vez de verde esmeralda.
 */
export function MensalCelebration({
  atingiu,
  percentual,
  superou,
  nomeUnidade,
  compact = false,
}: MensalCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!atingiu) return;
    const timer = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(timer);
  }, [atingiu]);

  useEffect(() => {
    if (!visible || hasFiredRef.current || compact) return;
    hasFiredRef.current = true;

    // Confetti premium — mais partículas, cores douradas/roxas
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...opts,
        particleCount: Math.floor(300 * particleRatio),
        spread: 80,
        startVelocity: 35,
        scalar: 1.0,
        ticks: 250,
        zIndex: 9999,
      });
    };

    // Primeira rajada — dois canhões laterais dourados
    fire(0.3, { angle: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#f59e0b", "#fcd34d", "#fde68a"] });
    fire(0.3, { angle: 125, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#f59e0b", "#fcd34d", "#fde68a"] });
    fire(0.4, { angle: 90, origin: { x: 0.5, y: 0.65 }, colors: ["#fbbf24", "#a78bfa", "#60a5fa", "#34d399"] });

    // Segunda rajada após 600ms — mais dispersa
    setTimeout(() => {
      fire(0.2, { angle: 70, origin: { x: 0.15, y: 0.55 }, colors: ["#fbbf24", "#f59e0b", "#10b981"] });
      fire(0.2, { angle: 110, origin: { x: 0.85, y: 0.55 }, colors: ["#fbbf24", "#f59e0b", "#10b981"] });
    }, 600);

    // Terceira rajada após 1.4s — chuva central
    setTimeout(() => {
      fire(0.15, { angle: 90, origin: { x: 0.4, y: 0.5 }, colors: ["#fbbf24", "#fcd34d"] });
      fire(0.15, { angle: 90, origin: { x: 0.6, y: 0.5 }, colors: ["#fbbf24", "#fcd34d"] });
    }, 1400);
  }, [visible, compact]);

  if (!atingiu) return null;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
      }`}
      style={{
        background: `linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)`,
        border: "1.5px solid #fbbf2460",
        boxShadow: visible ? "0 0 24px #fbbf2440, 0 0 48px #f59e0b20" : "none",
      }}
    >
      {/* Brilho animado passando pelo card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)",
          animation: visible ? "mensalShimmer 2s ease-in-out infinite" : "none",
        }}
      />

      <div className="relative px-3 py-2.5 flex items-center gap-2.5">
        {/* Troféu dourado animado */}
        <div
          className="flex-shrink-0 text-2xl"
          style={{ animation: visible ? "mensalTrophy 0.7s cubic-bezier(0.36,0.07,0.19,0.97) both" : "none" }}
        >
          🏆
        </div>

        <div className="flex-1 min-w-0">
          {/* Título */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-amber-100 uppercase tracking-wider">
              META MENSAL ATINGIDA
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#fbbf2430", color: "#fbbf24", border: "1px solid #fbbf2450" }}
            >
              {percentual.toFixed(1)}%
            </span>
          </div>

          {/* Detalhes */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {nomeUnidade && (
              <span className="text-[10px] text-amber-300/80 font-medium">{nomeUnidade}</span>
            )}
            {superou > 0 && (
              <span className="text-[10px] font-bold text-yellow-300">
                +{superou.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} acima 🎉
              </span>
            )}
          </div>
        </div>

        {/* Estrelas decorativas */}
        <div className="flex-shrink-0 flex flex-col gap-0.5 opacity-80">
          <span className="text-[11px]" style={{ animation: "mensalStar 1.4s ease-in-out infinite" }}>⭐</span>
          <span className="text-[11px]" style={{ animation: "mensalStar 1.4s ease-in-out 0.7s infinite" }}>🌟</span>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes mensalShimmer {
          0% { transform: translateX(-100%); }
          55% { transform: translateX(220%); }
          100% { transform: translateX(220%); }
        }
        @keyframes mensalTrophy {
          0%, 100% { transform: scale(1) rotate(0deg); }
          15% { transform: scale(1.4) rotate(-12deg); }
          35% { transform: scale(0.88) rotate(10deg); }
          55% { transform: scale(1.2) rotate(-6deg); }
          75% { transform: scale(0.95) rotate(4deg); }
        }
        @keyframes mensalStar {
          0%, 100% { opacity: 0.8; transform: scale(1) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.4) rotate(20deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Versão compacta para o card geral (sem confetti, apenas badge).
 */
export function MensalCelebrationCompact({
  atingiu,
  percentual,
  superou,
}: Pick<MensalCelebrationProps, "atingiu" | "percentual" | "superou">) {
  return (
    <MensalCelebration
      atingiu={atingiu}
      percentual={percentual}
      superou={superou}
      compact={true}
    />
  );
}
