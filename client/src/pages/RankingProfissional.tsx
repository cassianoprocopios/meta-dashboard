import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Trophy, TrendingUp, Calendar, LogOut, ChevronLeft, ChevronRight, Download, Globe, TrendingDown, Minus, Scissors, ShoppingBag, BarChart2 } from "lucide-react";
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
  "barbiero-morumbi": "Barbiero Morumbi",
  "barbiero-mascote": "Barbiero Mascote",
};
function empresaLabel(slug: string | null | undefined) {
  if (!slug) return "Barbiero";
  return EMPRESA_LABEL[slug] ?? slug;
}

// ─── Tela de Login por PIN ────────────────────────────────────────────────────
function LoginPIN({ onLogin }: { onLogin: (nome: string, empresaSlug: string, fotoUrl: string | null, id: number, apelido: string | null) => void }) {
  const [pin, setPin] = useState("");
  const [loginOk, setLoginOk] = useState<{ nome: string; fotoUrl: string | null; apelido: string | null } | null>(null);
  const loginMut = trpc.loginProfissional.useMutation({
    onSuccess: (data) => {
      const nomeExibido = data.apelido || data.nome.split(" ")[0];
      setLoginOk({ nome: nomeExibido, fotoUrl: data.fotoUrl, apelido: data.apelido });
      // Pequeno delay para mostrar a tela de boas-vindas antes de navegar
      setTimeout(() => {
        onLogin(data.nome, data.empresaSlug, data.fotoUrl, data.id, data.apelido);
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
  qtdServicos = 0,
  qtdProdutos = 0,
  pctMeta,
  metaMensal,
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
  totalServicos: number;
  totalProdutos: number;
  qtdServicos?: number;
  qtdProdutos?: number;
  pctMeta?: number | null;
  metaMensal?: number | null;
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

// ─── Aba Diário ────────────────────────────────────────────────────────────────────────────────
function AbaDiario({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  const [data, setData] = useState(hoje());
  const [verGeral, setVerGeral] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
  const { data: ranking, isLoading } = trpc.rankingDiario.useQuery({ data }, { staleTime: 60_000, refetchInterval: 20 * 60 * 1000 });
  // Ranking do dia anterior para calcular variação de posição
  const dataAnterior = useMemo(() => subtrairDia(data, 1), [data]);
  const { data: rankingAnterior } = trpc.rankingDiario.useQuery(
    { data: dataAnterior },
    { staleTime: 5 * 60_000, enabled: true }
  );
  const posMapAnterior = useMemo(() => buildPosMap(rankingAnterior ?? []), [rankingAnterior]);
  const { exportRef, exportando, exportar } = useExportarImagem();
  // Faturamento da unidade do dia
  const { data: fatUnidade } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: minhaEmpresa, tipo: 'diario', data },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
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
    let lista = verGeral ? ranking : ranking.filter((p) => p.empresaSlug === minhaEmpresa);
    if (filtroCategoria !== 'todos') {
      lista = lista.filter((p) => (p as any).categoriaRanking === filtroCategoria);
    }
    return lista;
  }, [ranking, minhaEmpresa, verGeral, filtroCategoria]);

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

      {/* Card de faturamento da unidade */}
      {!verGeral && fatUnidade && fatUnidade.total > 0 && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Faturamento da Unidade</div>
            {(fatUnidade as any).pctMeta != null && (
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (fatUnidade as any).pctMeta >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
                (fatUnidade as any).pctMeta >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>{(fatUnidade as any).pctMeta}%</div>
            )}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xl font-bold text-emerald-400">{formatarMoeda(fatUnidade.total)}</div>
              {(fatUnidade as any).metaMensal && (
                <div className="text-xs text-white/40 mt-0.5">Meta: {formatarMoeda((fatUnidade as any).metaMensal)}</div>
              )}
            </div>
            <div className="text-right">
              {fatUnidade.recorrencia > 0 && (
                <div className="text-xs text-white/30">incl. {formatarMoeda(fatUnidade.recorrencia)} recorr.</div>
              )}
            </div>
          </div>
          {(fatUnidade as any).metaMensal && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (fatUnidade as any).pctMeta >= 100 ? 'bg-emerald-400' :
                    (fatUnidade as any).pctMeta >= 80 ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, (fatUnidade as any).pctMeta ?? 0)}%` }}
                />
              </div>
              {(fatUnidade as any).superMeta && (fatUnidade as any).superMeta > 0 && (
                <div className="text-xs text-white/30 mt-0.5 text-right">Super: {formatarMoeda((fatUnidade as any).superMeta)}</div>
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
                <>
                  <RankingCard
                    key={p.id}
                    pos={i + 1}
                    nome={p.nome}
                    apelido={p.apelido}
                    fotoUrl={p.fotoUrl}
                    totalGeral={p.totalGeral}
                    totalServicos={p.totalServicos}
                    totalProdutos={p.totalProdutos}
                    qtdServicos={(p as any).qtdServicos ?? 0}
                    qtdProdutos={(p as any).qtdProdutos ?? 0}
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
                </>
              );
            })}
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

// ─── Aba Semanal ────────────────────────────────────────────────────────────────────────────────
function AbaSemanal({ meuNome, minhaEmpresa }: { meuNome: string; minhaEmpresa: string }) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [verGeral, setVerGeral] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
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
  // Faturamento da unidade da semana
  const { data: fatUnidadeSem } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: minhaEmpresa, tipo: 'semanal', dataInicio, dataFim },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
  );

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
      <div className="flex gap-1 mb-3 bg-white/5 rounded-xl p-1">
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
            <div className="text-xs text-white/30">Esta semana</div>
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
                <>
                  <RankingCard
                    key={p.id}
                    pos={i + 1}
                    nome={p.nome}
                    apelido={p.apelido}
                    fotoUrl={p.fotoUrl}
                    totalGeral={p.totalGeral}
                    totalServicos={p.totalServicos}
                    totalProdutos={p.totalProdutos}
                    qtdServicos={(p as any).qtdServicos ?? 0}
                    qtdProdutos={(p as any).qtdProdutos ?? 0}
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
                </>
              );
            })}
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
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'barbeiro' | 'auxiliar' | 'recepcao'>('todos');
  const { exportRef, exportando, exportar } = useExportarImagem();

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
  // Faturamento da unidade do mês
  const { data: fatUnidadeMes } = trpc.faturamentoUnidade.useQuery(
    { empresaSlug: minhaEmpresa, tipo: 'mensal', mes, ano },
    { staleTime: 60_000, refetchInterval: 20 * 60 * 1000, enabled: !verGeral }
  );

  const rankingFiltrado = useMemo(() => {
    let lista = verGeral ? rankingTodos : rankingTodos.filter((p) => p.empresaSlug === minhaEmpresa);
    if (filtroCategoria !== 'todos') {
      lista = lista.filter((p) => (p as any).categoriaRanking === filtroCategoria);
    }
    return lista;
  }, [rankingTodos, minhaEmpresa, verGeral, filtroCategoria]);

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
      {!verGeral && fatUnidadeMes && fatUnidadeMes.total > 0 && (
        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-white/50 uppercase tracking-wider font-semibold">Faturamento da Unidade</div>
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
              {fatUnidadeMes.recorrencia > 0 && (
                <div className="text-xs text-white/30">incl. {formatarMoeda(fatUnidadeMes.recorrencia)} recorr.</div>
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
                    totalServicos={p.totalServicos}
                    totalProdutos={p.totalProdutos}
                    qtdServicos={(p as any).qtdServicos ?? 0}
                    qtdProdutos={(p as any).qtdProdutos ?? 0}
                    pctMeta={p.pctMeta}
                    metaMensal={p.metaMensal}
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

// ─── Tela principal do ranking ────────────────────────────────────────────────
function RankingView({ meuNome, minhaEmpresa, meuFotoUrl, meuId, onLogout }: { meuNome: string; minhaEmpresa: string; meuFotoUrl?: string | null; meuId: number; onLogout: () => void }) {
  const [aba, setAba] = useState<"diario" | "semanal" | "mensal" | "atendimentos" | "analise">("diario");
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
    { id: "atendimentos" as const, label: "Meus", icon: Scissors },
    { id: "analise" as const, label: "Análise", icon: BarChart2 },
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
              <h1 className="text-white font-bold text-base leading-tight">{meuNome.split(" ")[0]}</h1>
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
        {aba === "atendimentos" && <AbaAtendimentos meuNome={meuNome} />}
        {aba === "analise" && <AbaAnalise profissionalId={meuId} />}
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
        onLogin={(nome, empresaSlug, fotoUrl, id, _apelido) => {
          setMeuNome(nome);
          setMinhaEmpresa(empresaSlug);
          setMeuFotoUrl(fotoUrl);
          setMeuId(id);
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
      onLogout={() => {
        setMeuNome(null);
        setMinhaEmpresa("barbiero-grupo");
        setMeuFotoUrl(null);
        setMeuId(0);
      }}
    />
  );
}
