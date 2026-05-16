import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";

interface QuinzenalCelebrationProps {
  /** true = meta atingida, dispara confetti e exibe badge */
  atingiu: boolean;
  /** Percentual atingido (ex: 106.39) */
  percentual: number;
  /** Valor que superou a meta (pode ser 0) */
  superou: number;
  /** Nome da unidade para personalizar a mensagem */
  nomeUnidade?: string;
  /** Cor da unidade (hex) */
  cor?: string;
  /** Modo compacto para o card geral (sem confetti automático) */
  compact?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

/**
 * Componente de celebração quinzenal.
 * Quando atingiu=true, exibe um badge animado com brilho dourado e dispara confetti.
 */
export function QuinzenalCelebration({
  atingiu,
  percentual,
  superou,
  nomeUnidade,
  cor = "#10b981",
  compact = false,
}: QuinzenalCelebrationProps) {
  const hasFiredRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!atingiu) return;
    // Pequeno delay para o componente montar antes de disparar
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, [atingiu]);

  useEffect(() => {
    if (!visible || hasFiredRef.current || compact) return;
    hasFiredRef.current = true;

    // Confetti burst — dois canhões laterais
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...opts,
        origin: { y: 0.7 },
        particleCount: Math.floor(200 * particleRatio),
        spread: 70,
        startVelocity: 30,
        scalar: 0.9,
        ticks: 200,
        zIndex: 9999,
      });
    };

    fire(0.25, { angle: 60, origin: { x: 0, y: 0.65 }, colors: ["#fbbf24", "#f59e0b", "#10b981", "#34d399"] });
    fire(0.25, { angle: 120, origin: { x: 1, y: 0.65 }, colors: ["#fbbf24", "#f59e0b", "#10b981", "#34d399"] });
    fire(0.35, { angle: 90, origin: { x: 0.5, y: 0.7 }, colors: ["#fbbf24", "#f59e0b", "#a78bfa", "#60a5fa"] });

    // Segunda rajada após 800ms
    setTimeout(() => {
      fire(0.15, { angle: 75, origin: { x: 0.2, y: 0.6 }, colors: ["#fbbf24", "#10b981"] });
      fire(0.15, { angle: 105, origin: { x: 0.8, y: 0.6 }, colors: ["#fbbf24", "#10b981"] });
    }, 800);
  }, [visible, compact]);

  if (!atingiu) return null;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{
        background: `linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)`,
        border: "1.5px solid #34d39960",
        boxShadow: visible ? "0 0 20px #10b98140, 0 0 40px #10b98120" : "none",
      }}
    >
      {/* Brilho animado passando pelo card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
          animation: visible ? "shimmerPass 2.5s ease-in-out infinite" : "none",
        }}
      />

      <div className="relative px-3 py-2.5 flex items-center gap-2.5">
        {/* Troféu animado */}
        <div
          className="flex-shrink-0 text-2xl"
          style={{ animation: visible ? "trophyBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) both" : "none" }}
        >
          🏆
        </div>

        <div className="flex-1 min-w-0">
          {/* Título */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold text-emerald-100 uppercase tracking-wider">
              META QUINZENAL ATINGIDA
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
              <span className="text-[10px] text-emerald-300/80 font-medium">{nomeUnidade}</span>
            )}
            {superou > 0 && (
              <span className="text-[10px] font-bold text-yellow-300">
                +{formatCurrency(superou)} acima 🎉
              </span>
            )}
          </div>
        </div>

        {/* Estrelas decorativas */}
        <div className="flex-shrink-0 flex flex-col gap-0.5 opacity-70">
          <span className="text-[10px]" style={{ animation: "starPulse 1.5s ease-in-out infinite" }}>⭐</span>
          <span className="text-[10px]" style={{ animation: "starPulse 1.5s ease-in-out 0.5s infinite" }}>✨</span>
        </div>
      </div>

      {/* CSS animations inlined via style tag */}
      <style>{`
        @keyframes shimmerPass {
          0% { transform: translateX(-100%); }
          60% { transform: translateX(200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          20% { transform: scale(1.3) rotate(-10deg); }
          40% { transform: scale(0.9) rotate(8deg); }
          60% { transform: scale(1.15) rotate(-5deg); }
          80% { transform: scale(0.95) rotate(3deg); }
        }
        @keyframes starPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

/**
 * Versão compacta para o card geral (sem confetti, apenas badge).
 */
export function QuinzenalCelebrationCompact({
  atingiu,
  percentual,
  superou,
}: Pick<QuinzenalCelebrationProps, "atingiu" | "percentual" | "superou">) {
  return (
    <QuinzenalCelebration
      atingiu={atingiu}
      percentual={percentual}
      superou={superou}
      compact={true}
    />
  );
}
