import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Trophy, TrendingUp, Calendar, LogOut, ChevronLeft, ChevronRight, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

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
};
function empresaLabel(slug: string | null | undefined) {
  if (!slug) return "Barbiero";
  return EMPRESA_LABEL[slug] ?? slug;
}

// ─── Tela de Login por PIN ────────────────────────────────────────────────────
function LoginPIN({ onLogin }: { onLogin: (nome: string, empresaSlug: string) => void }) {
  const [pin, setPin] = useState("");
  const loginMut = trpc.loginProfissional.useMutation({
    onSuccess: (data) => {
      onLogin(data.nome, data.empresaSlug);
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
      {/* Indicador PIN */}
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
  totalServicos,
  totalProdutos,
  isMe,
  empresaSlug,
  mostrarEmpresa = false,
}: {
  pos: number;
  nome: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  totalGeral: number;
  totalServicos: number;
  totalProdutos: number;
  isMe: boolean;
  empresaSlug?: string | null;
  mostrarEmpresa?: boolean;
}) {
  const medalha = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
  const nomeExibido = apelido || nome.split(" ")[0];
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-all
        ${isMe
          ? "bg-blue-500/20 border border-blue-500/40 shadow-lg shadow-blue-500/10"
          : "bg-white/5 border border-white/10"}
      `}
    >
      {/* Posição */}
      <div className="w-6 text-center flex-shrink-0">
        {medalha ? (
          <span className="text-lg">{medalha}</span>
        ) : (
          <span className="text-white/40 text-xs font-bold">{pos}º</span>
        )}
      </div>
      {/* Avatar */}
      <Avatar nome={nome} fotoUrl={fotoUrl} isMe={isMe} size={36} />
      {/* Nome */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${isMe ? "text-blue-300" : "text-white"}`}>
          {nomeExibido}
          {isMe && <span className="ml-2 text-xs text-blue-400/70">(você)</span>}
        </div>
        <div className="text-xs text-white/40 flex gap-2 flex-wrap">
          <span>Serv: {formatarMoeda(totalServicos)}</span>
          {totalProdutos > 0 && <span>· Prod: {formatarMoeda(totalProdutos)}</span>}
          {mostrarEmpresa && empresaSlug && (
            <span className="text-blue-300/50">· {empresaLabel(empresaSlug)}</span>
          )}
        </div>
      </div>
      {/* Total */}
      <div className={`text-right flex-shrink-0 font-bold ${isMe ? "text-blue-300" : "text-white"}`}>
        {formatarMoeda(totalGeral)}
      </div>
    </div>
  );
}

// ─── Hook de exportação de imagem ─────────────────────────────────────────────
function useExportarImagem() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);
  const exportar = useCallback(async (nomeArquivo: string) => {
    if (!exportRef.current || exportando) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${nomeArquivo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagem gerada! Pronta para compartilhar.");
    } catch (e) {
      console.error("Erro ao exportar imagem:", e);
      toast.error("Erro ao gerar imagem.");
    } finally {
      setExportando(false);
    }
  }, [exportando]);
  return { exportRef, exportando, exportar };
}

