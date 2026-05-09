/**
 * RankingExportCard — card estático otimizado para exportação como imagem (WhatsApp).
 * Não usa recharts/interatividade — apenas HTML/CSS puro para captura fiel pelo html-to-image.
 */
import { forwardRef } from "react";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtShort(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
}

function getColor(pct: number) {
  if (pct >= 100) return "#34d399";
  if (pct >= 75) return "#60a5fa";
  if (pct >= 50) return "#fbbf24";
  return "#f87171";
}

function getSemaforo(pct: number) {
  if (pct >= 100) return { emoji: "🟢", label: "Meta atingida!" };
  if (pct >= 75) return { emoji: "🔵", label: "No caminho certo" };
  if (pct >= 50) return { emoji: "🟡", label: "Atenção necessária" };
  return { emoji: "🔴", label: "Abaixo da meta" };
}

const MESES_PT_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

interface Prof {
  id: number;
  nome: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  totalGeral: number;
  totalServicos: number;
  totalProdutos: number;
  qtdServicos: number;
  qtdProdutos: number;
  metaMensal?: number | null;
}

interface RankingExportCardProps {
  unitName: string;
  unitColor: string;
  mes: number;
  ano: number;
  totalRealizado: number;
  metaMensal: number;
  pctMeta: number;
  faltaMeta: number | null;
  projecaoFimMes: number;
  mediaDiaria: number;
  metaDiariaNecessaria: number | null;
  diasRestantes: number;
  diasNoMes: number;
  profissionais: Prof[];
}

export const RankingExportCard = forwardRef<HTMLDivElement, RankingExportCardProps>(
  function RankingExportCard(
    {
      unitName,
      unitColor,
      mes,
      ano,
      totalRealizado,
      metaMensal,
      pctMeta,
      faltaMeta,
      projecaoFimMes,
      mediaDiaria,
      metaDiariaNecessaria,
      diasRestantes,
      diasNoMes,
      profissionais,
    },
    ref
  ) {
    const color = getColor(pctMeta);
    const semaforo = getSemaforo(pctMeta);
    const sorted = [...profissionais].sort((a, b) => (b.totalGeral ?? 0) - (a.totalGeral ?? 0));
    const now = new Date();
    const timeStr = now.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

    return (
      <div
        ref={ref}
        style={{
          width: 480,
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 20,
          padding: 24,
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          color: "#f1f5f9",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%", background: unitColor, flexShrink: 0
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
              Ranking — {unitName}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
              {MESES_PT_FULL[mes - 1]} {ano} · Atualizado {timeStr}
            </div>
          </div>
          <div style={{
            background: "#1e3a5f",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: "#93c5fd",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}>
            BARBIERO
          </div>
        </div>

        {/* Faturamento principal */}
        <div style={{
          background: "rgba(30,41,59,0.8)",
          border: "1px solid rgba(51,65,85,0.8)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                Faturamento Realizado
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                {fmt(totalRealizado)}
              </div>
              <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 600 }}>
                {semaforo.emoji} {semaforo.label}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                Meta Mensal
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#cbd5e1" }}>
                {fmt(metaMensal)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color, marginTop: 2 }}>
                {pctMeta}% atingido
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div style={{ height: 8, background: "rgba(51,65,85,0.6)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
            <div style={{
              height: "100%",
              width: `${Math.min(pctMeta, 100)}%`,
              background: color,
              borderRadius: 4,
            }} />
          </div>

          {/* Métricas grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "rgba(51,65,85,0.4)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>
                Falta para meta
              </div>
              {faltaMeta !== null && faltaMeta > 0 ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fcd34d" }}>{fmt(faltaMeta)}</div>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399" }}>✓ Meta atingida!</div>
              )}
            </div>
            <div style={{ background: "rgba(51,65,85,0.4)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>
                Projeção fim do mês
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: projecaoFimMes >= metaMensal ? "#34d399" : "#fcd34d" }}>
                {fmt(projecaoFimMes)}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas de ritmo */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Média/dia</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{fmtShort(mediaDiaria)}</div>
          </div>
          <div style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Meta/dia nec.</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: metaDiariaNecessaria !== null && mediaDiaria >= metaDiariaNecessaria ? "#34d399" : "#fcd34d" }}>
              {metaDiariaNecessaria !== null ? fmtShort(metaDiariaNecessaria) : "—"}
            </div>
          </div>
          <div style={{ background: "rgba(30,41,59,0.8)", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 10, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", marginBottom: 2 }}>Dias rest.</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{diasRestantes}d / {diasNoMes}d</div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: "rgba(51,65,85,0.6)", marginBottom: 12 }} />

        {/* Ranking de profissionais */}
        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          👥 Profissionais ({sorted.length})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((prof, idx) => {
            const pos = idx + 1;
            const medalha = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
            const pctProfMeta = prof.metaMensal && prof.metaMensal > 0
              ? Math.round((prof.totalGeral / prof.metaMensal) * 100)
              : null;
            const profColor = pctProfMeta !== null ? getColor(pctProfMeta) : "#94a3b8";
            const nome = prof.apelido || prof.nome.split(" ")[0];
            const initials = (prof.nome || "?")[0].toUpperCase();

            return (
              <div
                key={prof.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: pos <= 3 ? "rgba(30,41,59,0.9)" : "rgba(15,23,42,0.6)",
                  border: `1px solid ${pos <= 3 ? "rgba(71,85,105,0.8)" : "rgba(51,65,85,0.4)"}`,
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                {/* Posição */}
                <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {medalha ? (
                    <span style={{ fontSize: 18 }}>{medalha}</span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{pos}º</span>
                  )}
                </div>

                {/* Avatar */}
                {prof.fotoUrl ? (
                  <img
                    src={prof.fotoUrl}
                    alt={nome}
                    style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${unitColor}cc, ${unitColor}66)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {nome}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                    {prof.qtdServicos > 0 && (
                      <span style={{ fontSize: 10, color: "#94a3b8", background: "rgba(51,65,85,0.5)", padding: "1px 5px", borderRadius: 4 }}>
                        ✂️ {prof.qtdServicos}
                      </span>
                    )}
                    {prof.qtdProdutos > 0 && (
                      <span style={{ fontSize: 10, color: "#94a3b8", background: "rgba(51,65,85,0.5)", padding: "1px 5px", borderRadius: 4 }}>
                        🛍️ {prof.qtdProdutos}
                      </span>
                    )}
                  </div>
                  {pctProfMeta !== null && prof.metaMensal && prof.metaMensal > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ height: 4, background: "rgba(51,65,85,0.5)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pctProfMeta, 100)}%`, background: profColor, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: profColor, marginTop: 1, fontWeight: 600 }}>
                        {pctProfMeta}% da meta ({fmtShort(prof.metaMensal)})
                      </div>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{fmt(prof.totalGeral)}</div>
                  {prof.totalServicos > 0 && prof.totalProdutos > 0 && (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                      {fmtShort(prof.totalServicos)} + {fmtShort(prof.totalProdutos)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(51,65,85,0.4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#475569" }}>
            performancemeta.sbs
          </div>
          <div style={{ fontSize: 10, color: "#475569" }}>
            Barbiero Barbearia · {MESES_PT_FULL[mes - 1]} {ano}
          </div>
        </div>
      </div>
    );
  }
);
