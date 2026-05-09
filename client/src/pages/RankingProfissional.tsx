import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Trophy, TrendingUp, Calendar, LogOut, ChevronLeft, ChevronRight, Globe, TrendingDown, Minus, Scissors, ShoppingBag, BarChart2, Copy, Check, Star, Target, Award, Zap, Bell, BellOff, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ─── Utilitários de data ─────────────────────────────────────────────────────
function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mesAtual(): { mes: number; ano: number } {
  const d = new Date();
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}
function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
function nomeMes(mes: number) {
  return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
}

const EMPRESA_LABEL: Record<string, string> = {
  MASCOTE: "Barbiero Mascote",
  MORUMBI: "Barbiero Morumbi",
  "barbiero-grupo": "Barbiero",
  "barbiero-morumbi": "Barbiero Morumbi",
  "barbiero-mascote": "Barbiero Mascote",
};
function empresaLabel(slug: string | null | undefined) {
  if (!slug) return "Barbiero";
  return EMPRESA_LABEL[slug] ?? slug;
}

// ─── Gerador de texto do ranking para WhatsApp ───────────────────────────────
function gerarTextoRanking(
  titulo: string,
  subtitulo: string,
  ranking: Array<{ nome: string; apelido?: string | null; totalGeral: number; totalServicos?: number; totalProdutos?: number; qtdServicos?: number; qtdProdutos?: number; pctMeta?: number | null }>,
  rodape?: string
): string {
  const medalhas = ["🥇", "🥈", "🥉"];
  const linhas: string[] = [
    `🏆 *${titulo}*`,
    `📅 ${subtitulo}`,
    "",
  ];
  ranking.forEach((p, i) => {
    const pos = medalhas[i] ?? `${i + 1}º`;
    const nome = p.apelido || p.nome.split(" ")[0];
    const valor = formatarMoeda(p.totalGeral);
    const svcs = (p.qtdServicos != null && p.qtdServicos > 0) ? `✂️ ${p.qtdServicos} serv` : "";
    const prds = (p.qtdProdutos != null && p.qtdProdutos > 0) ? `🛍️ ${p.qtdProdutos} prod` : "";
    const detalhe = [svcs, prds].filter(Boolean).join(" ");
    const sufixo = detalhe ? ` | ${detalhe}` : "";
    linhas.push(`${pos} *${nome}* — ${valor}${sufixo}`);
  });
  if (rodape) {
    linhas.push("");
    linhas.push(rodape);
  }
  return linhas.join("\n");
}

// ─── Tela de Login por PIN ────────────────────────────────────────────────────
function LoginPIN({ onLogin }: { onLogin: (nome: string, empresaSlug: string, fotoUrl: string | null, id: number, apelido: string | null, isGerencia?: boolean) => void }) {
  const [pin, setPin] = useState("");
  const [modoTexto, setModoTexto] = useState(false);
  const [loginOk, setLoginOk] = useState<{ nome: string; fotoUrl: string | null; apelido: string | null } | null>(null);
  const loginMut = trpc.loginProfissional.useMutation({
    onSuccess: (data) => {
      const nomeExibido = data.apelido || data.nome.split(" ")[0];
      setLoginOk({ nome: nomeExibido, fotoUrl: data.fotoUrl, apelido: data.apelido });
      // Pequeno delay para mostrar a tela de boas-vindas antes de navegar
      setTimeout(() => {
        onLogin(data.nome, data.empresaSlug, data.fotoUrl, data.id, data.apelido, (data as any).isGerencia === true);
      }, 1200);
    },
    onError: () => {
      toast.error("PIN inválido — Verifique o PIN e tente novamente.");
      setPin("");
    },
  });
  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const novo = pin + d;
    setPin(novo);
    if (novo.length === 4) {
      loginMut.mutate({ pin: novo });
    }
  };
  const handleDelete = () => setPin((p) => p.slice(0, -1));
  const handleTextoSubmit = () => {
    if (pin.trim().length > 0) loginMut.mutate({ pin: pin.trim() });
  };

  // Tela de boas-vindas após login bem-sucedido
  if (loginOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-6">
        <div
          className="flex flex-col items-center gap-4"
          style={{ animation: "rankingSlideIn 0.5s ease-out both" }}
        >
          {/* Foto de perfil grande */}
          {loginOk.fotoUrl ? (
            <img
              src={loginOk.fotoUrl}
              alt={loginOk.nome}
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-400 shadow-2xl shadow-blue-500/40"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-4 border-blue-400 shadow-2xl shadow-blue-500/40 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{(loginOk.nome || "?")[0].toUpperCase()}</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-white/60 text-sm">Bem-vindo,</p>
            <h2 className="text-white text-2xl font-bold mt-0.5">{loginOk.nome}!</h2>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando ranking...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-3">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Ranking</h1>
        <p className="text-white/50 text-sm mt-1">Acesso para profissionais</p>
      </div>
      {/* Indicador PIN ou campo de texto */}
      {modoTexto ? (
        <div className="w-full max-w-xs mb-6 space-y-3">
          <input
            type="text"
            autoFocus
            maxLength={20}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextoSubmit()}
            placeholder="Digite seu PIN"
            className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-white text-center text-xl tracking-widest placeholder:text-white/30 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleTextoSubmit}
            disabled={loginMut.isPending || pin.trim().length === 0}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loginMut.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Entrar'}
          </button>
          <button onClick={() => { setModoTexto(false); setPin(""); }} className="w-full text-white/30 text-sm text-center py-2">
            Usar teclado numérico
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? "bg-blue-400 border-blue-400"
                    : "bg-transparent border-white/30"
                }`}
              />
            ))}
          </div>
          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
              <button
                key={i}
                disabled={d === "" || loginMut.isPending}
                onClick={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(d) : undefined}
                className={`
                  h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95
                  ${d === "" ? "invisible" : ""}
                  ${d === "⌫"
                    ? "bg-white/10 text-white/60 hover:bg-white/20"
                    : "bg-white/10 text-white hover:bg-white/20 active:bg-blue-500/50"}
                  ${loginMut.isPending ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                {loginMut.isPending && d === pin[pin.length - 1] ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : d}
              </button>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-8 text-center">
            Digite seu PIN de 4 dígitos para acessar o ranking
          </p>
          <button onClick={() => { setModoTexto(true); setPin(""); }} className="text-white/20 text-xs mt-3 text-center hover:text-white/40 transition-colors">
            PIN com letras? Clique aqui
          </button>
        </>
      )}
    </div>
  );
}

// ─── Avatar do profissional ──────────────────────────────────────────────────
function Avatar({ nome, fotoUrl, isMe, size = 36 }: { nome: string; fotoUrl?: string | null; isMe: boolean; size?: number }) {
  const inicial = (nome || "?")[0].toUpperCase();
  const [imgError, setImgError] = useState(false);
  if (fotoUrl && !imgError) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover flex-shrink-0 border-2 ${
          isMe ? "border-blue-400" : "border-white/20"
        }`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`rounded-full flex items-center justify-center flex-shrink-0 font-bold border-2 ${
        isMe
          ? "bg-blue-500/30 border-blue-400 text-blue-300"
          : "bg-white/10 border-white/20 text-white/70"
      }`}
    >
      {inicial}
    </div>
  );
}

// ─── Card de posição no ranking ───────────────────────────────────────────────
function RankingCard({
  pos,
  nome,
  apelido,
  fotoUrl,
  totalGeral,
  totalMes,
  totalServicos,
  totalProdutos,
  qtdServicos = 0,
  qtdProdutos = 0,
  pctMeta,
  metaMensal,
  diasRestantes,
  posAnterior,
  isMe,
  empresaSlug,
  mostrarEmpresa = false,
  isUltimo = false,
  animIndex = 0,
}: {
  pos: number;
  nome: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  totalGeral: number;
  totalMes?: number | null;
  totalServicos: number;
  totalProdutos: number;
  qtdServicos?: number;
  qtdProdutos?: number;
  pctMeta?: number | null;
  metaMensal?: number | null;
  diasRestantes?: number | null;
  posAnterior?: number | null;
  isMe: boolean;
  empresaSlug?: string | null;
  mostrarEmpresa?: boolean;
  isUltimo?: boolean;
  animIndex?: number;
}) {
  const medalha = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
  const nomeExibido = apelido || nome.split(" ")[0];

  // Indicador de variação de posição
  const variacaoPosicao = posAnterior != null ? posAnterior - pos : null; // positivo = subiu
  const IndicadorPosicao = () => {
    if (variacaoPosicao == null) return null;
    if (variacaoPosicao > 0) return (
      <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs font-semibold">
        <TrendingUp className="w-3 h-3" />+{variacaoPosicao}
      </span>
    );
    if (variacaoPosicao < 0) return (
      <span className="inline-flex items-center gap-0.5 text-red-400 text-xs font-semibold">
        <TrendingDown className="w-3 h-3" />{variacaoPosicao}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-0.5 text-white/30 text-xs">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  // Cores da barra de meta
  const corMeta = pctMeta == null ? null
    : pctMeta >= 100 ? "bg-emerald-400"
    : pctMeta >= 75  ? "bg-blue-400"
    : pctMeta >= 50  ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-xl transition-all
        ${isMe
          ? "bg-blue-500/20 border border-blue-500/40 shadow-lg shadow-blue-500/10"
          : isUltimo
          ? "bg-red-500/10 border border-red-500/20"
          : "bg-white/5 border border-white/10"}
      `}
      style={{
        animation: `rankingSlideIn 0.35s ease-out both`,
        animationDelay: `${animIndex * 55}ms`,
      }}
    >
      {/* Posição + variação */}
      <div className="w-7 flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
        {medalha ? (
          <span className="text-lg leading-none">{medalha}</span>
        ) : isUltimo ? (
          <span className="text-red-400/70 text-xs font-bold">{pos}º</span>
        ) : (
          <span className="text-white/40 text-xs font-bold">{pos}º</span>
        )}
        <IndicadorPosicao />
      </div>
      {/* Avatar */}
      <Avatar nome={nome} fotoUrl={fotoUrl} isMe={isMe} size={36} />
      {/* Nome + detalhes + barra de meta */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${isMe ? "text-blue-300" : "text-white"}`}>
          {nomeExibido}
          {isMe && <span className="ml-2 text-xs text-blue-400/70">(você)</span>}
        </div>
        {/* Linha 1: contagem de atendimentos */}
        {(qtdServicos > 0 || qtdProdutos > 0) && (
          <div className="text-xs text-white/60 flex gap-1.5 flex-wrap">
            {qtdServicos > 0 && (
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md">{qtdServicos} serv</span>
            )}
            {qtdProdutos > 0 && (
              <span className="bg-white/10 px-1.5 py-0.5 rounded-md">{qtdProdutos} prod</span>
            )}
          </div>
        )}
        {/* Linha 2: valores monetários */}
        <div className="text-xs text-white/40 flex gap-2 flex-wrap">
          {totalServicos > 0 && <span>{formatarMoeda(totalServicos)}</span>}
          {totalProdutos > 0 && <span>· {formatarMoeda(totalProdutos)}</span>}
          {mostrarEmpresa && empresaSlug && (
            <span className="text-blue-300/50">· {empresaLabel(empresaSlug)}</span>
          )}
        </div>
        {/* Barra de progresso de meta mensal */}
        {pctMeta != null && metaMensal != null && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-white/40">Meta: {formatarMoeda(metaMensal)}</span>
              <span className={`text-xs font-bold ${
                pctMeta >= 100 ? "text-emerald-400" : pctMeta >= 75 ? "text-blue-400" : pctMeta >= 50 ? "text-amber-400" : "text-red-400"
              }`}>{pctMeta}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${corMeta}`}
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              />
            </div>
            {/* Informações de média diária, projeção e falta para meta */}
            {(() => {
              const totalAcumulado = totalMes ?? totalGeral;
              const falta = Math.max(0, metaMensal - totalAcumulado);
              const diasNoMes = 30; // Assumindo 30 dias no mês
              const diasPassados = diasNoMes - (diasRestantes ?? 0);
              const mediaDiaria = diasPassados > 0 ? totalAcumulado / diasPassados : 0;
              const projecao = mediaDiaria * diasNoMes;
              
              return (
                <div className="text-xs text-white/50 mt-1.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span>📊 Média/dia:</span>
                    <span className="text-white/70 font-semibold">{formatarMoeda(mediaDiaria)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📈 Projeção:</span>
                    <span className={`font-semibold ${
                      projecao >= metaMensal ? "text-emerald-400" : 
                      projecao >= metaMensal * 0.85 ? "text-yellow-400" : 
                      "text-red-400"
                    }`}>{formatarMoeda(projecao)}</span>
                  </div>
                  {pctMeta < 100 && (
                    <div className="flex justify-between">
                      <span>💰 Falta:</span>
                      <span className="text-amber-400 font-semibold">{formatarMoeda(falta)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Meta diária individual necessária */}
            {pctMeta < 100 && diasRestantes != null && diasRestantes > 0 && (() => {
              const totalAcumulado = totalMes ?? totalGeral;
              const falta = Math.max(0, metaMensal - totalAcumulado);
              const metaDiariaInd = falta / diasRestantes;
              return (
                <div className="text-xs text-blue-300/60 mt-1">
                  Precisa {formatarMoeda(metaDiariaInd)}/dia
                </div>
              );
            })()}
          </div>
        )}
      </div>
      {/* Total */}
      <div className={`text-right flex-shrink-0 font-bold text-sm ${isMe ? "text-blue-300" : "text-white"}`}>
        {formatarMoeda(totalGeral)}
      </div>
    </div>
  );
}

// ─── Hook de compartilhamento WhatsApp ───────────────────────────────────────
function useExportarImagem() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);

  /**
   * Monta o texto informativo do ranking e abre o WhatsApp.
   * Se grupoLink for fornecido, copia a mensagem e abre o grupo diretamente.
   */
  const exportar = useCallback(async (
    _nomeArquivo: string,
    mensagemTexto?: string,
    grupoLink?: string | null
  ) => {
    if (exportando) return;
    setExportando(true);
    try {
      // Usar apenas o texto informativo (sem imagem)
      const mensagemFinal = mensagemTexto ?? "🏆 Confira o ranking!";

      // Abrir WhatsApp com a mensagem
      const encodedText = encodeURIComponent(mensagemFinal);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      let url: string;
      if (grupoLink) {
        // Copia a mensagem para a área de transferência e abre o grupo
        try { await navigator.clipboard.writeText(mensagemFinal); } catch {}
        url = grupoLink;
        toast.success("📋 Mensagem copiada! Cole no grupo.", { duration: 6000 });
      } else {
        url = isMobile
          ? `whatsapp://send?text=${encodedText}`
          : `https://web.whatsapp.com/send?text=${encodedText}`;
        toast.success("Abrindo WhatsApp com o ranking!", { duration: 4000 });
      }
      setTimeout(() => window.open(url, "_blank"), 300);
    } catch (e) {
      console.error("Erro ao enviar para WhatsApp:", e);
      toast.error("Erro ao preparar mensagem.");
    } finally {
      setExportando(false);
    }
  }, [exportando]);
  return { exportRef, exportando, exportar };
}

// ─── Hook de cópia de mensagem ─────────────────────────────────────────────
function useCopiarMensagem() {
  const [copiado, setCopiado] = useState(false);
  const copiar = useCallback(async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      toast.success("Mensagem copiada!", { duration: 2000 });
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback para browsers sem suporte a clipboard API
      const el = document.createElement("textarea");
      el.value = texto;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiado(true);
      toast.success("Mensagem copiada!", { duration: 2000 });
      setTimeout(() => setCopiado(false), 2000);
    }
  }, []);
  return { copiado, copiar };
}

