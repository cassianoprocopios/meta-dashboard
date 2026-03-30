import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { QRCodeCanvas } from "qrcode.react";
import {
  Smartphone,
  Copy,
  Check,
  ChevronLeft,
  Search,
  QrCode,
  User,
  Building2,
  Key,
  ExternalLink,
  Info,
  Download,
  X,
  Share2,
  MessageCircle,
  Phone,
  Pencil,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const PRO_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/pro`
    : "https://performancemeta.sbs/pro";

const EMPRESA_LABEL: Record<string, string> = {
  MASCOTE: "Barbiero Mascote",
  MORUMBI: "Barbiero Morumbi",
  "barbiero-grupo": "Barbiero Grupo",
};

function empresaLabel(slug: string | null | undefined) {
  if (!slug) return "—";
  return EMPRESA_LABEL[slug] ?? slug;
}

/** Formata número para wa.me (remove tudo que não for dígito, adiciona 55 se não tiver) */
function formatarWhatsApp(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={`Copiar ${label ?? text}`}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      <span>{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

type Profissional = {
  id: number;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  empresaSlug: string | null;
  pinAcesso: string | null;
  telefone: string | null;
  exibirNoRanking: boolean;
};

// ─── Modal QR Code ────────────────────────────────────────────────────────────
function QRModal({
  profissional,
  onClose,
}: {
  profissional: Profissional;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const nome = profissional.apelido ?? profissional.nome;
  const empresa = empresaLabel(profissional.empresaSlug);
  const qrValue = PRO_URL;

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) { toast.error("Não foi possível gerar a imagem."); return; }
    const padding = 32;
    const labelHeight = 72;
    const size = canvas.width;
    const out = document.createElement("canvas");
    out.width = size + padding * 2;
    out.height = size + padding * 2 + labelHeight;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, padding, padding);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(nome, out.width / 2, size + padding + 30);
    ctx.fillStyle = "#6b7280";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`${empresa}  •  PIN: ${profissional.pinAcesso ?? "—"}`, out.width / 2, size + padding + 56);
    const link = document.createElement("a");
    link.download = `qrcode-${nome.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
    toast.success("QR Code baixado!");
  }, [nome, empresa, profissional.pinAcesso]);

  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `qrcode-${nome}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `QR Code — ${nome}` });
      } else {
        await navigator.clipboard.writeText(qrValue);
        toast.success("Link copiado para a área de transferência!");
      }
    });
  }, [nome, qrValue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-violet-400" />
            <span className="font-semibold text-sm text-foreground">QR Code de Acesso</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 py-6 flex flex-col items-center gap-4">
          <div ref={canvasRef} className="bg-white p-4 rounded-2xl shadow-inner">
            <QRCodeCanvas value={qrValue} size={220} level="M" bgColor="#ffffff" fgColor="#111827" includeMargin={false} />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-foreground">{nome}</p>
            <p className="text-xs text-muted-foreground">{empresa}</p>
            {profissional.pinAcesso && (
              <div className="inline-flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5 mt-1">
                <Key className="w-3 h-3 text-violet-400" />
                <span className="font-mono text-sm font-bold tracking-widest text-foreground">{profissional.pinAcesso}</span>
                <CopyButton text={profissional.pinAcesso} label="PIN" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">Escaneie o QR Code para abrir a tela de login. Digite o PIN acima para entrar.</p>
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 bg-muted/20" onClick={handleShare}>
              <Share2 className="w-3.5 h-3.5" />Compartilhar
            </Button>
            <Button size="sm" className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" />Baixar PNG
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Editar Telefone ────────────────────────────────────────────────────
function TelefoneModal({
  profissional,
  onClose,
  onSaved,
}: {
  profissional: Profissional;
  onClose: () => void;
  onSaved: (telefone: string) => void;
}) {
  const nome = profissional.apelido ?? profissional.nome;
  const [tel, setTel] = useState(profissional.telefone ?? "");
  const salvar = trpc.profissionais.salvar.useMutation({
    onSuccess: () => {
      toast.success("Telefone salvo!");
      onSaved(tel);
      onClose();
    },
    onError: () => toast.error("Erro ao salvar telefone."),
  });

  const handleSalvar = () => {
    salvar.mutate({
      id: profissional.id,
      nome: profissional.nome,
      telefone: tel.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm text-foreground">WhatsApp de {nome}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Número do WhatsApp</label>
            <Input
              value={tel}
              onChange={(e) => setTel(e.target.value)}
              placeholder="Ex: 11 99999-9999"
              className="bg-muted/40 border-border/40"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Inclua DDD. O código do país (55) é adicionado automaticamente.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 bg-muted/20" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSalvar} disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Envio em Massa ─────────────────────────────────────────────────────
type ResultadoEnvio = {
  id: number;
  nome: string;
  apelido: string | null;
  telefone: string | null;
  pin: string;
  linkWhatsApp: string | null;
  mensagem: string;
};

function EnvioMassaModal({
  resultados,
  onClose,
}: {
  resultados: ResultadoEnvio[];
  onClose: () => void;
}) {
  const [enviados, setEnviados] = useState<Set<number>>(new Set());
  const comLink = resultados.filter((r) => r.linkWhatsApp);
  const semLink = resultados.filter((r) => !r.linkWhatsApp);

  const handleEnviar = (r: ResultadoEnvio) => {
    if (!r.linkWhatsApp) return;
    window.open(r.linkWhatsApp, "_blank");
    setEnviados((prev) => { const s = new Set(prev); s.add(r.id); return s; });
  };

  const handleEnviarTodos = () => {
    comLink.forEach((r, i) => {
      setTimeout(() => {
        window.open(r.linkWhatsApp!, "_blank");
        setEnviados((prev) => { const s = new Set(prev); s.add(r.id); return s; });
      }, i * 800);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm text-foreground">Enviar PIN via WhatsApp</span>
            <span className="text-xs text-muted-foreground">({comLink.length} com número)</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Botão enviar todos */}
        {comLink.length > 0 && (
          <div className="px-5 py-3 border-b border-border/20 bg-emerald-500/5">
            <Button
              size="sm"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleEnviarTodos}
            >
              <Send className="w-3.5 h-3.5" />
              Abrir todos no WhatsApp ({comLink.length})
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              Abre uma janela do WhatsApp para cada profissional com intervalo de 0,8s
            </p>
          </div>
        )}

        {/* Lista */}
        <div className="max-h-96 overflow-y-auto divide-y divide-border/20">
          {comLink.map((r) => (
            <div key={r.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.apelido ?? r.nome}</p>
                <p className="text-xs text-muted-foreground">{r.telefone}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-sm font-bold text-foreground bg-muted/50 border border-border/40 rounded-lg px-2.5 py-1">{r.pin}</span>
                {enviados.has(r.id) ? (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enviado</span>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                    onClick={() => handleEnviar(r)}
                  >
                    <MessageCircle className="w-3 h-3" />
                    Enviar
                  </Button>
                )}
              </div>
            </div>
          ))}
          {semLink.length > 0 && (
            <div className="px-5 py-3 bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">Sem número cadastrado ({semLink.length})</span>
              </div>
              {semLink.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-1">
                  <span className="text-xs text-muted-foreground">{r.apelido ?? r.nome}</span>
                  <span className="font-mono text-xs text-muted-foreground/60">PIN: {r.pin}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border/20">
          <p className="text-xs text-muted-foreground text-center">
            {enviados.size}/{comLink.length} mensagens abertas
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AcessoProfissionais() {
  const [, setLocation] = useLocation();
  const [busca, setBusca] = useState("");
  const [qrProfissional, setQrProfissional] = useState<Profissional | null>(null);
  const [telProfissional, setTelProfissional] = useState<Profissional | null>(null);
  const [resultadosEnvio, setResultadosEnvio] = useState<ResultadoEnvio[] | null>(null);
  // Estado local de telefones para atualização otimista
  const [telefonesLocais, setTelefonesLocais] = useState<Record<number, string>>({});

  const utils = trpc.useUtils();
  const { data: profissionais, isLoading } = trpc.profissionais.listarParaAcesso.useQuery();

  const gerarLinks = trpc.profissionais.gerarLinksWhatsApp.useMutation({
    onSuccess: (data) => {
      setResultadosEnvio(data.resultados);
      utils.profissionais.listarParaAcesso.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao gerar PINs: " + err.message);
    },
  });

  const filtrados = (profissionais ?? []).filter((p) => {
    const q = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      (p.apelido ?? "").toLowerCase().includes(q) ||
      empresaLabel(p.empresaSlug).toLowerCase().includes(q)
    );
  });

  // Agrupar por empresa
  const porEmpresa = filtrados.reduce<Record<string, typeof filtrados>>((acc, p) => {
    const key = p.empresaSlug ?? "barbiero-grupo";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Obter telefone atual (local ou do banco)
  const getTelefone = (p: Profissional) => telefonesLocais[p.id] ?? p.telefone ?? null;

  // Abrir WhatsApp com mensagem pré-formatada
  const abrirWhatsApp = (p: Profissional) => {
    const tel = getTelefone(p);
    if (!tel) {
      setTelProfissional(p);
      return;
    }
    const nome = p.apelido ?? p.nome;
    const empresa = empresaLabel(p.empresaSlug);
    const mensagem = encodeURIComponent(
      `Olá ${nome}! 👋\n\nSeu acesso ao ranking da ${empresa}:\n\n🔗 Link: ${PRO_URL}\n🔑 PIN: ${p.pinAcesso ?? "—"}\n\nAbra o link no celular, digite o PIN e acompanhe seu desempenho em tempo real! 📊`
    );
    const numero = formatarWhatsApp(tel);
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Modais */}
      {qrProfissional && <QRModal profissional={qrProfissional} onClose={() => setQrProfissional(null)} />}
      {telProfissional && (
        <TelefoneModal
          profissional={telProfissional}
          onClose={() => setTelProfissional(null)}
          onSaved={(tel) => {
            setTelefonesLocais((prev) => ({ ...prev, [telProfissional.id]: tel }));
            utils.profissionais.listarParaAcesso.invalidate();
          }}
        />
      )}
      {resultadosEnvio && (
        <EnvioMassaModal
          resultados={resultadosEnvio}
          onClose={() => setResultadosEnvio(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm text-foreground">Acesso dos Profissionais</h1>
            <p className="text-xs text-muted-foreground">Como acessar o ranking pelo celular</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            onClick={() => gerarLinks.mutate({ appUrl: window.location.origin, apenasComTelefone: false })}
            disabled={gerarLinks.isPending}
          >
            {gerarLinks.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Enviar PINs
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Instruções */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">Como acessar pelo celular</h2>
              <p className="text-xs text-muted-foreground">Passo a passo para os profissionais</p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Abrir o link no celular</p>
                <p className="text-xs text-muted-foreground mt-0.5">Acessar o endereço abaixo no navegador — ou escanear o QR Code individual</p>
                <div className="mt-2 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-xs font-mono text-blue-300 flex-1 truncate">{PRO_URL}</span>
                  <CopyButton text={PRO_URL} label="link" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Digitar o PIN de acesso</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cada profissional tem um PIN único de 4 dígitos. Use <MessageCircle className="w-3 h-3 inline text-emerald-400" /> para enviar via WhatsApp ou <QrCode className="w-3 h-3 inline text-violet-400" /> para gerar o QR Code.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-400">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Adicionar à tela inicial (opcional)</p>
                <p className="text-xs text-muted-foreground mt-0.5">No Chrome: 3 pontos → "Adicionar à tela inicial". No Safari: compartilhar → "Adicionar à tela de início".</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80">
                <span className="font-semibold text-amber-300">Dica:</span> Use o botão <MessageCircle className="w-3 h-3 inline text-emerald-400" /> para enviar o link e PIN diretamente no WhatsApp de cada profissional. Cadastre o número clicando em <Pencil className="w-3 h-3 inline" />.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de PINs */}
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Key className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">PINs de Acesso</h2>
                <p className="text-xs text-muted-foreground">{profissionais?.length ?? 0} profissional(is) ativo(s)</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-xs w-36 bg-muted/40 border-border/40" />
            </div>
          </div>

          {isLoading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {busca ? "Nenhum profissional encontrado." : "Nenhum profissional ativo cadastrado."}
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {Object.entries(porEmpresa).map(([slug, lista]) => (
                <div key={slug}>
                  <div className="px-5 py-2 bg-muted/20 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{empresaLabel(slug)}</span>
                    <span className="text-xs text-muted-foreground/60">({lista.length})</span>
                  </div>
                  {lista.map((p) => {
                    const tel = getTelefone(p);
                    return (
                      <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/10 transition-colors">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt={p.nome} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        {/* Nome */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.apelido ?? p.nome}</p>
                          {p.apelido && <p className="text-xs text-muted-foreground truncate">{p.nome}</p>}
                          {/* Telefone cadastrado */}
                          {tel && (
                            <p className="text-xs text-emerald-400/70 truncate">{tel}</p>
                          )}
                        </div>
                        {/* Ações */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Botão editar telefone — sempre visível */}
                          <button
                            onClick={() => setTelProfissional(p)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                            title="Editar número de WhatsApp"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                          {p.pinAcesso ? (
                            <>
                              <div className="bg-muted/50 border border-border/40 rounded-lg px-2.5 py-1.5">
                                <span className="font-mono text-sm font-bold text-foreground tracking-widest">{p.pinAcesso}</span>
                              </div>
                              <CopyButton text={p.pinAcesso} label="PIN" />

                              {/* Botão WhatsApp */}
                              <button
                                onClick={() => abrirWhatsApp(p)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                                  tel
                                    ? "bg-emerald-500/15 hover:bg-emerald-500/30"
                                    : "bg-muted/30 hover:bg-muted/50"
                                }`}
                                title={tel ? `Enviar via WhatsApp para ${tel}` : "Cadastrar número para enviar via WhatsApp"}
                              >
                                <MessageCircle className={`w-3.5 h-3.5 ${tel ? "text-emerald-400" : "text-muted-foreground"}`} />
                              </button>

                              {/* Botão QR Code */}
                              <button
                                onClick={() => setQrProfissional(p)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/15 hover:bg-violet-500/30 transition-colors"
                                title={`QR Code de ${p.apelido ?? p.nome}`}
                              >
                                <QrCode className="w-3.5 h-3.5 text-violet-400" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Sem PIN</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota de segurança */}
        <div className="flex items-start gap-2 bg-muted/20 border border-border/30 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Os PINs são pessoais e intransferíveis. Para alterar um PIN ou número de WhatsApp, use os botões <Pencil className="w-3 h-3 inline" /> ao lado de cada profissional, ou acesse{" "}
            <button onClick={() => setLocation("/profissionais")} className="text-blue-400 hover:underline">Profissionais</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
