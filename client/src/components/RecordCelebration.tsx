import type { CSSProperties } from "react";

const PARTICULAS = [
  { left: 6, drift: -14, turn: -160, color: "#34d399", delay: 0 },
  { left: 15, drift: 18, turn: 220, color: "#fbbf24", delay: 45 },
  { left: 25, drift: -10, turn: 140, color: "#2dd4bf", delay: 90 },
  { left: 36, drift: 22, turn: -240, color: "#60a5fa", delay: 30 },
  { left: 47, drift: -18, turn: 200, color: "#f59e0b", delay: 120 },
  { left: 58, drift: 12, turn: -180, color: "#34d399", delay: 75 },
  { left: 69, drift: -22, turn: 260, color: "#fbbf24", delay: 150 },
  { left: 79, drift: 15, turn: -210, color: "#2dd4bf", delay: 105 },
  { left: 89, drift: -12, turn: 170, color: "#60a5fa", delay: 180 },
  { left: 96, drift: -24, turn: -260, color: "#34d399", delay: 60 },
];

export default function RecordCelebration() {
  return (
    <div className="record-celebration" aria-hidden="true">
      {PARTICULAS.map((particula, index) => (
        <span
          key={index}
          style={{
            left: `${particula.left}%`,
            backgroundColor: particula.color,
            animationDelay: `${particula.delay}ms`,
            "--record-drift": `${particula.drift}px`,
            "--record-turn": `${particula.turn}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