// ─── Elemento de exportação (oculto) ─────────────────────────────────────────
function ExportCard({
  exportRef,
  titulo,
  subtitulo,
  ranking,
  meuNome,
  unidade,
  fatMeta,
}: {
  exportRef: React.RefObject<HTMLDivElement | null>;
  titulo: string;
  subtitulo: string;
  ranking: Array<{ id: number; nome: string; apelido?: string | null; fotoUrl?: string | null; totalGeral: number; totalServicos: number; totalProdutos: number; empresaSlug?: string | null }>;
  meuNome: string;
  unidade?: string;
  fatMeta?: { total: number; metaMensal?: number | null; pctMeta?: number | null; projecaoFinalMes?: number | null; diasPassados?: number | null; diasUteisTotal?: number | null } | null;
}) {
  return (
    <div
      ref={exportRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: "400px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        padding: "28px 24px",
        borderRadius: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.5px" }}>{titulo}</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>{subtitulo}</div>
        </div>
        <div style={{ fontSize: "11px", color: "#475569", textAlign: "right" }}>
          <div style={{ fontWeight: "600", color: "#64748b" }}>{unidade ?? "Barbiero"}</div>
        </div>
      </div>
      {/* Lista */}
      {ranking.slice(0, 10).map((p, i) => {
        const isMe = p.nome === meuNome || p.apelido === meuNome;
        const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
        const nomeExibido = p.apelido || p.nome.split(" ")[0];
        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              marginBottom: "6px",
              background: isMe ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
              border: isMe ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ width: "28px", textAlign: "center", fontSize: "16px" }}>
              {medalha ?? <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{i + 1}º</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: isMe ? "#93c5fd" : "#f1f5f9" }}>
                {nomeExibido}{isMe ? " (você)" : ""}
              </div>
              <div style={{ fontSize: "10px", color: "#475569" }}>
                Serv: {formatarMoeda(p.totalServicos)}
                {p.totalProdutos > 0 ? ` · Prod: ${formatarMoeda(p.totalProdutos)}` : ""}
              </div>
            </div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: isMe ? "#93c5fd" : "#e2e8f0" }}>
              {formatarMoeda(p.totalGeral)}
            </div>
          </div>
        );
      })}
      {/* Bloco de Meta da Unidade */}
      {fatMeta && fatMeta.metaMensal && fatMeta.metaMensal > 0 && (
        <div style={{
          marginTop: "16px",
          padding: "12px 14px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: "700", letterSpacing: "0.05em", textTransform: "uppercase" }}>Meta da Unidade — Mês</span>
            <span style={{
              fontSize: "11px", fontWeight: "700",
              color: (fatMeta.pctMeta ?? 0) >= 100 ? "#10b981" : (fatMeta.pctMeta ?? 0) >= 80 ? "#f59e0b" : "#f87171",
              background: (fatMeta.pctMeta ?? 0) >= 100 ? "rgba(16,185,129,0.15)" : (fatMeta.pctMeta ?? 0) >= 80 ? "rgba(245,158,11,0.15)" : "rgba(248,113,113,0.15)",
              padding: "2px 7px", borderRadius: "6px",
            }}>{fatMeta.pctMeta ?? 0}%</span>
          </div>
          {/* Barra de progresso */}
          <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
            <div style={{
              height: "100%", borderRadius: "3px",
              width: `${Math.min(100, fatMeta.pctMeta ?? 0)}%`,
              background: (fatMeta.pctMeta ?? 0) >= 100 ? "#10b981" : (fatMeta.pctMeta ?? 0) >= 80 ? "#f59e0b" : "#3b82f6",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#e2e8f0" }}>{formatarMoeda(fatMeta.total)}</div>
              <div style={{ fontSize: "10px", color: "#475569", marginTop: "1px" }}>de {formatarMoeda(fatMeta.metaMensal)}</div>
            </div>
            {(fatMeta.pctMeta ?? 0) < 100 ? (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#fbbf24" }}>
                  Falta: {formatarMoeda(Math.max(0, fatMeta.metaMensal - fatMeta.total))}
                </div>
                {fatMeta.projecaoFinalMes && fatMeta.projecaoFinalMes > 0 && (
                  <div style={{ fontSize: "10px", color: (fatMeta.projecaoFinalMes >= fatMeta.metaMensal) ? "#10b981" : "#94a3b8", marginTop: "1px" }}>
                    Proj: {formatarMoeda(fatMeta.projecaoFinalMes)}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#10b981" }}>✓ Meta atingida!</div>
            )}
          </div>
        </div>
      )}
      {/* Rodapé */}
      <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "5px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", fontWeight: "800", color: "#fff",
            }}>B</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8" }}>
                {unidade ?? "Barbiero"}
              </div>
              <div style={{ fontSize: "9px", color: "#475569", marginTop: "1px" }}>
                {subtitulo}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "9px", color: "#475569" }}>
              {new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>performancemeta.sbs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: data anterior ────────────────────────────────────────────────────────────────────────────────
function subtrairDia(iso: string, n = 1): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mapa de posições: id -> posição (1-based)
function buildPosMap(lista: Array<{ id: number }>): Map<number, number> {
  const m = new Map<number, number>();
  lista.forEach((p, i) => m.set(p.id, i + 1));
  return m;
}

type GerenciaItem = { id: number; nome: string; apelido?: string | null; fotoUrl?: string | null; empresaSlug: string; totalServicos: number; totalProdutos: number; totalGeral: number; qtdServicos: number; qtdProdutos: number };

function SecaoGerencia({
  gerentes,
  meuNome,
  isGerencia,
  grupoWhatsApp,
  tituloCompartilhamento,
  subtituloCompartilhamento,
  isLoading,
}: {
  gerentes: GerenciaItem[];
  meuNome: string;
  isGerencia?: boolean;
  grupoWhatsApp?: string | null;
  tituloCompartilhamento: string;
  subtituloCompartilhamento: string;
  isLoading?: boolean;
}) {
  const [copiado, setCopiadoGer] = useState(false);

  const copiarMensagem = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoGer(true);
      setTimeout(() => setCopiadoGer(false), 2000);
    });
  };

  const compartilharWhatsApp = (texto: string) => {
    const url = grupoWhatsApp
      ? `https://api.whatsapp.com/send?phone=&text=${encodeURIComponent(texto)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const gerarTexto = () => {
    const linhas: string[] = [
      `👔 *${tituloCompartilhamento}*`,
      `📅 ${subtituloCompartilhamento}`,
      '',
    ];
    gerentes.forEach((g) => {
      const nome = g.apelido || g.nome.split(' ')[0];
      const valor = formatarMoeda(g.totalGeral);
      const svcs = g.qtdServicos > 0 ? `✂️ ${g.qtdServicos} serv` : '';
      const prds = g.qtdProdutos > 0 ? `🛍️ ${g.qtdProdutos} prod` : '';
      const detalhe = [svcs, prds].filter(Boolean).join(' ');
      linhas.push(`👔 *${nome}* — ${valor}${detalhe ? ` | ${detalhe}` : ''}`);
    });
    linhas.push('');
    linhas.push('performancemeta.sbs');
    return linhas.join('\n');
  };

  // Não exibir se não há gerentes e não é gerente
  if (!isGerencia && (!gerentes || gerentes.length === 0)) return null;
  if (!isGerencia) return null; // Só gerentes vêem esta seção

  return (
    <div className="mt-6">
      {/* Divisor */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        <span className="text-purple-400/70 text-xs font-semibold tracking-widest uppercase flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          Gerência
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        </div>
      ) : gerentes.length === 0 ? (
        <div className="text-center py-4 text-white/30 text-sm">Sem dados de gerência para este período</div>
      ) : (
        <>
          <div className="space-y-2">
            {gerentes.map((g) => {
              const isMe = g.nome === meuNome || g.apelido === meuNome;
              const nomeExibido = g.apelido || g.nome.split(' ')[0];
              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-purple-500/15 border-purple-500/30'
                      : 'bg-white/5 border-white/8'
                  }`}
                >
                  {/* Avatar */}
                  <Avatar nome={g.nome} fotoUrl={g.fotoUrl} isMe={isMe} size={36} />
                  {/* Nome e detalhe */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate ${isMe ? 'text-purple-300' : 'text-white/90'}`}>
                      {nomeExibido}{isMe ? ' (você)' : ''}
                    </div>
                    <div className="text-xs text-white/30">
                      {g.qtdServicos > 0 ? `✂️ ${g.qtdServicos} serv` : ''}
                      {g.qtdServicos > 0 && g.qtdProdutos > 0 ? ' · ' : ''}
                      {g.qtdProdutos > 0 ? `🛍️ ${g.qtdProdutos} prod` : ''}
                      {g.qtdServicos === 0 && g.qtdProdutos === 0 ? 'Sem atendimentos' : ''}
                    </div>
                  </div>
                  {/* Valor */}
                  <div className={`text-sm font-bold ${isMe ? 'text-purple-300' : 'text-white/80'}`}>
                    {formatarMoeda(g.totalGeral)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões compartilhar */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => compartilharWhatsApp(gerarTexto())}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 text-sm font-semibold transition-all active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => copiarMensagem(gerarTexto())}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 text-sm font-medium transition-all active:scale-95"
              title="Copiar mensagem"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Aba Diário ────────────────────────────────────────────────────────────────────────────────────────────────
function AbaDiario({ meuNome, minhaEmpresa, isGerencia }: { meuNome: string; minhaEmpresa: string; isGerencia?: boolean }) {
  const isGrupo = minhaEmpresa === 'barbiero-grupo';
  // unidadeSelecionada: null = Geral, 'barbiero-mascote' ou 'barbiero-morumbi' = unidade específica
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(
    isGrupo ? 'barbiero-mascote' : minhaEmpresa
  );
  const verGeral = unidadeSelecionada === null;
  const empresaSlugFiltro = verGeral ? minhaEmpresa : unidadeSelecionada;

  // Opções de unidade para o toggle
  const opcoesUnidade = useMemo(() => {
    if (isGrupo) return [
      { slug: 'barbiero-mascote', label: 'Mascote' },
      { slug: 'barbiero-morumbi', label: 'Morumbi' },
      { slug: null, label: 'Geral' },
    ];
    return [
      { slug: minhaEmpresa, label: empresaLabel(minhaEmpresa) },
      { slug: null, label: 'Geral' },
    ];
  }, [isGrupo, minhaEmpresa]);

  const [data, setData] = useState(hoje());
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
  const utils = trpc.useUtils();
  const syncRapidoMutation = trpc.cashbarber.syncRapidoFaturamento.useMutation({
    onSuccess: () => {
      utils.faturamentoUnidade.invalidate();
      utils.rankingDiario.invalidate();
      toast.success('Faturamento atualizado!');
    },
    onError: (e) => toast.error('Erro ao sincronizar: ' + e.message),
  });
  const { data: ranking, isLoading } = trpc.rankingDiario.useQuery({ data }, { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 });
  // Link do grupo WhatsApp da unidade
  const { data: empresas } = trpc.empresa.listar.useQuery(undefined, { staleTime: 10 * 60_000 });
  const grupoWhatsApp = useMemo(() => {
    if (!empresas || verGeral) return null;
    return empresas.find((e) => e.slug === unidadeSelecionada)?.whatsappGrupoLink ?? null;
  }, [empresas, unidadeSelecionada, verGeral]);
  // Ranking do dia anterior para calcular variação de posição
  const dataAnterior = useMemo(() => subtrairDia(data, 1), [data]);
  const { data: rankingAnterior } = trpc.rankingDiario.useQuery(
    { data: dataAnterior },
    { staleTime: 5 * 60_000, enabled: true }
  );
  const posMapAnterior = useMemo(() => buildPosMap(rankingAnterior ?? []), [rankingAnterior]);
  const { exportRef, exportando, exportar } = useExportarImagem();
  const { copiado: copiadoDiario, copiar: copiarDiario } = useCopiarMensagem();
  // Ranking de gerência do dia (só buscado se for gerente)
  const { data: rankingGerencia, isLoading: isLoadingGerencia } = trpc.rankingDiarioGerencia.useQuery(
    { data },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: isGerencia === true }
  );
  // Faturamento da unidade do dia
  const { data: fatUnidade } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugFiltro, tipo: 'diario', data },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
  );
  // Faturamento mensal acumulado (para mostrar meta e valor que falta)
  const mesNum = useMemo(() => parseInt(formatarData(data).split('/')[1], 10), [data]);
  const anoNum = useMemo(() => parseInt(formatarData(data).split('/')[2], 10), [data]);
  const { data: fatMensal } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugFiltro, tipo: 'mensal', mes: mesNum, ano: anoNum },
    { staleTime: 60_000, enabled: !verGeral }
  );

  const anterior = () => {
    const d = new Date(data + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };
  const proximo = () => {
    const d = new Date(data + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const h = hoje();
    if (`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` > h) return;
    setData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };
  const ehHoje = data === hoje();
  const [dia, mes, ano] = formatarData(data).split("/");
  const subtitulo = ehHoje ? "Hoje" : `${dia}/${mes}/${ano}`;

  // Filtrar por unidade ou mostrar geral, depois por categoria
  const rankingFiltrado = useMemo(() => {
    if (!ranking) return [];
    let lista = verGeral ? ranking : ranking.filter((p) => p.empresaSlug === unidadeSelecionada);
    if (filtroCategoria !== 'todos') {
      lista = lista.filter((p) => (p as any).categoriaRanking === filtroCategoria);
    }
    return lista;
  }, [ranking, unidadeSelecionada, verGeral, filtroCategoria]);

  // Posição do profissional no geral
  const minhaPosicaoGeral = useMemo(() => {
    if (!ranking) return null;
    const idx = ranking.findIndex((p) => p.nome === meuNome || p.apelido === meuNome);
    return idx >= 0 ? idx + 1 : null;
  }, [ranking, meuNome]);

  return (
    <div>
      {/* Seletor de data */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={anterior} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-white font-semibold">{ehHoje ? "Hoje" : formatarData(data)}</div>
          <div className="text-white/40 text-xs">{formatarData(data)}</div>
        </div>
        <button onClick={proximo} disabled={ehHoje} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle Unidade / Geral */}
      <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
        {opcoesUnidade.map((op) => (
          <button
            key={op.slug ?? 'geral'}
            onClick={() => setUnidadeSelecionada(op.slug)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              unidadeSelecionada === op.slug ? 'bg-blue-500 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {op.slug === null && <Globe className="w-3 h-3" />}
            {op.label}
            {op.slug === null && minhaPosicaoGeral && unidadeSelecionada !== null && (
              <span className="ml-1 bg-blue-400/20 text-blue-300 text-xs px-1.5 rounded-full">{minhaPosicaoGeral}º</span>
            )}
          </button>
        ))}
      </div>

      {/* Filtro de Categoria */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        {(['todos', 'barbeiro', 'auxiliar', 'recepcao'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroCategoria === cat ? 'bg-white/15 text-white shadow' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {cat === 'todos' ? 'Todos' : cat === 'barbeiro' ? '✂️ Barb.' : cat === 'auxiliar' ? '💇 Aux.' : '💼 Recep.'}
          </button>
        ))}
      </div>

      {/* Posição no geral (quando na aba da unidade) */}
      {!verGeral && minhaPosicaoGeral && (
        <div className="mb-3 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-blue-300">
            Você está em <strong>{minhaPosicaoGeral}º lugar</strong> no ranking geral de todas as unidades
          </span>
        </div>
      )}

      {/* Card de faturamento da unidade — usa total MENSAL acumulado */}
      {!verGeral && fatMensal && fatMensal.total > 0 && (() => {
        // Semáforo de ritmo: compara média diária atual vs meta diária necessária
        const _diasPassados = (fatMensal as any).diasPassados as number | null;
        const _diasNoMes = (fatMensal as any).diasNoMes as number | null;
        const _metaMensal = (fatMensal as any).metaMensal as number | null;
        const mediaDiariaAtual = (_diasPassados != null && _diasPassados > 0) ? fatMensal.total / _diasPassados : null;
        const diasRestantesHoje = (_diasNoMes != null && _diasPassados != null) ? _diasNoMes - _diasPassados : null;
        const faltaHoje = _metaMensal != null ? Math.max(0, _metaMensal - fatMensal.total) : null;
        const metaDiariaNec = (diasRestantesHoje != null && diasRestantesHoje > 0 && faltaHoje != null) ? faltaHoje / diasRestantesHoje : null;
        const ratioRitmo = (mediaDiariaAtual != null && metaDiariaNec != null && metaDiariaNec > 0) ? mediaDiariaAtual / metaDiariaNec : null;
        const semaforo = (fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta >= 100
          ? { emoji: '🟢', label: 'Meta atingida!', cor: 'text-emerald-400' }
          : ratioRitmo == null ? null
          : ratioRitmo >= 1.0 ? { emoji: '🟢', label: 'No ritmo', cor: 'text-emerald-400' }
          : ratioRitmo >= 0.8 ? { emoji: '🟡', label: 'Quase no ritmo', cor: 'text-yellow-400' }
          : { emoji: '🔴', label: 'Precisa acelerar', cor: 'text-red-400' };
        return (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Faturamento da Unidade</div>
              {semaforo && (
                <span className={`text-xs font-semibold ${semaforo.cor}`}>{semaforo.emoji} {semaforo.label}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(fatMensal as any).pctMeta != null && (
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (fatMensal as any).pctMeta >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                  (fatMensal as any).pctMeta >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>{(fatMensal as any).pctMeta}%</div>
              )}
              <button
                onClick={() => {
                  if (!unidadeSelecionada) return;
                  const [_dia, _mes, _ano] = formatarData(data).split('/');
                  syncRapidoMutation.mutate({ empresaSlug: unidadeSelecionada, mes: parseInt(_mes, 10), ano: parseInt(_ano, 10) });
                }}
                disabled={syncRapidoMutation.isPending || !unidadeSelecionada}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
                title="Atualizar faturamento agora"
              >
                {syncRapidoMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                }
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl font-bold text-emerald-400">{formatarMoeda(fatMensal.total)}</div>
              {fatUnidade && fatUnidade.total > 0 && (
                <div className="text-xs text-white/40 mt-0.5">Hoje: {formatarMoeda(fatUnidade.total)}</div>
              )}
              {(fatMensal as any).metaMensal && (
                <div className="text-xs text-white/30 mt-0.5">Meta: {formatarMoeda((fatMensal as any).metaMensal)}</div>
              )}
            </div>
            <div className="text-right">
              {(fatMensal as any).metaMensal && (fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta < 100 && (
                <div className="text-xs font-semibold text-amber-400">
                  Falta: {formatarMoeda(Math.max(0, (fatMensal as any).metaMensal - fatMensal.total))}
                </div>
              )}
              {(fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta >= 100 && (
                <div className="text-xs font-semibold text-emerald-400">✓ Meta atingida!</div>
              )}
              {(fatMensal as any).metaMensal && (fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta < 100 && (fatMensal as any).diasNoMes != null && (fatMensal as any).diasPassados != null && (() => {
                const diasRestantes = (fatMensal as any).diasNoMes - (fatMensal as any).diasPassados;
                const falta = Math.max(0, (fatMensal as any).metaMensal - fatMensal.total);
                const metaDiaria = diasRestantes > 0 ? falta / diasRestantes : falta;
                return diasRestantes > 0 ? (
                  <div className="text-xs text-blue-300/70 mt-0.5">
                    Precisa {formatarMoeda(metaDiaria)}/dia ({diasRestantes}d)
                  </div>
                ) : null;
              })()}
              {fatMensal.recorrencia > 0 && (
                <div className="text-xs text-white/30 mt-0.5">incl. {formatarMoeda(fatMensal.recorrencia)} recorr.</div>
              )}
            </div>
          </div>
          {(fatMensal as any).metaMensal && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (fatMensal as any).pctMeta >= 100 ? 'bg-emerald-400' :
                    (fatMensal as any).pctMeta >= 80 ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, (fatMensal as any).pctMeta ?? 0)}%` }}
                />
              </div>
              {(fatMensal as any).superMeta && (fatMensal as any).superMeta > 0 && (
                <div className="text-xs text-white/30 mt-0.5 text-right">Super: {formatarMoeda((fatMensal as any).superMeta)}</div>
              )}
            </div>
          )}
          {/* Meta Quinzenal */}
          {(fatMensal as any).metaQuinzenal != null && (fatMensal as any).metaQuinzenal > 0 && (() => {
            const mq = (fatMensal as any).metaQuinzenal as number;
            const pctQ = (fatMensal as any).pctMetaQuinzenal as number | null;
            const hoje = new Date();
            const diaAtual = hoje.getDate();
            const naSegundaQ = diaAtual > 15;
            const faltaQ = pctQ != null && pctQ < 100 ? Math.max(0, mq - (fatMensal.total * (pctQ / 100) / 1) * 1) : 0;
            // Calcular falta real: mq - faturamento quinzenal
            // pctQ = (fatQ / mq) * 100  =>  fatQ = (pctQ * mq) / 100
            const fatQ = pctQ != null ? (pctQ * mq) / 100 : 0;
            const faltaQReal = Math.max(0, mq - fatQ);
            return (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-purple-300/70 font-semibold uppercase tracking-wider">Quinzenal</span>
                    {naSegundaQ && <span className="text-xs text-white/30">(1ª quinzena encerrada)</span>}
                  </div>
                  {pctQ != null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      pctQ >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                      pctQ >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>{pctQ}%</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-purple-300">{formatarMoeda(fatQ)}</div>
                  <div className="text-xs text-white/40">Meta: {formatarMoeda(mq)}</div>
                </div>
                {pctQ != null && pctQ < 100 && (
                  <div className="text-xs text-amber-400/80 mt-0.5 text-right">
                    Falta: {formatarMoeda(faltaQReal)}
                  </div>
                )}
                {pctQ != null && pctQ >= 100 && (
                  <div className="text-xs text-emerald-400 mt-0.5 text-right">✓ Quinzenal atingida!</div>
                )}
                <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (pctQ ?? 0) >= 100 ? 'bg-emerald-400' :
                      (pctQ ?? 0) >= 80 ? 'bg-yellow-400' : 'bg-purple-400'
                    }`}
                    style={{ width: `${Math.min(100, pctQ ?? 0)}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
        );
      })()}
      {/* Card de progresso mensal da unidade */}
      {!verGeral && fatMensal && (fatMensal as any).metaMensal && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Meta do Mês — Unidade</div>
            {(fatMensal as any).pctMeta != null && (
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (fatMensal as any).pctMeta >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                (fatMensal as any).pctMeta >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>{(fatMensal as any).pctMeta}%</div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-indigo-300">{formatarMoeda(fatMensal.total)}</div>
              <div className="text-xs text-white/40 mt-0.5">Meta: {formatarMoeda((fatMensal as any).metaMensal)}</div>
            </div>
            <div className="text-right">
              {(fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta < 100 ? (
                <div className="text-sm font-bold text-amber-400">
                  Falta: {formatarMoeda(Math.max(0, (fatMensal as any).metaMensal - fatMensal.total))}
                </div>
              ) : (
                <div className="text-sm font-bold text-emerald-400">✓ Meta atingida!</div>
              )}
              {(fatMensal as any).superMeta && (fatMensal as any).superMeta > 0 && (
                <div className="text-xs text-white/30 mt-0.5">Super: {formatarMoeda((fatMensal as any).superMeta)}</div>
              )}
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (fatMensal as any).pctMeta >= 100 ? 'bg-emerald-400' :
                  (fatMensal as any).pctMeta >= 80 ? 'bg-yellow-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min(100, (fatMensal as any).pctMeta ?? 0)}%` }}
              />
            </div>
          </div>
          {/* Projeção ao final do mês */}
          {(fatMensal as any).projecaoFinalMes != null && (fatMensal as any).diasPassados != null && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">Projeção final do mês</span>
                  <span className="text-xs text-white/25">({(fatMensal as any).diasPassados}/{(fatMensal as any).diasNoMes} dias úteis)</span>
                </div>
                <div className={`text-sm font-bold ${
                  (fatMensal as any).metaMensal && (fatMensal as any).projecaoFinalMes >= (fatMensal as any).metaMensal
                    ? 'text-emerald-400'
                    : (fatMensal as any).metaMensal && (fatMensal as any).projecaoFinalMes >= (fatMensal as any).metaMensal * 0.85
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {formatarMoeda((fatMensal as any).projecaoFinalMes)}
                </div>
              </div>
              {(fatMensal as any).mediaDiaria != null && (
                <div className="text-xs text-white/25 mt-0.5 text-right">
                  Média: {formatarMoeda((fatMensal as any).mediaDiaria)}/dia
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para este dia</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => {
              const total = rankingFiltrado.length;
              const isPodio3 = i === 2 && total > 3; // Após o 3º: divisor pódio
              const isAnteUltimo = total > 3 && i === total - 4 && total - 3 > 3; // Antes da zona lanterna
              return (
                <React.Fragment key={p.id}>
                  <RankingCard
                    pos={i + 1}
                    nome={p.nome}
                    apelido={p.apelido}
                    fotoUrl={p.fotoUrl}
                     totalGeral={p.totalGeral}
                     totalMes={(p as any).totalMes ?? null}
                     totalServicos={p.totalServicos}
                     totalProdutos={p.totalProdutos}
                      qtdServicos={(p as any).qtdServicos ?? 0}
                      qtdProdutos={(p as any).qtdProdutos ?? 0}
                      pctMeta={(p as any).pctMeta ?? null}
                      metaMensal={(p as any).metaMensal ?? null}
                      diasRestantes={(!verGeral && (fatMensal as any)?.diasNoMes != null && (fatMensal as any)?.diasPassados != null) ? (fatMensal as any).diasNoMes - (fatMensal as any).diasPassados : null}
                     posAnterior={posMapAnterior.get(p.id) ?? null}
                     isMe={p.nome === meuNome || p.apelido === meuNome}
                     empresaSlug={p.empresaSlug}
                     mostrarEmpresa={verGeral}
                     isUltimo={total > 3 && i >= total - 3}
                     animIndex={i}
                   />
                  {isPodio3 && (
                    <div key={`sep-podio-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                      <span className="text-yellow-500/50 text-xs font-semibold tracking-widest uppercase">Pódio</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                    </div>
                  )}
                  {isAnteUltimo && (
                    <div key={`sep-lanterna-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                      <span className="text-red-400/50 text-xs font-semibold tracking-widest uppercase">Lanterna</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Botões exportar + copiar */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                const nomeEmp = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalDia = (!verGeral && fatMensal?.total != null)
                  ? `\n\n📊 Total ${nomeEmp} no mês: ${formatarMoeda(fatMensal.total)}${fatUnidade?.total ? ` (hoje: ${formatarMoeda(fatUnidade.total)})` : ""}`
                  : "";
                const pctMensalStr = (!verGeral && fatMensal?.pctMeta != null)
                  ? ` | ${fatMensal.pctMeta}% da meta mensal`
                  : "";
                const metaDiariaStr = (() => {
                  if (verGeral || !fatMensal) return "";
                  const diasRestantes = (fatMensal as any).diasNoMes != null && (fatMensal as any).diasPassados != null
                    ? (fatMensal as any).diasNoMes - (fatMensal as any).diasPassados
                    : null;
                  const falta = (fatMensal as any).metaMensal != null && (fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta < 100
                    ? Math.max(0, (fatMensal as any).metaMensal - fatMensal.total)
                    : null;
                  if ((fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta >= 100)
                    return `\n🟢 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatMensal as any).diasPassados > 0 ? fatMensal.total / (fatMensal as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '🎯' : ratio >= 1.0 ? '🟢' : ratio >= 0.8 ? '🟡' : '🔴';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                // Linha de meta quinzenal com semáforo de ritmo
                const quinzenalStr = (() => {
                  if (verGeral || !fatMensal) return "";
                  const mq = (fatMensal as any).metaQuinzenal as number | null;
                  const pctQ = (fatMensal as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatMensal as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  // Calcular média diária atual da unidade (faturamento / dias passados)
                  const diasPassados = diaAtual;
                  const mediaDiariaAtual = diasPassados > 0 ? fatQVal / diasPassados : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string;
                  let labelRitmo: string;
                  if (ratio == null) {
                    emojiRitmo = '\ud83c\udfaf'; labelRitmo = '';
                  } else if (ratio >= 1.0) {
                    emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!';
                  } else if (ratio >= 0.8) {
                    emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo';
                  } else {
                    emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!';
                  }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0
                    ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)`
                    : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodape = `${totalDia}${pctMensalStr}${quinzenalStr}${metaDiariaStr}\n\nperformancemeta.sbs`.trim();
                exportar(
                  `ranking-diario-${data}`,
                  gerarTextoRanking(
                    `Ranking Diário — ${nomeEmp}`,
                    formatarData(data),
                    rankingFiltrado,
                    rodape
                  ),
                  grupoWhatsApp
                );
              }}
              disabled={exportando}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              {exportando ? "Gerando..." : "WhatsApp"}
            </button>
            <button
              onClick={() => {
                const nomeEmpC = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalDiaC = (!verGeral && fatMensal?.total != null)
                  ? `\n\n\ud83d\udcca Total ${nomeEmpC} no mês: ${formatarMoeda(fatMensal.total)}${fatUnidade?.total ? ` (hoje: ${formatarMoeda(fatUnidade.total)})` : ""}`
                  : "";
                const pctMensalStrC = (!verGeral && fatMensal?.pctMeta != null)
                  ? ` | ${fatMensal.pctMeta}% da meta mensal`
                  : "";
                const metaDiariaStrC = (() => {
                  if (verGeral || !fatMensal) return "";
                  const diasRestantes = (fatMensal as any).diasNoMes != null && (fatMensal as any).diasPassados != null
                    ? (fatMensal as any).diasNoMes - (fatMensal as any).diasPassados : null;
                  const falta = (fatMensal as any).metaMensal != null && (fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta < 100
                    ? Math.max(0, (fatMensal as any).metaMensal - fatMensal.total) : null;
                  if ((fatMensal as any).pctMeta != null && (fatMensal as any).pctMeta >= 100) return `\n\ud83d\udfe2 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatMensal as any).diasPassados > 0 ? fatMensal.total / (fatMensal as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '\ud83c\udfaf' : ratio >= 1.0 ? '\ud83d\udfe2' : ratio >= 0.8 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                const quinzenalStrC = (() => {
                  if (verGeral || !fatMensal) return "";
                  const mq = (fatMensal as any).metaQuinzenal as number | null;
                  const pctQ = (fatMensal as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatMensal as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  const mediaDiariaAtual = diaAtual > 0 ? fatQVal / diaAtual : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string; let labelRitmo: string;
                  if (ratio == null) { emojiRitmo = '\ud83c\udfaf'; labelRitmo = ''; }
                  else if (ratio >= 1.0) { emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!'; }
                  else if (ratio >= 0.8) { emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo'; }
                  else { emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!'; }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0 ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)` : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodapeC = `${totalDiaC}${pctMensalStrC}${quinzenalStrC}${metaDiariaStrC}\n\nperformancemeta.sbs`.trim();
                copiarDiario(gerarTextoRanking(`Ranking Diário — ${nomeEmpC}`, formatarData(data), rankingFiltrado, rodapeC));
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 text-sm font-medium transition-all active:scale-95"
              title="Copiar mensagem"
            >
              {copiadoDiario ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}

      {/* Seção Gerência */}
      <SecaoGerencia
        gerentes={rankingGerencia ?? []}
        meuNome={meuNome}
        isGerencia={isGerencia}
        grupoWhatsApp={grupoWhatsApp}
        tituloCompartilhamento={`Gerência — ${verGeral ? 'Todas as unidades' : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}`}
        subtituloCompartilhamento={formatarData(data)}
        isLoading={isLoadingGerencia}
      />

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking — ${subtitulo}`}
          subtitulo={`Faturamento de ${formatarData(data)}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}
          fatMeta={!verGeral && fatMensal ? { total: fatMensal.total, metaMensal: (fatMensal as any).metaMensal, pctMeta: (fatMensal as any).pctMeta, projecaoFinalMes: (fatMensal as any).projecaoFinalMes } : null}
        />
      )}
    </div>
  );
}

// ─── Aba Semanal ────────────────────────────────────────────────────────────────────────────────────────────────
function AbaSemanal({ meuNome, minhaEmpresa, isGerencia }: { meuNome: string; minhaEmpresa: string; isGerencia?: boolean }) {
  const isGrupo = minhaEmpresa === 'barbiero-grupo';
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(
    isGrupo ? 'barbiero-mascote' : minhaEmpresa
  );
  const verGeral = unidadeSelecionada === null;
  const empresaSlugFiltro = verGeral ? minhaEmpresa : unidadeSelecionada;
  const opcoesUnidade = useMemo(() => {
    if (isGrupo) return [
      { slug: 'barbiero-mascote', label: 'Mascote' },
      { slug: 'barbiero-morumbi', label: 'Morumbi' },
      { slug: null, label: 'Geral' },
    ];
    return [
      { slug: minhaEmpresa, label: empresaLabel(minhaEmpresa) },
      { slug: null, label: 'Geral' },
    ];
  }, [isGrupo, minhaEmpresa]);

  const [semanaOffset, setSemanaOffset] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
  const { exportRef, exportando, exportar } = useExportarImagem();
  const { copiado: copiadoSemanal, copiar: copiarSemanal } = useCopiarMensagem();
  const utilsSem = trpc.useUtils();
  const syncRapidoSemMutation = trpc.cashbarber.syncRapidoFaturamento.useMutation({
    onSuccess: () => {
      utilsSem.faturamentoUnidade.invalidate();
      utilsSem.rankingSemanal.invalidate();
      toast.success('Faturamento atualizado!');
    },
    onError: (e) => toast.error('Erro ao sincronizar: ' + e.message),
  });
  // Link do grupo WhatsApp da unidade
  const { data: empresasSem } = trpc.empresa.listar.useQuery(undefined, { staleTime: 10 * 60_000 });
  const grupoWhatsAppSem = useMemo(() => {
    if (!empresasSem || verGeral) return null;
    return empresasSem.find((e) => e.slug === unidadeSelecionada)?.whatsappGrupoLink ?? null;
  }, [empresasSem, unidadeSelecionada, verGeral]);
  const { dataInicio, dataFim } = useMemo(() => {
    const d = new Date();
    const dia = d.getDay();
    const diffInicio = dia === 0 ? -6 : 1 - dia;
    const inicio = new Date(d);
    inicio.setDate(d.getDate() + diffInicio + semanaOffset * 7);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
  }, [semanaOffset]);

  // Semana anterior para calcular variação de posição
  const { dataInicio: dataInicioAnt, dataFim: dataFimAnt } = useMemo(() => {
    const d = new Date();
    const dia = d.getDay();
    const diffInicio = dia === 0 ? -6 : 1 - dia;
    const inicio = new Date(d);
    inicio.setDate(d.getDate() + diffInicio + (semanaOffset - 1) * 7);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
  }, [semanaOffset]);

  const { data: ranking, isLoading } = trpc.rankingSemanal.useQuery(
    { dataInicio, dataFim },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 }
  );
  const { data: rankingAnteriorSem } = trpc.rankingSemanal.useQuery(
    { dataInicio: dataInicioAnt, dataFim: dataFimAnt },
    { staleTime: 5 * 60_000 }
  );
  const posMapAnteriorSem = useMemo(() => buildPosMap(rankingAnteriorSem ?? []), [rankingAnteriorSem]);
  const ehSemanaAtual = semanaOffset === 0;
  const labelSemana = `${formatarData(dataInicio)} – ${formatarData(dataFim)}`;
  // Ranking de gerência semanal (só buscado se for gerente)
  const { data: rankingGerenciaSem, isLoading: isLoadingGerenciaSem } = trpc.rankingSemanalGerencia.useQuery(
    { dataInicio, dataFim },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: isGerencia === true }
  );
  // Faturamento da unidade da semana
  const { data: fatUnidadeSem } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugFiltro, tipo: 'semanal', dataInicio, dataFim },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
  );
  // Faturamento mensal acumulado (para mostrar meta e valor que falta)
  const mesSemNum = useMemo(() => parseInt(dataInicio.split('-')[1], 10), [dataInicio]);
  const anoSemNum = useMemo(() => parseInt(dataInicio.split('-')[0], 10), [dataInicio]);
  const { data: fatMensalSem } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugFiltro, tipo: 'mensal', mes: mesSemNum, ano: anoSemNum },
    { staleTime: 60_000, enabled: !verGeral }
  );

  const rankingFiltrado = useMemo(() => {
    if (!ranking) return [];
    if (verGeral) return ranking;
    return ranking.filter((p) => p.empresaSlug === unidadeSelecionada);
  }, [ranking, unidadeSelecionada, verGeral]);

  const minhaPosicaoGeral = useMemo(() => {
    if (!ranking) return null;
    const idx = ranking.findIndex((p) => p.nome === meuNome || p.apelido === meuNome);
    return idx >= 0 ? idx + 1 : null;
  }, [ranking, meuNome]);

  return (
    <div>
      {/* Seletor de semana */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setSemanaOffset((o) => o - 1)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-white font-semibold">{ehSemanaAtual ? "Esta semana" : `Semana ${semanaOffset < 0 ? Math.abs(semanaOffset) + " atrás" : ""}`}</div>
          <div className="text-white/40 text-xs">{formatarData(dataInicio)} – {formatarData(dataFim)}</div>
        </div>
        <button onClick={() => setSemanaOffset((o) => Math.min(0, o + 1))} disabled={ehSemanaAtual} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle Unidade / Geral */}
      <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
        {opcoesUnidade.map((op) => (
          <button
            key={op.slug ?? 'geral'}
            onClick={() => setUnidadeSelecionada(op.slug)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              unidadeSelecionada === op.slug ? 'bg-blue-500 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {op.slug === null && <Globe className="w-3 h-3" />}
            {op.label}
          </button>
        ))}
      </div>

      {/* Filtro de Categoria */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        {(['todos', 'barbeiro', 'auxiliar', 'recepcao'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroCategoria === cat ? 'bg-white/15 text-white shadow' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {cat === 'todos' ? 'Todos' : cat === 'barbeiro' ? '✂️ Barb.' : cat === 'auxiliar' ? '💇 Aux.' : '💼 Recep.'}
          </button>
        ))}
      </div>

      {/* Posição no geral */}
      {!verGeral && minhaPosicaoGeral && (
        <div className="mb-3 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-blue-300">
            Você está em <strong>{minhaPosicaoGeral}º lugar</strong> no ranking geral desta semana
          </span>
        </div>
      )}

      {/* Card de faturamento da unidade */}
      {!verGeral && fatUnidadeSem && fatUnidadeSem.total > 0 && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Faturamento da Unidade</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/30">Esta semana</div>
              <button
                onClick={() => {
                  if (!unidadeSelecionada) return;
                  syncRapidoSemMutation.mutate({ empresaSlug: unidadeSelecionada, mes: mesSemNum, ano: anoSemNum });
                }}
                disabled={syncRapidoSemMutation.isPending || !unidadeSelecionada}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
                title="Atualizar faturamento agora"
              >
                {syncRapidoSemMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                }
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl font-bold text-emerald-400">{formatarMoeda(fatUnidadeSem.total)}</div>
              {fatUnidadeSem.totalOperacional > 0 && (
                <div className="text-xs text-white/40 mt-0.5">Serv/Prod: {formatarMoeda(fatUnidadeSem.totalOperacional)}</div>
              )}
            </div>
            {fatUnidadeSem.recorrencia > 0 && (
              <div className="text-xs text-white/30">incl. {formatarMoeda(fatUnidadeSem.recorrencia)} recorr.</div>
            )}
          </div>
        </div>
      )}
      {/* Card de progresso mensal da unidade */}
      {!verGeral && fatMensalSem && (fatMensalSem as any).metaMensal && (() => {
        const _dpSem = (fatMensalSem as any).diasPassados as number | null;
        const _dnSem = (fatMensalSem as any).diasNoMes as number | null;
        const _mmSem = (fatMensalSem as any).metaMensal as number | null;
        const mediaSem = (_dpSem != null && _dpSem > 0) ? fatMensalSem.total / _dpSem : null;
        const drSem = (_dnSem != null && _dpSem != null) ? _dnSem - _dpSem : null;
        const faltaSem = _mmSem != null ? Math.max(0, _mmSem - fatMensalSem.total) : null;
        const metaDNecSem = (drSem != null && drSem > 0 && faltaSem != null) ? faltaSem / drSem : null;
        const ratioSem = (mediaSem != null && metaDNecSem != null && metaDNecSem > 0) ? mediaSem / metaDNecSem : null;
        const semaforoSem = (fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta >= 100
          ? { emoji: '🟢', label: 'Meta atingida!', cor: 'text-emerald-400' }
          : ratioSem == null ? null
          : ratioSem >= 1.0 ? { emoji: '🟢', label: 'No ritmo', cor: 'text-emerald-400' }
          : ratioSem >= 0.8 ? { emoji: '🟡', label: 'Quase no ritmo', cor: 'text-yellow-400' }
          : { emoji: '🔴', label: 'Precisa acelerar', cor: 'text-red-400' };
        return (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Meta do Mês — Unidade</div>
              {semaforoSem && (
                <span className={`text-xs font-semibold ${semaforoSem.cor}`}>{semaforoSem.emoji} {semaforoSem.label}</span>
              )}
            </div>
            {(fatMensalSem as any).pctMeta != null && (
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (fatMensalSem as any).pctMeta >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                (fatMensalSem as any).pctMeta >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>{(fatMensalSem as any).pctMeta}%</div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-indigo-300">{formatarMoeda(fatMensalSem.total)}</div>
              <div className="text-xs text-white/40 mt-0.5">Meta: {formatarMoeda((fatMensalSem as any).metaMensal)}</div>
            </div>
            <div className="text-right">
              {(fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta < 100 ? (
                <div>
                  <div className="text-sm font-bold text-amber-400">
                    Falta: {formatarMoeda(Math.max(0, (fatMensalSem as any).metaMensal - fatMensalSem.total))}
                  </div>
                  {(fatMensalSem as any).diasNoMes != null && (fatMensalSem as any).diasPassados != null && (() => {
                    const diasRestantes = (fatMensalSem as any).diasNoMes - (fatMensalSem as any).diasPassados;
                    const falta = Math.max(0, (fatMensalSem as any).metaMensal - fatMensalSem.total);
                    const metaDiaria = diasRestantes > 0 ? falta / diasRestantes : falta;
                    return diasRestantes > 0 ? (
                      <div className="text-xs text-blue-300/70 mt-0.5">
                        Precisa {formatarMoeda(metaDiaria)}/dia ({diasRestantes}d)
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="text-sm font-bold text-emerald-400">✓ Meta atingida!</div>
              )}
              {(fatMensalSem as any).superMeta && (fatMensalSem as any).superMeta > 0 && (
                <div className="text-xs text-white/30 mt-0.5">Super: {formatarMoeda((fatMensalSem as any).superMeta)}</div>
              )}
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (fatMensalSem as any).pctMeta >= 100 ? 'bg-emerald-400' :
                  (fatMensalSem as any).pctMeta >= 80 ? 'bg-yellow-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${Math.min(100, (fatMensalSem as any).pctMeta ?? 0)}%` }}
              />
            </div>
          </div>
          {/* Projeção ao final do mês */}
          {(fatMensalSem as any).projecaoFinalMes != null && (fatMensalSem as any).diasPassados != null && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">Projeção final do mês</span>
                  <span className="text-xs text-white/25">({(fatMensalSem as any).diasPassados}/{(fatMensalSem as any).diasNoMes} dias úteis)</span>
                </div>
                <div className={`text-sm font-bold ${
                  (fatMensalSem as any).metaMensal && (fatMensalSem as any).projecaoFinalMes >= (fatMensalSem as any).metaMensal
                    ? 'text-emerald-400'
                    : (fatMensalSem as any).metaMensal && (fatMensalSem as any).projecaoFinalMes >= (fatMensalSem as any).metaMensal * 0.85
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {formatarMoeda((fatMensalSem as any).projecaoFinalMes)}
                </div>
              </div>
              {(fatMensalSem as any).mediaDiaria != null && (
                <div className="text-xs text-white/25 mt-0.5 text-right">
                  Média: {formatarMoeda((fatMensalSem as any).mediaDiaria)}/dia
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para esta semana</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => {
              const total = rankingFiltrado.length;
              const isPodio3 = i === 2 && total > 3;
              const isAnteUltimo = total > 3 && i === total - 4 && total - 3 > 3;
              return (
                <React.Fragment key={p.id}>
                  <RankingCard
                    pos={i + 1}
                    nome={p.nome}
                    apelido={p.apelido}
                    fotoUrl={p.fotoUrl}
                     totalGeral={p.totalGeral}
                     totalMes={(p as any).totalMes ?? null}
                     totalServicos={p.totalServicos}
                     totalProdutos={p.totalProdutos}
                      qtdServicos={(p as any).qtdServicos ?? 0}
                      qtdProdutos={(p as any).qtdProdutos ?? 0}
                      pctMeta={(p as any).pctMeta ?? null}
                      metaMensal={(p as any).metaMensal ?? null}
                      diasRestantes={(!verGeral && (fatMensalSem as any)?.diasNoMes != null && (fatMensalSem as any)?.diasPassados != null) ? (fatMensalSem as any).diasNoMes - (fatMensalSem as any).diasPassados : null}
                     posAnterior={posMapAnteriorSem.get(p.id) ?? null}
                     isMe={p.nome === meuNome || p.apelido === meuNome}
                     empresaSlug={p.empresaSlug}
                     mostrarEmpresa={verGeral}
                     isUltimo={total > 3 && i >= total - 3}
                     animIndex={i}
                   />
                  {isPodio3 && (
                    <div key={`sep-podio-sem-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                      <span className="text-yellow-500/50 text-xs font-semibold tracking-widest uppercase">Pódio</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                    </div>
                  )}
                  {isAnteUltimo && (
                    <div key={`sep-lanterna-sem-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                      <span className="text-red-400/50 text-xs font-semibold tracking-widest uppercase">Lanterna</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {/* Botões exportar + copiar */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                const nomeEmp = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalSem = (!verGeral && fatUnidadeSem?.total != null)
                  ? `\n\n📊 Total ${nomeEmp} na semana: ${formatarMoeda(fatUnidadeSem.total)}`
                  : "";
                const pctMensalStr = (!verGeral && fatMensalSem?.pctMeta != null)
                  ? ` | ${fatMensalSem.pctMeta}% da meta mensal`
                  : "";
                const metaDiariaStr = (() => {
                  if (verGeral || !fatMensalSem) return "";
                  const diasRestantes = (fatMensalSem as any).diasNoMes != null && (fatMensalSem as any).diasPassados != null
                    ? (fatMensalSem as any).diasNoMes - (fatMensalSem as any).diasPassados
                    : null;
                  const falta = (fatMensalSem as any).metaMensal != null && (fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta < 100
                    ? Math.max(0, (fatMensalSem as any).metaMensal - fatMensalSem.total)
                    : null;
                  if ((fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta >= 100)
                    return `\n🟢 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatMensalSem as any).diasPassados > 0 ? fatMensalSem.total / (fatMensalSem as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '🎯' : ratio >= 1.0 ? '🟢' : ratio >= 0.8 ? '🟡' : '🔴';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                // Linha de meta quinzenal com semáforo de ritmo
                const quinzenalStrSem = (() => {
                  if (verGeral || !fatMensalSem) return "";
                  const mq = (fatMensalSem as any).metaQuinzenal as number | null;
                  const pctQ = (fatMensalSem as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatMensalSem as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  const diasPassados = diaAtual;
                  const mediaDiariaAtual = diasPassados > 0 ? fatQVal / diasPassados : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string;
                  let labelRitmo: string;
                  if (ratio == null) {
                    emojiRitmo = '\ud83c\udfaf'; labelRitmo = '';
                  } else if (ratio >= 1.0) {
                    emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!';
                  } else if (ratio >= 0.8) {
                    emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo';
                  } else {
                    emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!';
                  }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0
                    ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)`
                    : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodape = `${totalSem}${pctMensalStr}${quinzenalStrSem}${metaDiariaStr}\n\nperformancemeta.sbs`.trim();
                exportar(
                  `ranking-semanal-${dataInicio}`,
                  gerarTextoRanking(
                    `Ranking Semanal — ${nomeEmp}`,
                    `Semana de ${labelSemana}`,
                    rankingFiltrado,
                    rodape
                  ),
                  grupoWhatsAppSem
                );
              }}
              disabled={exportando}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              {exportando ? "Gerando..." : "WhatsApp"}
            </button>
            <button
              onClick={() => {
                const nomeEmpC = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalSemC = (!verGeral && fatMensalSem?.total != null)
                  ? `\n\n\ud83d\udcca Total ${nomeEmpC} no mês: ${formatarMoeda(fatMensalSem.total)}`
                  : "";
                const pctMensalStrC = (!verGeral && fatMensalSem?.pctMeta != null)
                  ? ` | ${fatMensalSem.pctMeta}% da meta mensal` : "";
                const metaDiariaStrC = (() => {
                  if (verGeral || !fatMensalSem) return "";
                  const diasRestantes = (fatMensalSem as any).diasNoMes != null && (fatMensalSem as any).diasPassados != null
                    ? (fatMensalSem as any).diasNoMes - (fatMensalSem as any).diasPassados : null;
                  const falta = (fatMensalSem as any).metaMensal != null && (fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta < 100
                    ? Math.max(0, (fatMensalSem as any).metaMensal - fatMensalSem.total) : null;
                  if ((fatMensalSem as any).pctMeta != null && (fatMensalSem as any).pctMeta >= 100) return `\n\ud83d\udfe2 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatMensalSem as any).diasPassados > 0 ? fatMensalSem.total / (fatMensalSem as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '\ud83c\udfaf' : ratio >= 1.0 ? '\ud83d\udfe2' : ratio >= 0.8 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                const quinzenalStrC = (() => {
                  if (verGeral || !fatMensalSem) return "";
                  const mq = (fatMensalSem as any).metaQuinzenal as number | null;
                  const pctQ = (fatMensalSem as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatMensalSem as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  const mediaDiariaAtual = diaAtual > 0 ? fatQVal / diaAtual : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string; let labelRitmo: string;
                  if (ratio == null) { emojiRitmo = '\ud83c\udfaf'; labelRitmo = ''; }
                  else if (ratio >= 1.0) { emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!'; }
                  else if (ratio >= 0.8) { emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo'; }
                  else { emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!'; }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0 ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)` : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodapeC = `${totalSemC}${pctMensalStrC}${quinzenalStrC}${metaDiariaStrC}\n\nperformancemeta.sbs`.trim();
                copiarSemanal(gerarTextoRanking(`Ranking Semanal — ${nomeEmpC}`, `Semana de ${labelSemana}`, rankingFiltrado, rodapeC));
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 text-sm font-medium transition-all active:scale-95"
              title="Copiar mensagem"
            >
              {copiadoSemanal ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}

      {/* Seção Gerência */}
      <SecaoGerencia
        gerentes={rankingGerenciaSem ?? []}
        meuNome={meuNome}
        isGerencia={isGerencia}
        grupoWhatsApp={grupoWhatsAppSem}
        tituloCompartilhamento={`Gerência — ${verGeral ? 'Todas as unidades' : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}`}
        subtituloCompartilhamento={`Semana de ${labelSemana}`}
        isLoading={isLoadingGerenciaSem}
      />

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking Semanal`}
          subtitulo={`Semana de ${labelSemana}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}
          fatMeta={!verGeral && fatMensalSem ? { total: fatMensalSem.total, metaMensal: (fatMensalSem as any).metaMensal, pctMeta: (fatMensalSem as any).pctMeta, projecaoFinalMes: (fatMensalSem as any).projecaoFinalMes } : null}
        />
      )}
    </div>
  );
}

// ─── Aba Mensal ────────────────────────────────────────────────────────────────────────────────────────────────
function AbaMensal({ meuNome, minhaEmpresa, isGerencia }: { meuNome: string; minhaEmpresa: string; isGerencia?: boolean }) {
  const isGrupo = minhaEmpresa === 'barbiero-grupo';
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string | null>(
    isGrupo ? 'barbiero-mascote' : minhaEmpresa
  );
  const verGeral = unidadeSelecionada === null;
  const empresaSlugFiltro = verGeral ? minhaEmpresa : unidadeSelecionada;
  const opcoesUnidade = useMemo(() => {
    if (isGrupo) return [
      { slug: 'barbiero-mascote', label: 'Mascote' },
      { slug: 'barbiero-morumbi', label: 'Morumbi' },
      { slug: null, label: 'Geral' },
    ];
    return [
      { slug: minhaEmpresa, label: empresaLabel(minhaEmpresa) },
      { slug: null, label: 'Geral' },
    ];
  }, [isGrupo, minhaEmpresa]);

  const [mesOffset, setMesOffset] = useState(0);
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
  const { exportRef, exportando, exportar } = useExportarImagem();
  const { copiado: copiadoMensal, copiar: copiarMensal } = useCopiarMensagem();
  // Link do grupo WhatsApp da unidade
  const { data: empresasMes } = trpc.empresa.listar.useQuery(undefined, { staleTime: 10 * 60_000 });
  const grupoWhatsAppMes = useMemo(() => {
    if (!empresasMes || verGeral) return null;
    return empresasMes.find((e) => e.slug === unidadeSelecionada)?.whatsappGrupoLink ?? null;
  }, [empresasMes, unidadeSelecionada, verGeral]);

  const { mes, ano } = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + mesOffset);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  }, [mesOffset]);

  const { data: rankingData, isLoading } = trpc.rankingMensal.useQuery({ mes, ano }, { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 });
  const rankingTodos = rankingData?.lista ?? [];
  const ehMesAtual = mesOffset === 0;

  // Mês anterior para calcular variação de posição
  const { mes: mesAnt, ano: anoAnt } = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + mesOffset - 1);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  }, [mesOffset]);
  const { data: rankingDataAnt } = trpc.rankingMensal.useQuery(
    { mes: mesAnt, ano: anoAnt },
    { staleTime: 5 * 60_000 }
  );
  const posMapAnteriorMes = useMemo(() => buildPosMap(rankingDataAnt?.lista ?? []), [rankingDataAnt]);
  // Ranking de gerência mensal (só buscado se for gerente)
  const { data: rankingGerenciaMes, isLoading: isLoadingGerenciaMes } = trpc.rankingMensalGerencia.useQuery(
    { mes, ano },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: isGerencia === true }
  );
  // Faturamento da unidade do mês
  const { data: fatUnidadeMes } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugFiltro, tipo: 'mensal', mes, ano },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
  );

  const rankingFiltrado = useMemo(() => {
    let lista = verGeral ? rankingTodos : rankingTodos.filter((p) => p.empresaSlug === unidadeSelecionada);
    if (filtroCategoria !== 'todos') {
      lista = lista.filter((p) => (p as any).categoriaRanking === filtroCategoria);
    }
    return lista;
  }, [rankingTodos, unidadeSelecionada, verGeral, filtroCategoria]);

  const minhaPosicaoGeral = useMemo(() => {
    const idx = rankingTodos.findIndex((p) => p.nome === meuNome || p.apelido === meuNome);
    return idx >= 0 ? idx + 1 : null;
  }, [rankingTodos, meuNome]);

  return (
    <div>
      {/* Seletor de mês */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMesOffset((o) => o - 1)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-white font-semibold">{ehMesAtual ? "Este mês" : `${nomeMes(mes)} ${ano}`}</div>
          <div className="text-white/40 text-xs">{nomeMes(mes)}/{ano}</div>
        </div>
        <button onClick={() => setMesOffset((o) => Math.min(0, o + 1))} disabled={ehMesAtual} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Toggle Unidade / Geral */}
      <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
        {opcoesUnidade.map((op) => (
          <button
            key={op.slug ?? 'geral'}
            onClick={() => setUnidadeSelecionada(op.slug)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              unidadeSelecionada === op.slug ? 'bg-blue-500 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {op.slug === null && <Globe className="w-3 h-3" />}
            {op.label}
          </button>
        ))}
      </div>

      {/* Filtro de Categoria */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        {(['todos', 'barbeiro', 'auxiliar', 'recepcao'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filtroCategoria === cat ? 'bg-white/15 text-white shadow' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {cat === 'todos' ? 'Todos' : cat === 'barbeiro' ? '✂️ Barb.' : cat === 'auxiliar' ? '💇 Aux.' : '💼 Recep.'}
          </button>
        ))}
      </div>

      {/* Posição no geral */}
      {!verGeral && minhaPosicaoGeral && (
        <div className="mb-3 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-blue-300">
            Você está em <strong>{minhaPosicaoGeral}º lugar</strong> no ranking geral de {nomeMes(mes)}
          </span>
        </div>
      )}

      {/* Card de faturamento da unidade */}
      {!verGeral && fatUnidadeMes && fatUnidadeMes.total > 0 && (() => {
        const _dpMes = (fatUnidadeMes as any).diasPassados as number | null;
        const _dnMes = (fatUnidadeMes as any).diasNoMes as number | null;
        const _mmMes = (fatUnidadeMes as any).metaMensal as number | null;
        const mediaMes = (_dpMes != null && _dpMes > 0) ? fatUnidadeMes.total / _dpMes : null;
        const drMes = (_dnMes != null && _dpMes != null) ? _dnMes - _dpMes : null;
        const faltaMes = _mmMes != null ? Math.max(0, _mmMes - fatUnidadeMes.total) : null;
        const metaDNecMes = (drMes != null && drMes > 0 && faltaMes != null) ? faltaMes / drMes : null;
        const ratioMes = (mediaMes != null && metaDNecMes != null && metaDNecMes > 0) ? mediaMes / metaDNecMes : null;
        const semaforoMes = (fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta >= 100
          ? { emoji: '🟢', label: 'Meta atingida!', cor: 'text-emerald-400' }
          : ratioMes == null ? null
          : ratioMes >= 1.0 ? { emoji: '🟢', label: 'No ritmo', cor: 'text-emerald-400' }
          : ratioMes >= 0.8 ? { emoji: '🟡', label: 'Quase no ritmo', cor: 'text-yellow-400' }
          : { emoji: '🔴', label: 'Precisa acelerar', cor: 'text-red-400' };
        return (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Faturamento da Unidade</div>
              {semaforoMes && (
                <span className={`text-xs font-semibold ${semaforoMes.cor}`}>{semaforoMes.emoji} {semaforoMes.label}</span>
              )}
            </div>
            {(fatUnidadeMes as any).pctMeta != null && (
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (fatUnidadeMes as any).pctMeta >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                (fatUnidadeMes as any).pctMeta >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>{(fatUnidadeMes as any).pctMeta}%</div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl font-bold text-emerald-400">{formatarMoeda(fatUnidadeMes.total)}</div>
              {(fatUnidadeMes as any).metaMensal && (
                <div className="text-xs text-white/40 mt-0.5">Meta: {formatarMoeda((fatUnidadeMes as any).metaMensal)}</div>
              )}
            </div>
            <div className="text-right">
              {(fatUnidadeMes as any).metaMensal && (fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta < 100 ? (
                <div>
                  <div className="text-sm font-bold text-amber-400">
                    Falta: {formatarMoeda(Math.max(0, (fatUnidadeMes as any).metaMensal - fatUnidadeMes.total))}
                  </div>
                  {(fatUnidadeMes as any).diasNoMes != null && (fatUnidadeMes as any).diasPassados != null && (() => {
                    const diasRestantes = (fatUnidadeMes as any).diasNoMes - (fatUnidadeMes as any).diasPassados;
                    const falta = Math.max(0, (fatUnidadeMes as any).metaMensal - fatUnidadeMes.total);
                    const metaDiaria = diasRestantes > 0 ? falta / diasRestantes : falta;
                    return diasRestantes > 0 ? (
                      <div className="text-xs text-blue-300/70 mt-0.5">
                        Precisa {formatarMoeda(metaDiaria)}/dia ({diasRestantes}d)
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta >= 100 ? (
                <div className="text-sm font-bold text-emerald-400">✓ Meta atingida!</div>
              ) : null}
              {fatUnidadeMes.recorrencia > 0 && (
                <div className="text-xs text-white/30 mt-0.5">incl. {formatarMoeda(fatUnidadeMes.recorrencia)} recorr.</div>
              )}
            </div>
          </div>
          {(fatUnidadeMes as any).metaMensal && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (fatUnidadeMes as any).pctMeta >= 100 ? 'bg-emerald-400' :
                    (fatUnidadeMes as any).pctMeta >= 80 ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, (fatUnidadeMes as any).pctMeta ?? 0)}%` }}
                />
              </div>
              {(fatUnidadeMes as any).superMeta && (fatUnidadeMes as any).superMeta > 0 && (
                <div className="text-xs text-white/30 mt-0.5 text-right">Super: {formatarMoeda((fatUnidadeMes as any).superMeta)}</div>
              )}
            </div>
          )}
          {/* Projeção de faturamento ao final do mês */}
          {(fatUnidadeMes as any).projecaoFinalMes != null && (fatUnidadeMes as any).diasPassados != null && (fatUnidadeMes as any).diasNoMes != null && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">Projeção final do mês</span>
                  <span className="text-xs text-white/25">({(fatUnidadeMes as any).diasPassados}/{(fatUnidadeMes as any).diasNoMes} dias úteis)</span>
                </div>
                <div className={`text-sm font-bold ${
                  (fatUnidadeMes as any).metaMensal && (fatUnidadeMes as any).projecaoFinalMes >= (fatUnidadeMes as any).metaMensal
                    ? 'text-emerald-400'
                    : (fatUnidadeMes as any).metaMensal && (fatUnidadeMes as any).projecaoFinalMes >= (fatUnidadeMes as any).metaMensal * 0.85
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {formatarMoeda((fatUnidadeMes as any).projecaoFinalMes)}
                </div>
              </div>
              {(fatUnidadeMes as any).mediaDiaria != null && (
                <div className="text-xs text-white/25 mt-0.5 text-right">
                  Média: {formatarMoeda((fatUnidadeMes as any).mediaDiaria)}/dia
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para este mês</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => {
              const total = rankingFiltrado.length;
              const isPodio3 = i === 2 && total > 3;
              const isAnteUltimo = total > 3 && i === total - 4 && total - 3 > 3;
              return (
                <>
                  <RankingCard
                    key={p.id}
                    pos={i + 1}
                    nome={p.nome}
                    apelido={p.apelido}
                    fotoUrl={p.fotoUrl}
                     totalGeral={p.totalGeral}
                     totalMes={(p as any).totalMes ?? p.totalGeral}
                     totalServicos={p.totalServicos}
                     totalProdutos={p.totalProdutos}
                     qtdServicos={(p as any).qtdServicos ?? 0}
                     qtdProdutos={(p as any).qtdProdutos ?? 0}
                     pctMeta={p.pctMeta}
                    metaMensal={p.metaMensal}
                    diasRestantes={(!verGeral && (fatUnidadeMes as any)?.diasNoMes != null && (fatUnidadeMes as any)?.diasPassados != null) ? (fatUnidadeMes as any).diasNoMes - (fatUnidadeMes as any).diasPassados : null}
                    posAnterior={posMapAnteriorMes.get(p.id) ?? null}
                    isMe={p.nome === meuNome || p.apelido === meuNome}
                    empresaSlug={p.empresaSlug}
                    mostrarEmpresa={verGeral}
                    isUltimo={total > 3 && i >= total - 3}
                    animIndex={i}
                  />
                  {isPodio3 && (
                    <div key={`sep-podio-mes-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                      <span className="text-yellow-500/50 text-xs font-semibold tracking-widest uppercase">Pódio</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                    </div>
                  )}
                  {isAnteUltimo && (
                    <div key={`sep-lanterna-mes-${i}`} className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                      <span className="text-red-400/50 text-xs font-semibold tracking-widest uppercase">Lanterna</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                    </div>
                  )}
                </>
              );
            })}
          </div>
          {/* Botões exportar + copiar */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                const nomeEmp = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalMes = (!verGeral && fatUnidadeMes?.total != null)
                  ? `\n\n📊 Total ${nomeEmp} em ${nomeMes(mes)}: ${formatarMoeda(fatUnidadeMes.total)}`
                  : "";
                const pctMensalStr = (!verGeral && fatUnidadeMes?.pctMeta != null)
                  ? ` | ${fatUnidadeMes.pctMeta}% da meta`
                  : "";
                const metaDiariaStr = (() => {
                  if (verGeral || !fatUnidadeMes) return "";
                  const diasRestantes = (fatUnidadeMes as any).diasNoMes != null && (fatUnidadeMes as any).diasPassados != null
                    ? (fatUnidadeMes as any).diasNoMes - (fatUnidadeMes as any).diasPassados
                    : null;
                  const falta = (fatUnidadeMes as any).metaMensal != null && (fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta < 100
                    ? Math.max(0, (fatUnidadeMes as any).metaMensal - fatUnidadeMes.total)
                    : null;
                  if ((fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta >= 100)
                    return `\n🟢 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatUnidadeMes as any).diasPassados > 0 ? fatUnidadeMes.total / (fatUnidadeMes as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '🎯' : ratio >= 1.0 ? '🟢' : ratio >= 0.8 ? '🟡' : '🔴';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                // Linha de meta quinzenal com semáforo de ritmo
                const quinzenalStrMes = (() => {
                  if (verGeral || !fatUnidadeMes) return "";
                  const mq = (fatUnidadeMes as any).metaQuinzenal as number | null;
                  const pctQ = (fatUnidadeMes as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatUnidadeMes as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  const diasPassados = diaAtual;
                  const mediaDiariaAtual = diasPassados > 0 ? fatQVal / diasPassados : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string;
                  let labelRitmo: string;
                  if (ratio == null) {
                    emojiRitmo = '\ud83c\udfaf'; labelRitmo = '';
                  } else if (ratio >= 1.0) {
                    emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!';
                  } else if (ratio >= 0.8) {
                    emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo';
                  } else {
                    emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!';
                  }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0
                    ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)`
                    : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodape = `${totalMes}${pctMensalStr}${quinzenalStrMes}${metaDiariaStr}\n\nperformancemeta.sbs`.trim();
                exportar(
                  `ranking-${nomeMes(mes).toLowerCase()}-${ano}`,
                  gerarTextoRanking(
                    `Ranking de ${nomeMes(mes)}/${ano} — ${nomeEmp}`,
                    `${nomeMes(mes)} ${ano}`,
                    rankingFiltrado,
                    rodape
                  ),
                  grupoWhatsAppMes
                );
              }}
              disabled={exportando}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/30 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              {exportando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              {exportando ? "Gerando..." : "WhatsApp"}
            </button>
            <button
              onClick={() => {
                const nomeEmpC = verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa);
                const totalMesC = (!verGeral && fatUnidadeMes?.total != null)
                  ? `\n\n\ud83d\udcca Total ${nomeEmpC} em ${nomeMes(mes)}: ${formatarMoeda(fatUnidadeMes.total)}`
                  : "";
                const pctMensalStrC = (!verGeral && fatUnidadeMes?.pctMeta != null)
                  ? ` | ${fatUnidadeMes.pctMeta}% da meta` : "";
                const metaDiariaStrC = (() => {
                  if (verGeral || !fatUnidadeMes) return "";
                  const diasRestantes = (fatUnidadeMes as any).diasNoMes != null && (fatUnidadeMes as any).diasPassados != null
                    ? (fatUnidadeMes as any).diasNoMes - (fatUnidadeMes as any).diasPassados : null;
                  const falta = (fatUnidadeMes as any).metaMensal != null && (fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta < 100
                    ? Math.max(0, (fatUnidadeMes as any).metaMensal - fatUnidadeMes.total) : null;
                  if ((fatUnidadeMes as any).pctMeta != null && (fatUnidadeMes as any).pctMeta >= 100) return `\n\ud83d\udfe2 Meta do mês atingida!`;
                  if (diasRestantes != null && diasRestantes > 0 && falta != null) {
                    const mediaDia = (fatUnidadeMes as any).diasPassados > 0 ? fatUnidadeMes.total / (fatUnidadeMes as any).diasPassados : null;
                    const metaDiaria = falta / diasRestantes;
                    const ratio = mediaDia != null && metaDiaria > 0 ? mediaDia / metaDiaria : null;
                    const emoji = ratio == null ? '\ud83c\udfaf' : ratio >= 1.0 ? '\ud83d\udfe2' : ratio >= 0.8 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    const label = ratio == null ? '' : ratio >= 1.0 ? ' No ritmo' : ratio >= 0.8 ? ' Quase no ritmo' : ' Precisa acelerar';
                    return `\n${emoji}${label} — Meta diária necessária: ${formatarMoeda(metaDiaria)}/dia (${diasRestantes}d restantes)`;
                  }
                  return "";
                })();
                const quinzenalStrC = (() => {
                  if (verGeral || !fatUnidadeMes) return "";
                  const mq = (fatUnidadeMes as any).metaQuinzenal as number | null;
                  const pctQ = (fatUnidadeMes as any).pctMetaQuinzenal as number | null;
                  const fatQ = (fatUnidadeMes as any).totalQuinzenal as number | null;
                  if (!mq || mq <= 0 || pctQ == null) return "";
                  const fatQVal = fatQ ?? 0;
                  const faltaQ = Math.max(0, mq - fatQVal);
                  const atingiuQ = pctQ >= 100;
                  const diaAtual = new Date().getDate();
                  const naSegundaQ = diaAtual > 15;
                  if (atingiuQ) return `\n\n\ud83c\udfc5 META QUINZENAL ATINGIDA!\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) Parabéns, meta quinzenal batida! Agora foco na meta mensal! 💪`;
                  if (naSegundaQ) {
                    const emojiF = pctQ >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                    return `\n\n${emojiF} Quinzenal encerrada (dia 15):\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — faltou ${formatarMoeda(faltaQ)}`;
                  }
                  const diasRestQ = 15 - diaAtual;
                  const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                  const mediaDiariaAtual = diaAtual > 0 ? fatQVal / diaAtual : 0;
                  const ratio = metaDiariaQ > 0 ? mediaDiariaAtual / metaDiariaQ : null;
                  let emojiRitmo: string; let labelRitmo: string;
                  if (ratio == null) { emojiRitmo = '\ud83c\udfaf'; labelRitmo = ''; }
                  else if (ratio >= 1.0) { emojiRitmo = '\ud83d\udfe2'; labelRitmo = ' No ritmo certo!'; }
                  else if (ratio >= 0.8) { emojiRitmo = '\ud83d\udfe1'; labelRitmo = ' Quase no ritmo'; }
                  else { emojiRitmo = '\ud83d\udd34'; labelRitmo = ' Precisa acelerar!'; }
                  const sufixo = diasRestQ > 0 && metaDiariaQ > 0 ? ` | Meta/dia: ${formatarMoeda(metaDiariaQ)} (${diasRestQ}d restantes)` : '';
                  return `\n\n${emojiRitmo} Quinzenal${labelRitmo}\n   ${formatarMoeda(fatQVal)} / ${formatarMoeda(mq)} (${pctQ}%) — falta ${formatarMoeda(faltaQ)}${sufixo}`;
                })();
                const rodapeC = `${totalMesC}${pctMensalStrC}${quinzenalStrC}${metaDiariaStrC}\n\nperformancemeta.sbs`.trim();
                copiarMensal(gerarTextoRanking(`Ranking de ${nomeMes(mes)}/${ano} — ${nomeEmpC}`, `${nomeMes(mes)} ${ano}`, rankingFiltrado, rodapeC));
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-white/80 text-sm font-medium transition-all active:scale-95"
              title="Copiar mensagem"
            >
              {copiadoMensal ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}

      {/* Seção Gerência */}
      <SecaoGerencia
        gerentes={rankingGerenciaMes?.lista ?? []}
        meuNome={meuNome}
        isGerencia={isGerencia}
        grupoWhatsApp={grupoWhatsAppMes}
        tituloCompartilhamento={`Gerência — ${verGeral ? 'Todas as unidades' : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}`}
        subtituloCompartilhamento={`${nomeMes(mes)} de ${ano}`}
        isLoading={isLoadingGerenciaMes}
      />

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking — ${nomeMes(mes)}`}
          subtitulo={`Faturamento de ${nomeMes(mes)} de ${ano}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(unidadeSelecionada ?? minhaEmpresa)}
          fatMeta={!verGeral && fatUnidadeMes ? { total: fatUnidadeMes.total, metaMensal: (fatUnidadeMes as any).metaMensal, pctMeta: (fatUnidadeMes as any).pctMeta, projecaoFinalMes: (fatUnidadeMes as any).projecaoFinalMes } : null}
        />
      )}
    </div>
  );
}

// ─── Aba Meus Atendimentos ───────────────────────────────────────────────────
function AbaAtendimentos({ meuNome }: { meuNome: string }) {
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes">("hoje");

  function getRange(p: "hoje" | "semana" | "mes"): { dataInicio: string; dataFim: string } {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    if (p === "hoje") {
      const s = fmt(d);
      return { dataInicio: s, dataFim: s };
    }
    if (p === "semana") {
      const day = d.getDay(); // 0=dom
      const diffSeg = (day === 0 ? -6 : 1 - day);
      const seg = new Date(d); seg.setDate(d.getDate() + diffSeg);
      const sab = new Date(seg); sab.setDate(seg.getDate() + 6);
      return { dataInicio: fmt(seg), dataFim: fmt(sab) };
    }
    // mes
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
  }

  const range = getRange(periodo);
  const { data, isLoading, error } = trpc.meusAtendimentos.useQuery(
    { dataInicio: range.dataInicio, dataFim: range.dataFim },
    { staleTime: 1000 * 60 * 5, refetchInterval: 20 * 60 * 1000 }
  );

  const periodos = [
    { id: "hoje" as const, label: "Hoje" },
    { id: "semana" as const, label: "Semana" },
    { id: "mes" as const, label: "Mês" },
  ];

  return (
    <div className="space-y-4">
      {/* Seletor de período */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {periodos.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPeriodo(id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              periodo === id ? "bg-blue-500 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400 text-sm">
          Erro ao carregar atendimentos. Tente novamente.
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Total</p>
              <p className="text-white font-bold text-sm">{formatarMoeda(data.totalGeral)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Serviços</p>
              <p className="text-blue-300 font-bold text-sm">{data.qtdServicos} atend.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Produtos</p>
              <p className="text-emerald-300 font-bold text-sm">{data.qtdProdutos} itens</p>
            </div>
          </div>

          {/* Serviços */}
          {data.servicos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-4 h-4 text-blue-400" />
                <h3 className="text-white/70 text-sm font-semibold">Serviços</h3>
                <span className="text-white/30 text-xs ml-auto">{formatarMoeda(data.totalServicos)}</span>
              </div>
              <div className="space-y-1.5">
                {data.servicos.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{s.nome}</p>
                      <p className="text-white/40 text-xs">{s.qtd}x</p>
                    </div>
                    <span className="text-blue-300 font-semibold text-sm ml-3">{formatarMoeda(s.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {data.produtos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white/70 text-sm font-semibold">Produtos</h3>
                <span className="text-white/30 text-xs ml-auto">{formatarMoeda(data.totalProdutos)}</span>
              </div>
              <div className="space-y-1.5">
                {data.produtos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{p.nome}</p>
                      <p className="text-white/40 text-xs">{p.qtd}x</p>
                    </div>
                    <span className="text-emerald-300 font-semibold text-sm ml-3">{formatarMoeda(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.servicos.length === 0 && data.produtos.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">
              Nenhum atendimento encontrado no período.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Aba Análise Comparativa ─────────────────────────────────────────────────
function AbaAnalise({ profissionalId }: { profissionalId: number }) {
  const { data, isLoading, error } = trpc.analiseComparativa.useQuery(
    { profissionalId },
    { staleTime: 1000 * 60 * 10, refetchInterval: 30 * 60 * 1000 }
  );

  const now = new Date();
  const mesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="text-center py-10 text-red-400 text-sm">
        Erro ao carregar análise. Tente novamente.
      </div>
    );
  }

  const varMensal = data.variacaoMensal;
  const varSemanal = data.variacaoSemanal;
  const varPos = data.variacaoPosicao;

  const corVariacao = (v: number | null) =>
    v == null ? "text-white/40" : v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-white/40";
  const iconVariacao = (v: number | null) =>
    v == null ? null : v > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : v < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

  const pctMeta = data.metaMensal && data.metaMensal > 0
    ? Math.round((data.mesAtual.totalGeral / data.metaMensal) * 100)
    : null;

  return (
    <div className="space-y-4">

      {/* ── Comparativo Mensal ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Comparativo Mensal</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Mês atual */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <p className="text-blue-300/70 text-xs mb-1">{mesNomes[data.mesAtual.mes - 1]} {data.mesAtual.ano}</p>
            <p className="text-white font-bold text-lg">{formatarMoeda(data.mesAtual.totalGeral)}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-white/40 text-xs">Serv.</span>
              <span className="text-blue-300 text-xs font-medium">{formatarMoeda(data.mesAtual.totalServicos)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-xs">Prod.</span>
              <span className="text-emerald-300 text-xs font-medium">{formatarMoeda(data.mesAtual.totalProdutos)}</span>
            </div>
            {data.mesAtual.posicao && (
              <p className="text-white/50 text-xs mt-1">{data.mesAtual.posicao}º no ranking</p>
            )}
          </div>
          {/* Mês anterior */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-white/40 text-xs mb-1">{mesNomes[data.mesAnterior.mes - 1]} {data.mesAnterior.ano}</p>
            <p className="text-white/70 font-bold text-lg">{formatarMoeda(data.mesAnterior.totalGeral)}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-white/40 text-xs">Serv.</span>
              <span className="text-blue-300/60 text-xs">{formatarMoeda(data.mesAnterior.totalServicos)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/40 text-xs">Prod.</span>
              <span className="text-emerald-300/60 text-xs">{formatarMoeda(data.mesAnterior.totalProdutos)}</span>
            </div>
            {data.mesAnterior.posicao && (
              <p className="text-white/30 text-xs mt-1">{data.mesAnterior.posicao}º no ranking</p>
            )}
          </div>
        </div>
        {/* Variação mensal */}
        {varMensal !== null && (
          <div className={`flex items-center gap-1.5 mt-3 ${corVariacao(varMensal)}`}>
            {iconVariacao(varMensal)}
            <span className="text-sm font-semibold">
              {varMensal > 0 ? "+" : ""}{varMensal}% vs mês passado
            </span>
          </div>
        )}
        {/* Barra de meta */}
        {pctMeta !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/40">Meta: {formatarMoeda(data.metaMensal!)}</span>
              <span className={pctMeta >= 100 ? "text-emerald-400 font-bold" : pctMeta >= 75 ? "text-blue-400" : "text-amber-400"}>{pctMeta}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctMeta >= 100 ? "bg-emerald-400" : pctMeta >= 75 ? "bg-blue-400" : pctMeta >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Comparativo Semanal ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Comparativo Semanal</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <p className="text-blue-300/70 text-xs mb-1">Esta semana</p>
            <p className="text-white font-bold text-base">{formatarMoeda(data.semanaAtual.totalGeral)}</p>
            <p className="text-white/40 text-xs mt-1">{data.semanaAtual.qtdServicos} serv. · {data.semanaAtual.qtdProdutos} prod.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-white/40 text-xs mb-1">Semana passada</p>
            <p className="text-white/70 font-bold text-base">{formatarMoeda(data.semanaPassada.totalGeral)}</p>
            <p className="text-white/30 text-xs mt-1">{data.semanaPassada.qtdServicos} serv. · {data.semanaPassada.qtdProdutos} prod.</p>
          </div>
        </div>
        {varSemanal !== null && (
          <div className={`flex items-center gap-1.5 mt-3 ${corVariacao(varSemanal)}`}>
            {iconVariacao(varSemanal)}
            <span className="text-sm font-semibold">
              {varSemanal > 0 ? "+" : ""}{varSemanal}% vs semana passada
            </span>
          </div>
        )}
      </div>

      {/* ── Projeção ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Projeção do Mês</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-white/40 text-xs mb-1">Média/dia</p>
            <p className="text-white font-bold text-sm">{formatarMoeda(data.mediaDiaria)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-xs mb-1">Dias restantes</p>
            <p className="text-white font-bold text-sm">{data.diasRestantes}d</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-xs mb-1">Projeção final</p>
            <p className="text-emerald-300 font-bold text-sm">{formatarMoeda(data.projecaoFinal)}</p>
          </div>
        </div>
        {varPos !== null && (
          <div className={`flex items-center gap-1.5 mt-3 ${corVariacao(varPos)}`}>
            {iconVariacao(varPos)}
            <span className="text-sm font-semibold">
              {varPos > 0 ? `Subiu ${varPos} posição(ões)` : varPos < 0 ? `Caiu ${Math.abs(varPos)} posição(ões)` : "Mesma posição"} no ranking
            </span>
          </div>
        )}
      </div>

      {/* ── Insights e Estratégias ── */}
      {data.insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Insights & Estratégias</h2>
          {data.insights.map((ins, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 border ${
                ins.tipo === 'positivo'
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : ins.tipo === 'atencao'
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-white/5 border-white/10'
              }`}
              style={{ animation: `rankingSlideIn 0.35s ease-out both`, animationDelay: `${i * 80}ms` }}
            >
              <p className={`font-semibold text-sm mb-1 ${
                ins.tipo === 'positivo' ? 'text-emerald-300' : ins.tipo === 'atencao' ? 'text-amber-300' : 'text-white/70'
              }`}>{ins.titulo}</p>
              <p className="text-white/60 text-xs mb-2">{ins.descricao}</p>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 text-xs mt-0.5">💡</span>
                <p className="text-blue-200/80 text-xs">{ins.estrategia}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.insights.length === 0 && (
        <div className="text-center py-6 text-white/30 text-sm">
          Dados insuficientes para gerar insights. Continue registrando atendimentos!
        </div>
      )}
    </div>
  );
}

// ─── Aba Meu Desempenho ─────────────────────────────────────────────────────
function AbaDesempenho({ profissionalId }: { profissionalId: number }) {
  const confettiRef = useRef<boolean>(false);
  const { data, isLoading, error } = trpc.desempenhoHistorico.useQuery(
    { profissionalId },
    { staleTime: 1000 * 60 * 10, refetchInterval: 30 * 60 * 1000 }
  );
  const { status: pushStatus, isRegistering, ativar: ativarPush, desativar: desativarPush } = usePushNotifications(profissionalId);
  const mesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  // Buscar meta quinzenal da unidade do profissional
  const [mesAtualQ] = useState(() => new Date().getMonth() + 1);
  const [anoAtualQ] = useState(() => new Date().getFullYear());
  const empresaSlugUnidade = data?.empresaSlug ?? null;
  const { data: fatUnidadeQ } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: empresaSlugUnidade!, tipo: 'mensal', mes: mesAtualQ, ano: anoAtualQ },
    { staleTime: 5 * 60_000, enabled: !!empresaSlugUnidade && empresaSlugUnidade !== 'barbiero-grupo' }
  );
  const { data: metaDiaria } = trpc.performance.metaDiariaDinamica.useQuery(
    { profissionalId },
    { staleTime: 5 * 60_000, refetchInterval: 15 * 60_000 }
  );
  const { data: padraoSem } = trpc.performance.padraoSemanal.useQuery(
    { profissionalId },
    { staleTime: 30 * 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="text-center py-10 text-red-400 text-sm">
        Erro ao carregar desempenho. Tente novamente.
      </div>
    );
  }

  const mesAtualData = data.historico[data.historico.length - 1];
  const pctMeta = data.metaMensal && data.metaMensal > 0
    ? Math.min(100, Math.round((mesAtualData.totalGeral / data.metaMensal) * 100))
    : null;
  const faltaMeta = data.metaMensal && data.metaMensal > 0
    ? Math.max(0, data.metaMensal - mesAtualData.totalGeral)
    : null;
  const corBarra = pctMeta == null ? 'bg-blue-400'
    : pctMeta >= 100 ? 'bg-emerald-400'
    : pctMeta >= 75  ? 'bg-blue-400'
    : pctMeta >= 50  ? 'bg-amber-400'
    : 'bg-red-400';
  const corTexto = pctMeta == null ? 'text-blue-300'
    : pctMeta >= 100 ? 'text-emerald-300'
    : pctMeta >= 75  ? 'text-blue-300'
    : pctMeta >= 50  ? 'text-amber-300'
    : 'text-red-300';

  // Calcular melhor posição histórica
  const melhorPosicao = data.historico.reduce((best, h) => {
    if (h.posicao && (!best || h.posicao < best)) return h.posicao;
    return best;
  }, null as number | null);

  // Calcular tendência (último mês vs penúltimo)
  const penultimoMes = data.historico[data.historico.length - 2];
  const variacaoMensal = penultimoMes.totalGeral > 0
    ? Math.round(((mesAtualData.totalGeral - penultimoMes.totalGeral) / penultimoMes.totalGeral) * 100)
    : null;

  // Altura máxima para o gráfico de barras
  const maxFat = Math.max(...data.historico.map(h => h.totalGeral), 1);
  // Mensagem motivacional dinâmica
  const fmtMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const posicaoAtual = mesAtualData.posicao;

  // Dados quinzenais da unidade para o semáforo motivacional
  const diaHojeMotiv = new Date().getDate();
  const naPrimeiraQuinzena = diaHojeMotiv <= 15;
  const pctQ = fatUnidadeQ ? (fatUnidadeQ as any).pctMetaQuinzenal as number | null : null;
  const mqUnidade = fatUnidadeQ ? (fatUnidadeQ as any).metaQuinzenal as number | null : null;
  const fatQUnidade = (pctQ != null && mqUnidade != null) ? Math.round((pctQ * mqUnidade) / 100) : null;
  const faltaQUnidade = (mqUnidade != null && fatQUnidade != null) ? Math.max(0, mqUnidade - fatQUnidade) : null;
  const diasRestantesQ = naPrimeiraQuinzena ? 15 - diaHojeMotiv : 0;
  const metaDiariaQMotiv = (naPrimeiraQuinzena && diasRestantesQ > 0 && faltaQUnidade != null && faltaQUnidade > 0)
    ? Math.round(faltaQUnidade / diasRestantesQ)
    : null;

  const metaMensalBatida = pctMeta !== null && pctMeta >= 100;

  // Disparar confetes quando meta mensal é batida (apenas uma vez por montagem)
  useEffect(() => {
    if (metaMensalBatida && !confettiRef.current) {
      confettiRef.current = true;
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default;
        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      });
    }
  }, [metaMensalBatida]);

  let motivEmoji = '💪';
  let motivTitulo = '';
  let motivSubtitulo = '';

  // Prioridade 1: meta mensal batida
  if (metaMensalBatida) {
    motivEmoji = '🏆';
    motivTitulo = 'Meta batida! Incrível!';
    motivSubtitulo = 'Você superou sua meta do mês. Continue assim!';
  // Prioridade 2: quinzenal na reta final (dias 12-15) com meta em risco
  } else if (naPrimeiraQuinzena && diaHojeMotiv >= 12 && pctQ != null && pctQ < 100 && mqUnidade != null) {
    if (pctQ >= 90) {
      motivEmoji = '🔥';
      motivTitulo = `Quinzenal quase lá! ${pctQ}%`;
      motivSubtitulo = faltaQUnidade != null && faltaQUnidade > 0
        ? `Faltam ${fmtMoeda(faltaQUnidade)} para bater a meta quinzenal${metaDiariaQMotiv ? ` — ${fmtMoeda(metaDiariaQMotiv)}/dia` : ''}!`
        : 'Mais um esforço e a meta quinzenal é sua!';
    } else if (pctQ >= 70) {
      motivEmoji = '⚡';
      motivTitulo = `Atenção: quinzenal em ${pctQ}%`;
      motivSubtitulo = faltaQUnidade != null
        ? `Faltam ${fmtMoeda(faltaQUnidade)} para a meta quinzenal${metaDiariaQMotiv ? ` — precisa de ${fmtMoeda(metaDiariaQMotiv)}/dia` : ''}!`
        : 'A unidade precisa acelerar para bater a meta quinzenal!';
    } else {
      motivEmoji = '🚨';
      motivTitulo = `Quinzenal em risco! ${pctQ}%`;
      motivSubtitulo = faltaQUnidade != null
        ? `Faltam ${fmtMoeda(faltaQUnidade)} para a meta quinzenal. Cada atendimento conta!`
        : 'A unidade precisa de um sprint final para bater a meta quinzenal!';
    }
  // Prioridade 3: quinzenal batida na 1ª quinzena
  } else if (naPrimeiraQuinzena && pctQ != null && pctQ >= 100) {
    motivEmoji = '🏅';
    motivTitulo = 'Meta quinzenal batida! Parabéns!';
    motivSubtitulo = 'Incrível! A unidade bateu a meta da quinzena. Agora é focar na meta mensal!';
  // Prioridade 4: quinzenal em andamento (dias 1-11)
  } else if (naPrimeiraQuinzena && pctQ != null && mqUnidade != null) {
    if (pctQ >= 60) {
      motivEmoji = '📈';
      motivTitulo = `Quinzenal em ${pctQ}% — no ritmo!`;
      motivSubtitulo = metaDiariaQMotiv != null
        ? `Precisa de ${fmtMoeda(metaDiariaQMotiv)}/dia para bater a meta quinzenal.`
        : `Faltam ${fmtMoeda(faltaQUnidade ?? 0)} para a meta quinzenal.`;
    } else {
      motivEmoji = '🎯';
      motivTitulo = `Quinzenal em ${pctQ}% — acelere!`;
      motivSubtitulo = metaDiariaQMotiv != null
        ? `A unidade precisa de ${fmtMoeda(metaDiariaQMotiv)}/dia para bater a meta quinzenal.`
        : `Faltam ${fmtMoeda(faltaQUnidade ?? 0)} para a meta quinzenal.`;
    }
  // Prioridade 5: falta pouco para subir no ranking
  } else if (data.faltaParaSubir !== null && data.faltaParaSubir > 0 && data.faltaParaSubir < 500) {
    motivEmoji = '🔥';
    motivTitulo = `Só falta ${fmtMoeda(data.faltaParaSubir)} para subir!`;
    motivSubtitulo = data.nomeProximo ? `Você está quase ultrapassando ${data.nomeProximo.split(' ')[0]}!` : 'Você está muito perto de subir uma posição!';
  } else if (data.faltaParaSubir !== null && data.faltaParaSubir > 0) {
    motivEmoji = '🎯';
    motivTitulo = `${fmtMoeda(data.faltaParaSubir)} para subir uma posição`;
    motivSubtitulo = data.nomeProximo ? `Supere ${data.nomeProximo.split(' ')[0]} e avance no ranking!` : 'Foque no próximo atendimento!';
  } else if (posicaoAtual === 1) {
    motivEmoji = '👑';
    motivTitulo = 'Você está em 1º lugar!';
    motivSubtitulo = naPrimeiraQuinzena ? 'No topo do ranking e na reta final da quinzenal!' : 'Mantenha o ritmo e feche o mês no topo!';
  } else if (pctMeta !== null && pctMeta >= 75) {
    motivEmoji = '⚡';
    motivTitulo = 'Ótimo ritmo! Quase lá!';
    motivSubtitulo = `Faltam ${fmtMoeda(faltaMeta ?? 0)} para bater a meta. Você consegue!`;
  } else if (pctMeta !== null && pctMeta >= 50) {
    motivEmoji = '📈';
    motivTitulo = 'Na metade do caminho!';
    motivSubtitulo = `Acelere o ritmo — faltam ${fmtMoeda(faltaMeta ?? 0)} para a meta.`;
  } else if (pctMeta !== null) {
    motivEmoji = '💡';
    motivTitulo = 'Hora de acelerar!';
    motivSubtitulo = `Cada atendimento conta. Faltam ${fmtMoeda(faltaMeta ?? 0)} para a meta.`;
  } else {
    motivEmoji = '💪';
    motivTitulo = 'Continue focado!';
    motivSubtitulo = 'Peça ao gestor para configurar sua meta individual.';
  }
  return (
    <div className="space-y-4">
      {/* ── Card Motivacional ── */}
      <div className={`rounded-2xl p-4 border relative overflow-hidden ${
        metaMensalBatida
          ? 'border-yellow-400/50'
          : mesAtualData.posicao === 1
          ? 'bg-amber-500/15 border-amber-500/30'
          : data.faltaParaSubir !== null && data.faltaParaSubir < 500
          ? 'bg-orange-500/15 border-orange-500/30'
          : 'bg-white/5 border-white/10'
      }`}
        style={metaMensalBatida ? {
          background: 'linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(34,197,94,0.15) 50%, rgba(255,165,0,0.18) 100%)',
          animation: 'celebrationPulse 2s ease-in-out infinite',
        } : undefined}
      >
        {/* Brilho decorativo no canto superior direito quando meta batida */}
        {metaMensalBatida && (
          <div className="absolute top-0 right-0 w-20 h-20 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }}
          />
        )}
        <div className="flex items-start gap-3">
          <span
            className="text-2xl leading-none mt-0.5"
            style={metaMensalBatida ? { animation: 'trophyBounce 0.8s ease-in-out infinite alternate' } : undefined}
          >{motivEmoji}</span>
          <div>
            <p className={`font-bold text-base leading-snug ${metaMensalBatida ? 'text-yellow-300' : 'text-white'}`}>{motivTitulo}</p>
            <p className="text-white/55 text-sm mt-0.5 leading-snug">{motivSubtitulo}</p>
          </div>
        </div>
      </div>
      {/* ── Botão de Notificações Push ── */}
      {pushStatus !== 'unsupported' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                pushStatus === 'active' ? 'bg-emerald-500/20' : 'bg-white/10'
              }`}>
                {pushStatus === 'active'
                  ? <Bell className="w-4 h-4 text-emerald-400" />
                  : <BellOff className="w-4 h-4 text-white/40" />
                }
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-snug">
                  {pushStatus === 'active' ? 'Notificações ativas' : 'Ativar notificações'}
                </p>
                <p className="text-white/45 text-xs mt-0.5 leading-snug">
                  {pushStatus === 'active'
                    ? 'Você receberá alertas de ranking no celular'
                    : pushStatus === 'denied'
                    ? 'Bloqueado nas configurações do browser'
                    : 'Receba alertas do ranking direto no celular'
                  }
                </p>
              </div>
            </div>
            {pushStatus !== 'denied' && (
              <button
                onClick={pushStatus === 'active' ? desativarPush : ativarPush}
                disabled={isRegistering || pushStatus === 'loading'}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pushStatus === 'active'
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                } disabled:opacity-50`}
              >
                {isRegistering ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : pushStatus === 'active' ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        </div>
      )}
      {/* ── Card de Meta Individual ── */}
      {data.metaMensal ? (
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider">Meta do Mês</h2>
            </div>
            {pctMeta != null && (
              <span className={`text-lg font-bold ${corTexto}`}>{pctMeta}%</span>
            )}
          </div>
          {/* Barra de progresso grande */}
          <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${corBarra}`}
              style={{ width: `${pctMeta ?? 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-xl">{formatarMoeda(mesAtualData.totalGeral)}</p>
              <p className="text-white/40 text-xs">de {formatarMoeda(data.metaMensal)}</p>
            </div>
            {faltaMeta != null && faltaMeta > 0 && (
              <div className="text-right">
                <p className="text-amber-300 font-semibold text-sm">{formatarMoeda(faltaMeta)}</p>
                <p className="text-white/40 text-xs">falta para a meta</p>
              </div>
            )}
            {pctMeta != null && pctMeta >= 100 && (
              <div className="flex items-center gap-1 text-emerald-400">
                <Award className="w-5 h-5" />
                <span className="text-sm font-bold">Meta batida!</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <Target className="w-6 h-6 text-white/30 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Meta individual não configurada</p>
          <p className="text-white/25 text-xs mt-1">Peça ao gestor para cadastrar sua meta mensal</p>
        </div>
      )}

      {/* ── Card Meta Quinzenal da Unidade ── */}
      {fatUnidadeQ && (fatUnidadeQ as any).metaQuinzenal != null && (fatUnidadeQ as any).metaQuinzenal > 0 && (() => {
        const mq = (fatUnidadeQ as any).metaQuinzenal as number;
        const pctQ = (fatUnidadeQ as any).pctMetaQuinzenal as number | null;
        const fatQ = pctQ != null ? Math.round((pctQ * mq) / 100 * 100) / 100 : 0;
        const faltaQ = Math.max(0, mq - fatQ);
        const diaHoje = new Date().getDate();
        const naSegundaQ = diaHoje > 15;
        const diasRestantesQ = naSegundaQ ? 0 : 15 - diaHoje;
        const metaDiariaQ = !naSegundaQ && diasRestantesQ > 0 && faltaQ > 0 ? faltaQ / diasRestantesQ : null;
        const nomeUnidade = empresaSlugUnidade === 'barbiero-mascote' ? 'Mascote' : empresaSlugUnidade === 'barbiero-morumbi' ? 'Morumbi' : 'Unidade';
        return (
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-base">🏅</span>
                <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider">Meta Quinzenal — {nomeUnidade}</h2>
              </div>
              <div className="flex items-center gap-2">
                {naSegundaQ && <span className="text-xs text-white/30">(encerrada)</span>}
                {pctQ != null && (
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    pctQ >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                    pctQ >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>{pctQ}%</span>
                )}
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (pctQ ?? 0) >= 100 ? 'bg-emerald-400' :
                  (pctQ ?? 0) >= 80 ? 'bg-yellow-400' : 'bg-purple-400'
                }`}
                style={{ width: `${Math.min(100, pctQ ?? 0)}%` }}
              />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-purple-200 font-bold text-xl">{fmtMoeda(fatQ)}</p>
                <p className="text-white/40 text-xs">de {fmtMoeda(mq)}</p>
              </div>
              <div className="text-right">
                {pctQ != null && pctQ < 100 ? (
                  <>
                    <p className="text-amber-300 font-semibold text-sm">{fmtMoeda(faltaQ)}</p>
                    <p className="text-white/40 text-xs">falta para a quinzenal</p>
                    {metaDiariaQ != null && (
                      <p className="text-blue-300/70 text-xs mt-0.5">Precisa {fmtMoeda(metaDiariaQ)}/dia ({diasRestantesQ}d)</p>
                    )}
                  </>
                ) : pctQ != null && pctQ >= 100 ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Award className="w-4 h-4" />
                    <span className="text-sm font-bold">Quinzenal batida!</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── KPIs do Mês Atual ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <p className="text-white/50 text-xs">Posição Atual</p>
          </div>
          <p className="text-white font-bold text-2xl">
            {mesAtualData.posicao ? `${mesAtualData.posicao}º` : '—'}
          </p>
          {mesAtualData.totalParticipantes > 0 && (
            <p className="text-white/30 text-xs">de {mesAtualData.totalParticipantes} profissionais</p>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-white/50 text-xs">Ticket Médio</p>
          </div>
          <p className="text-white font-bold text-lg">{formatarMoeda(data.ticketMedio)}</p>
          <p className="text-white/30 text-xs">{mesAtualData.qtdServicos} atend.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-white/50 text-xs">Projeção Final</p>
          </div>
          <p className="text-white font-bold text-lg">{formatarMoeda(data.projecaoFinal)}</p>
          <p className="text-white/30 text-xs">{data.diasRestantes}d restantes</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 text-purple-400" />
            <p className="text-white/50 text-xs">Melhor Posição</p>
          </div>
          <p className="text-white font-bold text-2xl">
            {melhorPosicao ? `${melhorPosicao}º` : '—'}
          </p>
          <p className="text-white/30 text-xs">nos últimos 6 meses</p>
        </div>
      </div>

      {/* ── Card Meta Diária Dinâmica ── */}
      {metaDiaria && metaDiaria.metaMensal && metaDiaria.diasRestantes > 0 && (
        <div className="bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-base">⚡</span>
            <h2 className="text-white/70 text-xs font-semibold uppercase tracking-wider">Meta Diária Necessária</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Precisa por dia</p>
              <p className={`font-bold text-xl ${
                metaDiaria.metaDiariaNecessaria != null && metaDiaria.mediaDiariaAtual >= metaDiaria.metaDiariaNecessaria
                  ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {metaDiaria.metaDiariaNecessaria != null ? formatarMoeda(metaDiaria.metaDiariaNecessaria) : '—'}
              </p>
              <p className="text-white/25 text-xs mt-0.5">{metaDiaria.diasRestantes}d restantes</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Média atual/dia</p>
              <p className="text-blue-300 font-bold text-xl">{formatarMoeda(metaDiaria.mediaDiariaAtual)}</p>
              <p className="text-white/25 text-xs mt-0.5">dia {metaDiaria.diaAtual} de {metaDiaria.diasNoMes}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Projeção final</p>
              <p className={`font-bold text-lg ${
                metaDiaria.pctProjecao != null && metaDiaria.pctProjecao >= 100
                  ? 'text-emerald-300' : metaDiaria.pctProjecao != null && metaDiaria.pctProjecao >= 80
                  ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {formatarMoeda(metaDiaria.projecaoFinal)}
              </p>
              {metaDiaria.pctProjecao != null && (
                <p className="text-white/25 text-xs mt-0.5">{metaDiaria.pctProjecao}% da meta</p>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs mb-1">Ticket médio</p>
              <p className="text-purple-300 font-bold text-lg">{formatarMoeda(metaDiaria.ticketMedio)}</p>
              <p className="text-white/25 text-xs mt-0.5">{metaDiaria.qtdServicos} atend. no mês</p>
            </div>
          </div>
          {metaDiaria.pctProjecao != null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>Tendência do mês</span>
                <span>{metaDiaria.pctProjecao}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    metaDiaria.pctProjecao >= 100 ? 'bg-emerald-400'
                    : metaDiaria.pctProjecao >= 80 ? 'bg-yellow-400'
                    : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, metaDiaria.pctProjecao)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Card Padrão por Dia da Semana ── */}
      {padraoSem && padraoSem.resultado && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400 text-base">📅</span>
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Padrão por Dia da Semana</h2>
          </div>
          <div className="space-y-2">
            {padraoSem.resultado.filter(d => d.ocorrencias > 0).map(d => {
              const pct = padraoSem.mediaGeral > 0 ? Math.round((d.media / padraoSem.mediaGeral) * 100) : 0;
              const isMelhor = padraoSem.melhorDia?.diaSemana === d.diaSemana;
              const isPior = padraoSem.piorDia?.diaSemana === d.diaSemana;
              return (
                <div key={d.diaSemana} className="flex items-center gap-2">
                  <span className={`text-xs w-14 ${isMelhor ? 'text-emerald-300 font-bold' : isPior ? 'text-red-300' : 'text-white/50'}`}>
                    {d.nome.slice(0, 3)}
                    {isMelhor && ' 🔥'}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isMelhor ? 'bg-emerald-400' : isPior ? 'bg-red-400' : 'bg-blue-400'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className={`text-xs w-16 text-right ${isMelhor ? 'text-emerald-300 font-semibold' : 'text-white/50'}`}>
                    {formatarMoeda(d.media)}
                  </span>
                </div>
              );
            })}
          </div>
          {padraoSem.melhorDia && (
            <p className="text-white/30 text-xs mt-3">
              Seu melhor dia é <span className="text-emerald-300 font-semibold">{padraoSem.melhorDia.nome}</span> com média de {formatarMoeda(padraoSem.melhorDia.media)}
            </p>
          )}
        </div>
      )}

      {/* ── Gráfico de Faturamento (últimos 6 meses) ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Faturamento · Últimos 6 Meses</h2>
        {variacaoMensal != null && (
          <div className={`flex items-center gap-1 mb-3 text-xs font-semibold ${
            variacaoMensal > 0 ? 'text-emerald-400' : variacaoMensal < 0 ? 'text-red-400' : 'text-white/40'
          }`}>
            {variacaoMensal > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : variacaoMensal < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            {variacaoMensal > 0 ? '+' : ''}{variacaoMensal}% vs mês passado
          </div>
        )}
        {/* Gráfico de barras manual (sem dependência externa) */}
        <div className="flex items-end gap-2 h-28">
          {data.historico.map((h, idx) => {
            const isAtual = idx === data.historico.length - 1;
            const pct = maxFat > 0 ? (h.totalGeral / maxFat) * 100 : 0;
            return (
              <div key={`${h.mes}-${h.ano}`} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-white/50 text-[9px] leading-none">
                  {h.totalGeral > 0 ? `R$${Math.round(h.totalGeral / 1000)}k` : ''}
                </p>
                <div className="w-full rounded-t-md transition-all duration-500" style={{
                  height: `${Math.max(pct, h.totalGeral > 0 ? 4 : 0)}%`,
                  background: isAtual
                    ? 'linear-gradient(to top, #3b82f6, #60a5fa)'
                    : 'rgba(255,255,255,0.15)',
                  minHeight: h.totalGeral > 0 ? '4px' : '0',
                }} />
                <p className={`text-[9px] leading-none ${isAtual ? 'text-blue-300 font-bold' : 'text-white/30'}`}>
                  {mesNomes[h.mes - 1]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Evolução de Posição no Ranking ── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">Posição no Ranking · Últimos 6 Meses</h2>
        <div className="space-y-2">
          {[...data.historico].reverse().map((h, idx) => {
            const isAtual = idx === 0;
            const pctPos = h.posicao && h.totalParticipantes > 0
              ? Math.round(((h.totalParticipantes - h.posicao + 1) / h.totalParticipantes) * 100)
              : null;
            return (
              <div key={`${h.mes}-${h.ano}`} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                isAtual ? 'bg-blue-500/15 border border-blue-500/25' : 'bg-white/3'
              }`}>
                <div className="w-12 text-right">
                  <p className={`text-xs font-semibold ${isAtual ? 'text-blue-300' : 'text-white/40'}`}>
                    {mesNomes[h.mes - 1]}/{String(h.ano).slice(2)}
                  </p>
                </div>
                <div className="flex-1">
                  {h.totalGeral > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            pctPos != null && pctPos >= 75 ? 'bg-emerald-400'
                            : pctPos != null && pctPos >= 50 ? 'bg-blue-400'
                            : 'bg-amber-400'
                          }`}
                          style={{ width: `${pctPos ?? 0}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-6 text-right ${
                        h.posicao === 1 ? 'text-amber-400'
                        : h.posicao === 2 ? 'text-slate-300'
                        : h.posicao === 3 ? 'text-amber-600'
                        : 'text-white/60'
                      }`}>
                        {h.posicao ? `${h.posicao}º` : '—'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-white/20 text-xs">Sem dados</p>
                  )}
                </div>
                <div className="w-20 text-right">
                  <p className={`text-xs font-semibold ${isAtual ? 'text-white' : 'text-white/40'}`}>
                    {h.totalGeral > 0 ? formatarMoeda(h.totalGeral) : '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Aba Barbiero Adm (só para gerentes) ──────────────────────────────────────
const UNIDADES_ADM = [
  { slug: null, label: 'Geral' },
  { slug: 'barbiero-mascote', label: 'Mascote' },
  { slug: 'barbiero-morumbi', label: 'Morumbi' },
] as const;

function AbaAdm({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  // Calcular unidades visíveis com base no empresaSlug do gerente
  const unidadesVisiveis = useMemo(() => {
    const todas = [
      { slug: null, label: 'Geral' },
      { slug: 'barbiero-mascote', label: 'Mascote' },
      { slug: 'barbiero-morumbi', label: 'Morumbi' },
    ];
    if (minhaEmpresa === 'barbiero-mascote') {
      return [{ slug: null, label: 'Geral' }, { slug: 'barbiero-mascote', label: 'Mascote' }];
    }
    if (minhaEmpresa === 'barbiero-morumbi') {
      return [{ slug: null, label: 'Geral' }, { slug: 'barbiero-morumbi', label: 'Morumbi' }];
    }
    return todas; // barbiero-grupo vê todas
  }, [minhaEmpresa]);

  const [subAba, setSubAba] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string | null>(null);

  // Datas
  const hoje = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const semanaInicio = useMemo(() => {
    const d = new Date();
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const mesAtual = useMemo(() => new Date().getMonth() + 1, []);
  const anoAtual = useMemo(() => new Date().getFullYear(), []);

  // Queries
  const { data: gerHoje = [], isLoading: loadHoje } = trpc.rankingDiarioGerencia.useQuery(
    { data: hoje },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 }
  );
  const { data: gerSemana = [], isLoading: loadSemana } = trpc.rankingSemanalGerencia.useQuery(
    { dataInicio: semanaInicio, dataFim: hoje },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 }
  );
  const { data: gerMesData, isLoading: loadMes } = trpc.rankingMensalGerencia.useQuery(
    { mes: mesAtual, ano: anoAtual },
    { staleTime: 60_000 }
  );
  const gerMes = (gerMesData as any)?.lista ?? [];

  type GerItem = { id: number; nome: string; apelido: string | null; fotoUrl: string | null; cargo: string | null; empresaSlug: string; totalGeral: number; totalServicos: number; totalProdutos: number; qtdServicos: number; qtdProdutos: number };

  const gerarTextoCompartilhar = (lista: GerItem[], titulo: string, subtitulo: string) => {
    const linhas = [`👔 *${titulo}*`, `📅 ${subtitulo}`, ''];
    lista.forEach((g, i) => {
      const pos = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`;
      const nome = g.apelido || g.nome.split(' ')[0];
      linhas.push(`${pos} *${nome}* — ${formatarMoeda(g.totalGeral)}`);
    });
    linhas.push('', 'performancemeta.sbs');
    return linhas.join('\n');
  };

  const compartilhar = (lista: GerItem[], titulo: string, subtitulo: string) => {
    const texto = gerarTextoCompartilhar(lista, titulo, subtitulo);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const filtrarPorUnidade = (lista: GerItem[]) => {
    if (!unidadeFiltro) return lista;
    return lista.filter((g) => g.empresaSlug === unidadeFiltro);
  };

  const labelUnidade = unidadeFiltro ? (EMPRESA_LABEL[unidadeFiltro] ?? unidadeFiltro) : 'Todas as unidades';

  const renderLista = (listaOriginal: GerItem[], isLoading: boolean, titulo: string, subtitulo: string) => {
    const lista = filtrarPorUnidade(listaOriginal);
    const tituloFiltrado = unidadeFiltro ? `${titulo} — ${labelUnidade}` : titulo;
    return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">Sem dados para este período</div>
      ) : (
        <div className="space-y-2">
          {lista.map((g, i) => {
            const isMe = g.nome === meuNome || g.apelido === meuNome;
            const pos = ['🥇', '🥈', '🥉'][i];
            return (
              <div
                key={g.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                  isMe
                    ? 'bg-purple-500/20 border-purple-500/40'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="w-7 text-center text-base">{pos ?? <span className="text-white/40 text-xs font-bold">{i + 1}º</span>}</div>
                {g.fotoUrl ? (
                  <img src={g.fotoUrl} alt={g.nome} className="w-9 h-9 rounded-full object-cover border border-purple-500/30" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center border border-purple-500/30">
                    <span className="text-sm font-bold text-white">{(g.apelido || g.nome)[0].toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold truncate ${isMe ? 'text-purple-200' : 'text-white'}`}>
                      {g.apelido || g.nome.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-white/30 truncate">{empresaLabel(g.empresaSlug)}</span>
                  </div>
                  <div className="text-xs text-white/40">
                    {g.qtdServicos > 0 && <span>✂️ {g.qtdServicos} serv</span>}
                    {g.qtdServicos > 0 && g.qtdProdutos > 0 && <span className="mx-1">·</span>}
                    {g.qtdProdutos > 0 && <span>🛒 {g.qtdProdutos} prod</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${isMe ? 'text-purple-300' : 'text-emerald-400'}`}>{formatarMoeda(g.totalGeral)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {lista.length > 0 && (
        <button
          onClick={() => compartilhar(lista, tituloFiltrado, subtitulo)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium active:scale-95 transition-transform"
        >
          <MessageCircle className="w-4 h-4" />
          Compartilhar via WhatsApp
        </button>
      )}
    </div>
    );
  };

  const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mesAtual - 1];

  return (
    <div>
      {/* Cabeçalho da aba */}
      <div className="mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Award className="w-5 h-5 text-purple-400" />
          <h2 className="text-white font-bold text-base">Barbiero Adm</h2>
        </div>
        <p className="text-white/40 text-xs">Ranking exclusivo da gerência</p>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-1 mb-3">
        {([['hoje', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubAba(id)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              subAba === id ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 text-white/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtro por unidade */}
      <div className="flex gap-1 mb-4">
        {unidadesVisiveis.map((u) => (
          <button
            key={u.slug ?? 'geral'}
            onClick={() => setUnidadeFiltro(u.slug)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
              unidadeFiltro === u.slug
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>

      {subAba === 'hoje' && renderLista(gerHoje as GerItem[], loadHoje, 'Ranking Gerência — Hoje', new Date().toLocaleDateString('pt-BR'))}
      {subAba === 'semana' && renderLista(gerSemana as GerItem[], loadSemana, 'Ranking Gerência — Semana', `Semana de ${new Date(semanaInicio + 'T12:00:00').toLocaleDateString('pt-BR')}`)}
      {subAba === 'mes' && renderLista(gerMes as GerItem[], loadMes, `Ranking Gerência — ${nomeMes}`, `${nomeMes} ${anoAtual}`)}
    </div>
  );
}

// ─── Aba Análise da Gerência ─────────────────────────────────────────────────
function AbaAnaliseGerencia({ minhaEmpresa }: { minhaEmpresa: string }) {
  const isGrupo = minhaEmpresa === 'barbiero-grupo';
  const { mes, ano } = mesAtual();
  const dataHoje = hoje();

  // Filtro de unidade: null = Geral, 'barbiero-mascote' = Mascote, 'barbiero-morumbi' = Morumbi
  const [unidadeAnalise, setUnidadeAnalise] = useState<string | null>(null);

  // Dados do ranking mensal (todos os profissionais)
  const empresaParaAlertas = minhaEmpresa === 'barbiero-grupo' ? 'barbiero-morumbi' : minhaEmpresa;
  const [unidadeAlertas, setUnidadeAlertas] = React.useState<string>(empresaParaAlertas);
  const [abaGerencia, setAbaGerencia] = React.useState<'analise' | 'whatsapp' | 'semanal'>('analise');
  const [appUrlBase] = React.useState(() => typeof window !== 'undefined' ? window.location.origin : 'https://barbiero.manus.space');
  const { data: mensagensWpp, isLoading: loadWpp, refetch: refetchWpp } = trpc.performance.mensagensRankingWhatsApp.useQuery(
    { appUrl: `${appUrlBase}/pro` },
    { staleTime: 10 * 60_000, enabled: abaGerencia === 'whatsapp' }
  );
  const { data: rankingSem, isLoading: loadSem } = trpc.performance.rankingSemanal.useQuery(
    {},
    { staleTime: 30 * 60_000, enabled: abaGerencia === 'semanal' }
  );
  const { data: alertas } = trpc.performance.alertasPerformance.useQuery(
    { empresaSlug: unidadeAlertas, mes, ano },
    { staleTime: 5 * 60_000 }
  );
  const { data: rankingMes, isLoading: loadMes } = trpc.rankingMensal.useQuery(
    { mes, ano },
    { staleTime: 5 * 60_000 }
  );
  // Dados do ranking diário (hoje)
  const { data: rankingDia, isLoading: loadDia } = trpc.rankingDiario.useQuery(
    { data: dataHoje },
    { staleTime: 5 * 60_000 }
  );

  const lista = rankingMes?.lista ?? [];
  // rankingDiario retorna array diretamente (não {lista})
  const listaDia = Array.isArray(rankingDia) ? rankingDia : [];

  // Filtrar por unidade
  // Para gerentes do grupo: usa o filtro selecionado (null = todos)
  // Para gerentes de unidade: usa sempre a própria unidade
  const filtroEfetivo = isGrupo ? unidadeAnalise : minhaEmpresa;
  const listaFiltrada = filtroEfetivo
    ? lista.filter(p => p.empresaSlug === filtroEfetivo || p.empresaSlug === filtroEfetivo.toUpperCase().replace('barbiero-', ''))
    : lista;
  const listaDiaFiltrada = filtroEfetivo
    ? listaDia.filter((p: any) => p.empresaSlug === filtroEfetivo || p.empresaSlug === filtroEfetivo.toUpperCase().replace('barbiero-', ''))
    : listaDia;

  // Calcular insights
  const comMeta = listaFiltrada.filter(p => p.metaMensal != null && p.metaMensal > 0);
  const acimaMeta = comMeta.filter(p => (p.pctMeta ?? 0) >= 100);
  const noRitmo = comMeta.filter(p => { const pct = p.pctMeta ?? 0; return pct >= 70 && pct < 100; });
  const abaixoMeta = comMeta.filter(p => (p.pctMeta ?? 0) < 70);
  const semAtendimentos = listaFiltrada.filter(p => !p.temDados);

  // Top 3 do mês
  const top3 = listaFiltrada.slice(0, 3);
  // Profissionais com maior crescimento hoje (top 3 do dia)
  const top3Dia = listaDiaFiltrada.slice(0, 3);

  // Distribuição por unidade (apenas para grupo)
  const mascote = lista.filter(p => p.empresaSlug === 'barbiero-mascote' || p.empresaSlug === 'MASCOTE');
  const morumbi = lista.filter(p => p.empresaSlug === 'barbiero-morumbi' || p.empresaSlug === 'MORUMBI');

  const isLoading = loadMes || loadDia;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
      </div>
    );
  }

  // Label da unidade selecionada para o título
  const labelUnidade = unidadeAnalise ? empresaLabel(unidadeAnalise) : 'Geral (todas as unidades)';

  return (
    <div className="space-y-4 pt-2">
      {/* Título */}
      <div className="text-center mb-2">
        <h2 className="text-white font-bold text-lg">Análise da Equipe</h2>
        <p className="text-white/40 text-xs">{nomeMes(mes)} {ano}</p>
      </div>
      {/* Abas de navegação da gerência */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {([
          { id: 'analise', label: '📊 Análise', icon: null },
          { id: 'whatsapp', label: '💬 WhatsApp', icon: null },
          { id: 'semanal', label: '🏆 Semanal', icon: null },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setAbaGerencia(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              abaGerencia === id
                ? 'bg-blue-500 text-white'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* Conteúdo condicional por aba */}
      {abaGerencia !== 'analise' && abaGerencia !== 'whatsapp' && abaGerencia !== 'semanal' ? null : abaGerencia === 'whatsapp' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-xs">Mensagens personalizadas para envio via WhatsApp</p>
            <button
              onClick={() => refetchWpp()}
              className="text-xs text-blue-400 underline"
            >
              Atualizar
            </button>
          </div>
          {loadWpp ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : mensagensWpp && mensagensWpp.mensagens.length > 0 ? (
            <div className="space-y-2">
              {mensagensWpp.mensagens.map((m: any) => (
                <div key={m.colaboradorId} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white text-sm font-semibold">{m.apelido || m.nome.split(' ')[0]}</span>
                      <span className="text-white/30 text-xs ml-2">{m.posicao}º · {m.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</span>
                    </div>
                    {m.linkWhatsApp && (
                      <a
                        href={m.linkWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Enviar
                      </a>
                    )}
                  </div>
                  <details className="cursor-pointer">
                    <summary className="text-white/30 text-xs">Ver mensagem</summary>
                    <pre className="text-white/60 text-xs mt-2 whitespace-pre-wrap font-sans leading-relaxed bg-white/5 rounded-lg p-2">{m.mensagem}</pre>
                  </details>
                </div>
              ))}
              <p className="text-white/20 text-xs text-center mt-2">
                {mensagensWpp.totalComTelefone} profissional(is) com telefone cadastrado
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">
              Nenhum profissional com telefone cadastrado
            </div>
          )}
        </div>
      ) : abaGerencia === 'semanal' ? (
        <div className="space-y-3">
          <p className="text-white/40 text-xs">Ranking acumulado do mês atual — atualizado em tempo real</p>
          {loadSem ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : rankingSem && rankingSem.ranking.length > 0 ? (
            <div className="space-y-2">
              {rankingSem.ranking.map((p: any, i: number) => (
                <div key={p.colaboradorId} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                  i === 0 ? 'bg-yellow-500/10 border-yellow-500/20'
                  : i === 1 ? 'bg-slate-400/10 border-slate-400/20'
                  : i === 2 ? 'bg-amber-600/10 border-amber-600/20'
                  : 'bg-white/5 border-white/10'
                }`}>
                  <span className="text-base w-7 text-center">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/40 text-xs font-bold">{i+1}º</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-semibold truncate">{p.apelido || p.nome.split(' ')[0]}</div>
                    <div className="text-white/30 text-xs">{p.qtdServicos} atend.</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${i === 0 ? 'text-yellow-300' : 'text-white'}`}>
                      {p.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/30 text-sm">Sem dados disponíveis</div>
          )}
        </div>
      ) : null}
      {abaGerencia !== 'analise' ? null : <div className="space-y-4">

      {/* Filtro de unidade — apenas para gerentes do grupo */}
      {isGrupo && (
        <div className="flex gap-2 justify-center">
          {[
            { slug: null, label: 'Geral' },
            { slug: 'barbiero-mascote', label: 'Mascote' },
            { slug: 'barbiero-morumbi', label: 'Morumbi' },
          ].map(({ slug, label }) => (
            <button
              key={label}
              onClick={() => setUnidadeAnalise(slug)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                unidadeAnalise === slug
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Cards de resumo expandidos com indicadores visuais */}
      {/* Barra de progresso coletiva */}
      {comMeta.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Progresso da Equipe</span>
            <span className="text-xs text-white/70 font-bold">{comMeta.length} com meta cadastrada</span>
          </div>
          {/* Barra segmentada: verde | amarelo | vermelho */}
          <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
            {acimaMeta.length > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all"
                style={{ width: `${(acimaMeta.length / comMeta.length) * 100}%` }}
                title={`Na meta: ${acimaMeta.length}`}
              />
            )}
            {noRitmo.length > 0 && (
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${(noRitmo.length / comMeta.length) * 100}%` }}
                title={`No ritmo: ${noRitmo.length}`}
              />
            )}
            {abaixoMeta.length > 0 && (
              <div
                className="h-full bg-red-500 rounded-r-full transition-all"
                style={{ width: `${(abaixoMeta.length / comMeta.length) * 100}%` }}
                title={`Atenção: ${abaixoMeta.length}`}
              />
            )}
            {(acimaMeta.length === 0 && noRitmo.length === 0 && abaixoMeta.length === 0) && (
              <div className="h-full bg-white/10 w-full rounded-full" />
            )}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-emerald-400">{Math.round((acimaMeta.length / comMeta.length) * 100)}% na meta</span>
            <span className="text-xs text-white/30">{comMeta.length - acimaMeta.length} faltando</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {/* Card Na meta */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xl font-bold text-emerald-400">{acimaMeta.length}</div>
            {comMeta.length > 0 && (
              <div className="text-xs font-bold text-emerald-300/80 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                {Math.round((acimaMeta.length / comMeta.length) * 100)}%
              </div>
            )}
          </div>
          <div className="text-xs text-emerald-300/70 mb-2">Na meta</div>
          {/* Mini lista de nomes */}
          {acimaMeta.length > 0 ? (
            <div className="space-y-1">
              {acimaMeta.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-white/70 truncate max-w-[60px]">{p.apelido || p.nome.split(' ')[0]}</span>
                  <span className="text-xs font-bold text-emerald-400 flex-shrink-0">{p.pctMeta}%</span>
                </div>
              ))}
              {acimaMeta.length > 3 && (
                <div className="text-xs text-white/30">+{acimaMeta.length - 3} mais</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-white/20 italic">Nenhum ainda</div>
          )}
        </div>

        {/* Card No ritmo */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xl font-bold text-yellow-400">{noRitmo.length}</div>
            {comMeta.length > 0 && (
              <div className="text-xs font-bold text-yellow-300/80 bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
                {Math.round((noRitmo.length / comMeta.length) * 100)}%
              </div>
            )}
          </div>
          <div className="text-xs text-yellow-300/70 mb-2">No ritmo</div>
          {noRitmo.length > 0 ? (
            <div className="space-y-1">
              {noRitmo.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-white/70 truncate max-w-[60px]">{p.apelido || p.nome.split(' ')[0]}</span>
                  <span className="text-xs font-bold text-yellow-400 flex-shrink-0">{p.pctMeta}%</span>
                </div>
              ))}
              {noRitmo.length > 3 && (
                <div className="text-xs text-white/30">+{noRitmo.length - 3} mais</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-white/20 italic">Nenhum</div>
          )}
        </div>

        {/* Card Atenção */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xl font-bold text-red-400">{abaixoMeta.length}</div>
            {comMeta.length > 0 && (
              <div className="text-xs font-bold text-red-300/80 bg-red-500/20 px-1.5 py-0.5 rounded-full">
                {Math.round((abaixoMeta.length / comMeta.length) * 100)}%
              </div>
            )}
          </div>
          <div className="text-xs text-red-300/70 mb-2">Atenção</div>
          {abaixoMeta.length > 0 ? (
            <div className="space-y-1">
              {abaixoMeta.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-white/70 truncate max-w-[60px]">{p.apelido || p.nome.split(' ')[0]}</span>
                  <span className="text-xs font-bold text-red-400 flex-shrink-0">{p.pctMeta}%</span>
                </div>
              ))}
              {abaixoMeta.length > 3 && (
                <div className="text-xs text-white/30">+{abaixoMeta.length - 3} mais</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-white/20 italic">Nenhum</div>
          )}
        </div>
      </div>

      {/* Top 3 do mês */}
      {top3.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-semibold text-sm">Destaques do Mês</span>
          </div>
          <div className="space-y-2">
            {top3.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{["🥇","🥈","🥉"][i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{p.apelido || p.nome.split(" ")[0]}</div>
                  <div className="text-white/40 text-xs">{empresaLabel(p.empresaSlug)}</div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-bold">{formatarMoeda(p.totalGeral)}</div>
                  {p.pctMeta != null && (
                    <div className={`text-xs font-semibold ${
                      p.pctMeta >= 100 ? 'text-emerald-400' : p.pctMeta >= 70 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{p.pctMeta}% da meta</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destaque de hoje */}
      {top3Dia.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">Melhor de Hoje</span>
            <span className="text-white/30 text-xs ml-auto">{formatarData(dataHoje)}</span>
          </div>
          <div className="space-y-2">
            {top3Dia.slice(0, 3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{["🥇","🥈","🥉"][i]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{p.apelido || p.nome.split(" ")[0]}</div>
                  <div className="text-white/40 text-xs">{p.qtdServicos ?? 0} serv{(p.qtdProdutos ?? 0) > 0 ? ` · ${p.qtdProdutos} prod` : ''}</div>
                </div>
                <div className="text-white text-sm font-bold">{formatarMoeda(p.totalGeral)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profissionais que precisam de atenção */}
      {abaixoMeta.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-red-400" />
            <span className="text-white font-semibold text-sm">Precisam de Atenção</span>
          </div>
          <div className="space-y-2">
            {abaixoMeta.map((p) => {
              const falta = (p.metaMensal ?? 0) - p.totalGeral;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs font-bold">{(p.apelido || p.nome.split(" ")[0]).charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{p.apelido || p.nome.split(" ")[0]}</div>
                    <div className="text-red-400/70 text-xs">Falta {formatarMoeda(falta)} para a meta</div>
                  </div>
                  <div className="text-red-400 text-sm font-bold">{p.pctMeta}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sem atendimentos hoje */}
      {semAtendimentos.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Minus className="w-4 h-4 text-white/40" />
            <span className="text-white/60 font-semibold text-sm">Sem Atendimentos no Mês</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {semAtendimentos.map((p) => (
              <span key={p.id} className="text-xs bg-white/10 text-white/50 rounded-full px-3 py-1">
                {p.apelido || p.nome.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Painel Semáforo Detalhado (Ferramenta 2) ── */}
      {alertas && alertas.profissionais && alertas.profissionais.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚦</span>
              <span className="text-white font-semibold text-sm">Semáforo de Performance</span>
            </div>
            {/* Seletor de unidade para gerentes do grupo */}
            {minhaEmpresa === 'barbiero-grupo' && (
              <div className="flex gap-1">
                {['barbiero-morumbi', 'barbiero-mascote'].map(slug => (
                  <button
                    key={slug}
                    onClick={() => setUnidadeAlertas(slug)}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                      unidadeAlertas === slug ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {slug === 'barbiero-morumbi' ? 'Morumbi' : 'Mascote'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-white/30 mb-3">
            {alertas.diasRestantes}d restantes · Projeção baseada na média diária atual
          </div>
          <div className="space-y-2">
            {alertas.profissionais.map(p => {
              const cor = p.semaforo === 'verde'
                ? { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', text: 'text-emerald-300' }
                : p.semaforo === 'amarelo'
                ? { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-400', text: 'text-yellow-300' }
                : { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-400', text: 'text-red-300' };
              return (
                <div key={p.id} className={`${cor.bg} border ${cor.border} rounded-xl p-3`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${cor.dot} flex-shrink-0`} />
                    <span className="text-white text-sm font-semibold flex-1 truncate">
                      {p.apelido || p.nome.split(' ')[0]}
                    </span>
                    <span className={`text-xs font-bold ${cor.text}`}>
                      {p.pctProjecao != null ? `${p.pctProjecao}% proj.` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-white/30">Acumulado</p>
                      <p className="text-white font-semibold">{p.totalAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-white/30">Média/dia</p>
                      <p className="text-white font-semibold">{p.mediaDiaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-white/30">Precisa/dia</p>
                      <p className={`font-semibold ${cor.text}`}>
                        {p.metaDiariaNecessaria != null
                          ? p.metaDiariaNecessaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
                          : p.metaMensal ? '✓ Meta ok' : '—'}
                      </p>
                    </div>
                  </div>
                  {/* Mini barra de projeção */}
                  {p.pctProjecao != null && (
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cor.dot}`}
                        style={{ width: `${Math.min(100, p.pctProjecao)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 text-xs text-white/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> ≥90% projeção</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 70–89%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;70%</span>
          </div>
        </div>
      )}

      {/* Distribuição por unidade (apenas para grupo no modo Geral) */}
      {isGrupo && !unidadeAnalise && mascote.length > 0 && morumbi.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">Por Unidade</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-white/50 text-xs mb-1.5">Mascote ({mascote.length} prof.)</div>
              {mascote.slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between items-center py-0.5">
                  <span className="text-white/70 text-xs truncate">{p.apelido || p.nome.split(" ")[0]}</span>
                  <span className="text-white text-xs font-semibold ml-2 flex-shrink-0">{formatarMoeda(p.totalGeral)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-white/50 text-xs mb-1.5">Morumbi ({morumbi.length} prof.)</div>
              {morumbi.slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between items-center py-0.5">
                  <span className="text-white/70 text-xs truncate">{p.apelido || p.nome.split(" ")[0]}</span>
                  <span className="text-white text-xs font-semibold ml-2 flex-shrink-0">{formatarMoeda(p.totalGeral)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ranking completo da unidade filtrada */}
      {isGrupo && unidadeAnalise && listaFiltrada.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-blue-400" />
            <span className="text-white font-semibold text-sm">Ranking — {empresaLabel(unidadeAnalise)}</span>
            <span className="text-white/30 text-xs ml-auto">{listaFiltrada.length} prof.</span>
          </div>
          <div className="space-y-2">
            {listaFiltrada.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-white/40 text-xs w-5 text-right flex-shrink-0">{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{p.apelido || p.nome.split(" ")[0]}</div>
                  {p.pctMeta != null && (
                    <div className={`text-xs font-semibold ${
                      p.pctMeta >= 100 ? 'text-emerald-400' : p.pctMeta >= 70 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{p.pctMeta}% da meta</div>
                  )}
                </div>
                <div className="text-white text-sm font-bold flex-shrink-0">{formatarMoeda(p.totalGeral)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estratégias sugeridas */}
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-white font-semibold text-sm">Estratégias</span>
        </div>
        <div className="space-y-2">
          {abaixoMeta.length > 0 && (
            <div className="flex gap-2">
              <span className="text-blue-400 text-xs mt-0.5">→</span>
              <p className="text-white/60 text-xs">
                <span className="text-white/80 font-medium">{abaixoMeta.length} profissional{abaixoMeta.length > 1 ? 'is' : ''}</span> abaixo de 70% da meta — considere uma conversa individual de acompanhamento.
              </p>
            </div>
          )}
          {acimaMeta.length > 0 && (
            <div className="flex gap-2">
              <span className="text-blue-400 text-xs mt-0.5">→</span>
              <p className="text-white/60 text-xs">
                <span className="text-white/80 font-medium">{acimaMeta.length} profissional{acimaMeta.length > 1 ? 'is' : ''}</span> já atingiu a meta — reconheça o desempenho para manter a motivação.
              </p>
            </div>
          )}
          {semAtendimentos.length > 0 && (
            <div className="flex gap-2">
              <span className="text-blue-400 text-xs mt-0.5">→</span>
              <p className="text-white/60 text-xs">
                <span className="text-white/80 font-medium">{semAtendimentos.length} profissional{semAtendimentos.length > 1 ? 'is' : ''}</span> sem atendimentos no mês — verifique escala ou ausências.
              </p>
            </div>
          )}
          {top3.length > 0 && (
            <div className="flex gap-2">
              <span className="text-blue-400 text-xs mt-0.5">→</span>
              <p className="text-white/60 text-xs">
                Líder do mês: <span className="text-white/80 font-medium">{top3[0].apelido || top3[0].nome.split(" ")[0]}</span> com {formatarMoeda(top3[0].totalGeral)} — use como referência de boas práticas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>}
    </div>
  );
}

// ─── Tela principal do ranking ────────────────────────────────────────────────
function RankingView({ meuNome, minhaEmpresa, meuFotoUrl, meuId, isGerencia, onLogout }: { meuNome: string; minhaEmpresa: string; meuFotoUrl?: string | null; meuId: number; isGerencia?: boolean; onLogout: () => void }) {
  const [aba, setAba] = useState<"diario" | "semanal" | "mensal" | "atendimentos" | "analise" | "desempenho" | "adm">("diario");
  const logoutMut = trpc.logoutProfissional.useMutation({ onSuccess: onLogout });

  // Indicador fixo de faturamento mensal da unidade no header
  const mesHdr = new Date().getMonth() + 1;
  const anoHdr = new Date().getFullYear();
  const { data: fatHdr } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: minhaEmpresa, tipo: 'mensal', mes: mesHdr, ano: anoHdr },
    { refetchInterval: 5 * 60 * 1000, staleTime: 4 * 60 * 1000 }
  );
  const pctHdr = (fatHdr as any)?.pctMeta as number | null | undefined;
  const corBarraHdr = pctHdr == null ? 'bg-blue-400'
    : pctHdr >= 100 ? 'bg-emerald-400'
    : pctHdr >= 80  ? 'bg-yellow-400'
    : 'bg-blue-400';

  const abas = [
    { id: "diario" as const, label: "Hoje", icon: Calendar },
    { id: "semanal" as const, label: "Semana", icon: TrendingUp },
    { id: "mensal" as const, label: "Mês", icon: Trophy },
    // Abas de atendimento individual: apenas para não-gerentes
    ...(!isGerencia ? [
      { id: "atendimentos" as const, label: "Meus", icon: Scissors },
      { id: "analise" as const, label: "Análise", icon: BarChart2 },
      { id: "desempenho" as const, label: "Meu", icon: Star },
    ] : [
      { id: "analise" as const, label: "Análise", icon: BarChart2 },
    ]),
    ...(isGerencia ? [{ id: "adm" as const, label: "Adm", icon: Award }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
        {/* Linha principal: avatar + nome + botão sair */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar com anel de destaque */}
            <div className="relative flex-shrink-0">
              {meuFotoUrl ? (
                <img
                  src={meuFotoUrl}
                  alt={meuNome}
                  className="w-11 h-11 rounded-full object-cover border-2 border-blue-400 shadow-lg shadow-blue-500/30"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-blue-400 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{(meuNome || "?")[0].toUpperCase()}</span>
                </div>
              )}
              {/* Indicador online */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-base leading-tight">{meuNome.split(" ")[0]}</h1>
                {isGerencia && (
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Gerência
                  </span>
                )}
              </div>
              <p className="text-blue-400/70 text-xs">{empresaLabel(minhaEmpresa)}</p>
            </div>
          </div>
          <button
            onClick={() => logoutMut.mutate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
        {/* Indicador fixo de faturamento mensal da unidade */}
        {fatHdr && fatHdr.total > 0 && (
          <div className="px-4 pb-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">Unidade · {nomeMes(mesHdr)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">{formatarMoeda(fatHdr.total)}</span>
                {pctHdr != null && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    pctHdr >= 100 ? 'bg-emerald-500/20 text-emerald-300'
                    : pctHdr >= 80 ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-blue-500/20 text-blue-300'
                  }`}>{pctHdr}%</span>
                )}
              </div>
            </div>
            {/* Mini barra de progresso */}
            {(fatHdr as any).metaMensal && (
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${corBarraHdr}`}
                  style={{ width: `${Math.min(100, pctHdr ?? 0)}%`, transition: 'width 0.6s ease' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Abas - scroll horizontal no mobile */}
      <div className="overflow-x-auto scrollbar-none px-4 pt-4 pb-2">
        <div className="flex gap-1.5 min-w-max">
          {abas.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`
                flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap
                ${aba === id
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/5 text-white/50 hover:bg-white/10"}
              `}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 pb-8 pt-2">
        {aba === "diario" && <AbaDiario meuNome={meuNome} minhaEmpresa={minhaEmpresa} isGerencia={isGerencia} />}
        {aba === "semanal" && <AbaSemanal meuNome={meuNome} minhaEmpresa={minhaEmpresa} isGerencia={isGerencia} />}
        {aba === "mensal" && <AbaMensal meuNome={meuNome} minhaEmpresa={minhaEmpresa} isGerencia={isGerencia} />}
        {aba === "atendimentos" && <AbaAtendimentos meuNome={meuNome} />}
        {aba === "analise" && (isGerencia ? <AbaAnaliseGerencia minhaEmpresa={minhaEmpresa} /> : <AbaAnalise profissionalId={meuId} />)}
        {aba === "desempenho" && <AbaDesempenho profissionalId={meuId} />}
        {aba === "adm" && isGerencia && <AbaAdm meuNome={meuNome} minhaEmpresa={minhaEmpresa} />}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RankingProfissional() {
  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [minhaEmpresa, setMinhaEmpresa] = useState<string>("barbiero-grupo");
  const [meuFotoUrl, setMeuFotoUrl] = useState<string | null>(null);
  const [meuId, setMeuId] = useState<number>(0);
  const [isGerencia, setIsGerencia] = useState<boolean>(false);
  const { data: sessao, isLoading } = trpc.meProfissional.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (sessao?.nome) {
      setMeuNome(sessao.nome);
      setMinhaEmpresa(sessao.empresaSlug ?? "barbiero-grupo");
      setMeuFotoUrl(sessao.fotoUrl ?? null);
      setMeuId(sessao.profissionalId ?? 0);
      setIsGerencia((sessao as any).isGerencia === true);
    }
  }, [sessao]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!meuNome) {
    return (
      <LoginPIN
        onLogin={(nome, empresaSlug, fotoUrl, id, _apelido, gerencia) => {
          setMeuNome(nome);
          setMinhaEmpresa(empresaSlug);
          setMeuFotoUrl(fotoUrl);
          setMeuId(id);
          setIsGerencia(gerencia ?? false);
        }}
      />
    );
  }

  return (
    <RankingView
      meuNome={meuNome}
      minhaEmpresa={minhaEmpresa}
      meuFotoUrl={meuFotoUrl}
      meuId={meuId}
      isGerencia={isGerencia}
      onLogout={() => {
        setMeuNome(null);
        setMinhaEmpresa("barbiero-grupo");
        setMeuFotoUrl(null);
        setMeuId(0);
        setIsGerencia(false);
      }}
    />
  );
}