// ─── Elemento de exportação (oculto) ─────────────────────────────────────────
function ExportCard({
  exportRef,
  titulo,
  subtitulo,
  ranking,
  meuNome,
  unidade,
}: {
  exportRef: React.RefObject<HTMLDivElement | null>;
  titulo: string;
  subtitulo: string;
  ranking: Array<{ id: number; nome: string; apelido?: string | null; fotoUrl?: string | null; totalGeral: number; totalServicos: number; totalProdutos: number; empresaSlug?: string | null }>;
  meuNome: string;
  unidade?: string;
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
      {/* Rodapé */}
      <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "10px", color: "#475569" }}>Barbeiros</div>
        <div style={{ fontSize: "10px", color: "#475569" }}>
          Gerado em {new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─── Aba Diário ───────────────────────────────────────────────────────────────
function AbaDiario({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  const [data, setData] = useState(hoje());
  const [verGeral, setVerGeral] = useState(false);
  const { data: ranking, isLoading } = trpc.rankingDiario.useQuery({ data }, { staleTime: 60_000 });
  const { exportRef, exportando, exportar } = useExportarImagem();

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

  // Filtrar por unidade ou mostrar geral
  const rankingFiltrado = useMemo(() => {
    if (!ranking) return [];
    if (verGeral) return ranking;
    return ranking.filter((p) => p.empresaSlug === minhaEmpresa);
  }, [ranking, minhaEmpresa, verGeral]);

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
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setVerGeral(false)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          {empresaLabel(minhaEmpresa)}
        </button>
        <button
          onClick={() => setVerGeral(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          <Globe className="w-3 h-3" />Geral
          {minhaPosicaoGeral && !verGeral && (
            <span className="ml-1 bg-blue-400/20 text-blue-300 text-xs px-1.5 rounded-full">{minhaPosicaoGeral}º</span>
          )}
        </button>
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para este dia</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => (
              <RankingCard
                key={p.id}
                pos={i + 1}
                nome={p.nome}
                apelido={p.apelido}
                fotoUrl={p.fotoUrl}
                totalGeral={p.totalGeral}
                totalServicos={p.totalServicos}
                totalProdutos={p.totalProdutos}
                isMe={p.nome === meuNome || p.apelido === meuNome}
                empresaSlug={p.empresaSlug}
                mostrarEmpresa={verGeral}
              />
            ))}
          </div>
          {/* Botão exportar */}
          <button
            onClick={() => exportar(`ranking-diario-${data}`)}
            disabled={exportando}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? "Gerando imagem..." : "Exportar para WhatsApp"}
          </button>
        </>
      )}

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking — ${subtitulo}`}
          subtitulo={`Faturamento de ${formatarData(data)}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(minhaEmpresa)}
        />
      )}
    </div>
  );
}

// ─── Aba Semanal ──────────────────────────────────────────────────────────────
function AbaSemanal({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [verGeral, setVerGeral] = useState(false);
  const { exportRef, exportando, exportar } = useExportarImagem();
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

  const { data: ranking, isLoading } = trpc.rankingSemanal.useQuery(
    { dataInicio, dataFim },
    { staleTime: 60_000 }
  );

  const ehSemanaAtual = semanaOffset === 0;
  const labelSemana = `${formatarData(dataInicio)} – ${formatarData(dataFim)}`;

  const rankingFiltrado = useMemo(() => {
    if (!ranking) return [];
    if (verGeral) return ranking;
    return ranking.filter((p) => p.empresaSlug === minhaEmpresa);
  }, [ranking, minhaEmpresa, verGeral]);

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
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setVerGeral(false)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          {empresaLabel(minhaEmpresa)}
        </button>
        <button
          onClick={() => setVerGeral(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          <Globe className="w-3 h-3" />Geral
        </button>
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para esta semana</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => (
              <RankingCard
                key={p.id}
                pos={i + 1}
                nome={p.nome}
                apelido={p.apelido}
                fotoUrl={p.fotoUrl}
                totalGeral={p.totalGeral}
                totalServicos={p.totalServicos}
                totalProdutos={p.totalProdutos}
                isMe={p.nome === meuNome || p.apelido === meuNome}
                empresaSlug={p.empresaSlug}
                mostrarEmpresa={verGeral}
              />
            ))}
          </div>
          {/* Botão exportar */}
          <button
            onClick={() => exportar(`ranking-semanal-${dataInicio}`)}
            disabled={exportando}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? "Gerando imagem..." : "Exportar para WhatsApp"}
          </button>
        </>
      )}

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking Semanal`}
          subtitulo={`Semana de ${labelSemana}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(minhaEmpresa)}
        />
      )}
    </div>
  );
}

