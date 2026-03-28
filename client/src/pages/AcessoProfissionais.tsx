import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
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
} from "lucide-react";
import { toast } from "sonner";

const PRO_URL = typeof window !== "undefined"
  ? `${window.location.origin}/pro`
  : "https://performancemeta.sbs/pro";

const EMPRESA_LABEL: Record<string, string> = {
  "MASCOTE": "Barbiero Mascote",
  "MORUMBI": "Barbiero Morumbi",
  "barbiero-grupo": "Barbiero Grupo",
};

function empresaLabel(slug: string | null | undefined) {
  if (!slug) return "—";
  return EMPRESA_LABEL[slug] ?? slug;
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
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

export default function AcessoProfissionais() {
  const [, setLocation] = useLocation();
  const [busca, setBusca] = useState("");

  const { data: profissionais, isLoading } = trpc.profissionais.listarParaAcesso.useQuery();

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm text-foreground">Acesso dos Profissionais</h1>
            <p className="text-xs text-muted-foreground">Como acessar o ranking pelo celular</p>
          </div>
          <Smartphone className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Instruções de acesso */}
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
            {/* Passo 1 */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Abrir o link no celular</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acessar o endereço abaixo no navegador do celular (Chrome ou Safari)
                </p>
                <div className="mt-2 flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-xs font-mono text-blue-300 flex-1 truncate">{PRO_URL}</span>
                  <CopyButton text={PRO_URL} label="link" />
                </div>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-400">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Digitar o PIN de acesso</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cada profissional tem um PIN único de 4 dígitos. O PIN está na tabela abaixo.
                </p>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-400">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Adicionar à tela inicial (opcional)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No Chrome: toque nos 3 pontos → "Adicionar à tela inicial". No Safari: toque em compartilhar → "Adicionar à tela de início". O app fica salvo como ícone no celular.
                </p>
              </div>
            </div>

            {/* Dica QR Code */}
            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80">
                <span className="font-semibold text-amber-300">Dica:</span> Você pode gerar um QR Code do link{" "}
                <span className="font-mono">{PRO_URL}</span> e imprimir para colar no espelho de cada cadeira — assim o profissional só escaneia e já abre direto.
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
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="pl-8 h-8 text-xs w-36 bg-muted/40 border-border/40"
              />
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
                  {/* Cabeçalho da empresa */}
                  <div className="px-5 py-2 bg-muted/20 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                      {empresaLabel(slug)}
                    </span>
                    <span className="text-xs text-muted-foreground/60">({lista.length})</span>
                  </div>
                  {/* Profissionais */}
                  {lista.map((p) => (
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
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.apelido ?? p.nome}
                        </p>
                        {p.apelido && (
                          <p className="text-xs text-muted-foreground truncate">{p.nome}</p>
                        )}
                      </div>
                      {/* PIN */}
                      <div className="flex items-center gap-2 shrink-0">
                        {p.pinAcesso ? (
                          <>
                            <div className="bg-muted/50 border border-border/40 rounded-lg px-3 py-1.5">
                              <span className="font-mono text-sm font-bold text-foreground tracking-widest">
                                {p.pinAcesso}
                              </span>
                            </div>
                            <CopyButton text={p.pinAcesso} label="PIN" />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Sem PIN</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota de segurança */}
        <div className="flex items-start gap-2 bg-muted/20 border border-border/30 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Os PINs são pessoais e intransferíveis. Cada profissional vê apenas o seu próprio desempenho e o ranking geral da unidade. Para alterar um PIN, acesse{" "}
            <button
              onClick={() => setLocation("/profissionais")}
              className="text-blue-400 hover:underline"
            >
              Profissionais
            </button>{" "}
            e edite o cadastro.
          </p>
        </div>

      </div>
    </div>
  );
}