// ─── Aba Mensal ───────────────────────────────────────────────────────────────
function AbaMensal({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  const [mesOffset, setMesOffset] = useState(0);
  const [verGeral, setVerGeral] = useState(false);
  const { exportRef, exportando, exportar } = useExportarImagem();

  const { mes, ano } = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + mesOffset);
    return { mes: d.getMonth() + 1, ano: d.getFullYear() };
  }, [mesOffset]);

  const { data: rankingData, isLoading } = trpc.rankingMensal.useQuery({ mes, ano }, { staleTime: 60_000 });
  const rankingTodos = rankingData?.lista ?? [];
  const ehMesAtual = mesOffset === 0;

  const rankingFiltrado = useMemo(() => {
    if (verGeral) return rankingTodos;
    return rankingTodos.filter((p) => p.empresaSlug === minhaEmpresa);
  }, [rankingTodos, minhaEmpresa, verGeral]);

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
      <div className="flex gap-1 mb-4 bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setVerGeral(false)}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          {empresaLabel(minhaEmpresa)}
        </button>
        <button
          onClick={() => setVerGeral(true)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${verGeral ? "bg-blue-500 text-white shadow" : "text-white/50 hover:text-white/80"}`}
        >
          <Globe className="w-3 h-3" />Geral
        </button>
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : rankingFiltrado.length === 0 ? (
        <div className="text-center py-8 text-white/40">Nenhum dado para este mês</div>
      ) : (
        <>
          <div className="space-y-2">
            {rankingFiltrado.map((p, i) => (
              <RankingCard
                key={p.id}
                pos={i + 1}
                nome={p.nome}
                apelido={p.apelido}
                fotoUrl={p.fotoUrl}
                totalGeral={p.totalGeral}
                totalServicos={p.totalServicos}
                totalProdutos={p.totalProdutos}
                isMe={p.nome === meuNome || p.apelido === meuNome}
                empresaSlug={p.empresaSlug}
                mostrarEmpresa={verGeral}
              />
            ))}
          </div>
          {/* Botão exportar */}
          <button
            onClick={() => exportar(`ranking-${nomeMes(mes).toLowerCase()}-${ano}`)}
            disabled={exportando}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? "Gerando imagem..." : "Exportar para WhatsApp"}
          </button>
        </>
      )}

      {/* Elemento oculto para exportação */}
      {rankingFiltrado.length > 0 && (
        <ExportCard
          exportRef={exportRef}
          titulo={`Ranking — ${nomeMes(mes)}`}
          subtitulo={`Faturamento de ${nomeMes(mes)} de ${ano}`}
          ranking={rankingFiltrado}
          meuNome={meuNome}
          unidade={verGeral ? "Todas as unidades" : empresaLabel(minhaEmpresa)}
        />
      )}
    </div>
  );
}

// ─── Tela principal do ranking ────────────────────────────────────────────────
function RankingView({ meuNome, minhaEmpresa, onLogout }: { meuNome: string; minhaEmpresa: string; onLogout: () => void }) {
  const [aba, setAba] = useState<"diario" | "semanal" | "mensal">("diario");
  const logoutMut = trpc.logoutProfissional.useMutation({ onSuccess: onLogout });

  const abas = [
    { id: "diario" as const, label: "Hoje", icon: Calendar },
    { id: "semanal" as const, label: "Semana", icon: TrendingUp },
    { id: "mensal" as const, label: "Mês", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">Ranking</h1>
          <p className="text-white/40 text-xs">
            {meuNome.split(" ")[0]} · <span className="text-blue-400/70">{empresaLabel(minhaEmpresa)}</span>
          </p>
        </div>
        <button
          onClick={() => logoutMut.mutate()}
          className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {abas.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all
              ${aba === id
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-white/5 text-white/50 hover:bg-white/10"}
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="px-4 pb-8 pt-2">
        {aba === "diario" && <AbaDiario meuNome={meuNome} minhaEmpresa={minhaEmpresa} />}
        {aba === "semanal" && <AbaSemanal meuNome={meuNome} minhaEmpresa={minhaEmpresa} />}
        {aba === "mensal" && <AbaMensal meuNome={meuNome} minhaEmpresa={minhaEmpresa} />}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RankingProfissional() {
  const [meuNome, setMeuNome] = useState<string | null>(null);
  const [minhaEmpresa, setMinhaEmpresa] = useState<string>("barbiero-grupo");
  const { data: sessao, isLoading } = trpc.meProfissional.useQuery(undefined, {
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (sessao?.nome) {
      setMeuNome(sessao.nome);
      setMinhaEmpresa(sessao.empresaSlug ?? "barbiero-grupo");
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
        onLogin={(nome, empresaSlug) => {
          setMeuNome(nome);
          setMinhaEmpresa(empresaSlug);
        }}
      />
    );
  }

  return (
    <RankingView
      meuNome={meuNome}
      minhaEmpresa={minhaEmpresa}
      onLogout={() => {
        setMeuNome(null);
        setMinhaEmpresa("barbiero-grupo");
      }}
    />
  );
}
