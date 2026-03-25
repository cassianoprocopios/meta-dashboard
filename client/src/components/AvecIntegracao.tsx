/**
 * AvecIntegracao.tsx
 *
 * Componente de configuração da integração com o Avec.
 * Permite ao administrador:
 * 1. Configurar credenciais por empresa (email, senha, salão ID)
 * 2. Configurar cookie de sessão manual (para contornar bloqueio de WAF)
 * 3. Testar a conexão
 * 4. Configurar o mapeamento de categorias Avec → Meta Dashboard
 * 5. Sincronizar dados de um mês específico
 * 6. Configurar agendamento automático
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2, CheckCircle, XCircle, RefreshCw, Settings,
  Zap, Map, Calendar, ChevronDown, ChevronRight,
  Building2, AlertTriangle, Save, Play, Clock, History,
  Cookie, Trash2, ExternalLink, Info, Key
} from "lucide-react";

type Empresa = { id: number; nome: string; slug: string; ativo: number };

interface AvecIntegracaoProps {
  empresas: Empresa[];
}

// Categorias disponíveis no Meta Dashboard
const META_CATEGORIAS = [
  { value: "cat1", label: "Categoria 1" },
  { value: "cat2", label: "Categoria 2" },
  { value: "cat3", label: "Categoria 3" },
  { value: "cat4", label: "Categoria 4" },
  { value: "cat5", label: "Categoria 5" },
  { value: "ignorar", label: "Ignorar (não importar)" },
];

// Categorias padrão do Avec
const AVEC_CATEGORIAS_PADRAO = [
  "Serviços",
  "Produtos",
  "Caixinha",
  "Pacotes",
];

// ─── Painel de Configuração por Empresa ──────────────────────────────────────
function EmpresaConfigPanel({ empresa, categoriasMeta }: {
  empresa: Empresa;
  categoriasMeta: Array<{ numero: number; nome: string }>;
}) {
  const [expandido, setExpandido] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"config" | "cookie" | "mapeamento" | "sincronizar" | "agendamento">("config");

  // Formulário de configuração
  const [avecEmail, setAvecEmail] = useState("");
  const [avecSenha, setAvecSenha] = useState("");
  const [avecSalaoId, setAvecSalaoId] = useState("");
  const [avecSalaoNome, setAvecSalaoNome] = useState("");
  const [testando, setTestando] = useState(false);
  const [conexaoOk, setConexaoOk] = useState<boolean | null>(null);
  const [conexaoMetodo, setConexaoMetodo] = useState<string | null>(null);

  // Cookie de sessão manual
  const [cookieInput, setCookieInput] = useState("");
  const [salvandoCookie, setSalvandoCookie] = useState(false);
  const [removendoCookie, setRemovendoCookie] = useState(false);

  // Sincronização
  const [mesSinc, setMesSinc] = useState(new Date().getMonth() + 1);
  const [anoSinc, setAnoSinc] = useState(new Date().getFullYear());

  // Agendamento
  const [sincAutoAtiva, setSincAutoAtiva] = useState(false);
  const [horarioSinc, setHorarioSinc] = useState("23:00");

  // Mapeamento de categorias
  const [mapeamento, setMapeamento] = useState<Array<{
    avecCategoria: string;
    metaCategoria: string;
  }>>(AVEC_CATEGORIAS_PADRAO.map(cat => ({ avecCategoria: cat, metaCategoria: "ignorar" })));

  const utils = trpc.useUtils();

  // Carregar configuração existente
  const { data: config, isLoading: carregandoConfig } = trpc.avec.getConfig.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido }
  );

  // Sincronizar campos do form quando config carrega
  useEffect(() => {
    if (config) {
      setAvecEmail(config.avecEmail ?? "");
      setAvecSalaoId(config.avecSalaoId ?? "");
      setAvecSalaoNome(config.avecSalaoNome ?? "");
      setSincAutoAtiva(config.sincAutoAtiva === 1);
      setHorarioSinc(config.horarioSinc ?? "23:00");
    }
  }, [config]);

  // Carregar mapeamento existente
  const { data: mapeamentoSalvo } = trpc.avec.listarMapeamento.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido && abaAtiva === "mapeamento" }
  );

  // Sincronizar mapeamento quando carrega
  useEffect(() => {
    if (mapeamentoSalvo && mapeamentoSalvo.length > 0) {
      setMapeamento(mapeamentoSalvo.map((m: { avecCategoria: string; metaCategoria: string }) => ({
        avecCategoria: m.avecCategoria,
        metaCategoria: m.metaCategoria,
      })));
    }
  }, [mapeamentoSalvo]);

  // Carregar logs
  const { data: logs } = trpc.avec.listarLogs.useQuery(
    { empresaSlug: empresa.slug, limit: 10 },
    { enabled: expandido && abaAtiva === "sincronizar" }
  );

  // Mutations
  const salvarConfigMutation = trpc.avec.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração Avec salva com sucesso!");
      utils.avec.getConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const salvarMapeamentoMutation = trpc.avec.salvarMapeamento.useMutation({
    onSuccess: () => toast.success("Mapeamento salvo com sucesso!"),
    onError: (err) => toast.error(`Erro ao salvar mapeamento: ${err.message}`),
  });

  const sincronizarMutation = trpc.avec.sincronizar.useMutation({
    onSuccess: (data) => {
      toast.success(`Sincronização concluída! ${data.diasSincronizados} dias sincronizados.`);
      utils.avec.listarLogs.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(`Erro na sincronização: ${err.message}`),
  });

  const atualizarAgendamentoMutation = trpc.avec.atualizarAgendamento.useMutation({
    onSuccess: () => toast.success("Agendamento atualizado!"),
    onError: (err) => toast.error(`Erro ao atualizar agendamento: ${err.message}`),
  });

  const testarConexaoMutation = trpc.avec.testarConexao.useMutation({
    onSuccess: (data) => {
      setTestando(false);
      if (data.sucesso) {
        setConexaoOk(true);
        setConexaoMetodo(data.metodo ?? null);
        const metodoLabel = data.metodo === "cookie_manual" ? "via cookie manual" : "via login automático";
        toast.success(`Conexão estabelecida com sucesso (${metodoLabel})!`);
      } else {
        setConexaoOk(false);
        setConexaoMetodo(null);
        toast.error(`Falha na conexão: ${data.erro}`);
      }
    },
    onError: (err) => {
      setTestando(false);
      setConexaoOk(false);
      setConexaoMetodo(null);
      toast.error(`Erro ao testar conexão: ${err.message}`);
    },
  });

  const salvarCookieMutation = trpc.avec.salvarCookieSessao.useMutation({
    onSuccess: () => {
      setSalvandoCookie(false);
      toast.success("Cookie de sessão salvo! Tente sincronizar agora.");
      setCookieInput("");
      utils.avec.getConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => {
      setSalvandoCookie(false);
      toast.error(`Erro ao salvar cookie: ${err.message}`);
    },
  });

  const removerCookieMutation = trpc.avec.removerCookieSessao.useMutation({
    onSuccess: () => {
      setRemovendoCookie(false);
      toast.success("Cookie removido.");
      utils.avec.getConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => {
      setRemovendoCookie(false);
      toast.error(`Erro ao remover cookie: ${err.message}`);
    },
  });

  const handleTestarConexao = () => {
    if (!avecEmail || !avecSenha || !avecSalaoId) {
      toast.error("Preencha email, senha e ID do salão antes de testar.");
      return;
    }
    setTestando(true);
    setConexaoOk(null);
    setConexaoMetodo(null);
    // Incluir cookie manual se disponível
    const cookieAtual = config?.avecSessionCookie ?? undefined;
    testarConexaoMutation.mutate({
      avecEmail,
      avecSenha,
      avecSalaoId,
      avecSessionCookie: cookieAtual || undefined,
    });
  };

  const handleSalvarConfig = () => {
    if (!avecEmail || !avecSenha || !avecSalaoId) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    salvarConfigMutation.mutate({
      empresaSlug: empresa.slug,
      avecEmail,
      avecSenha,
      avecSalaoId,
      avecSalaoNome: avecSalaoNome || undefined,
      ativo: 1,
      sincAutoAtiva: sincAutoAtiva ? 1 : 0,
      horarioSinc,
    });
  };

  const handleSalvarMapeamento = () => {
    salvarMapeamentoMutation.mutate({
      empresaSlug: empresa.slug,
      mapeamentos: mapeamento.filter(m => m.metaCategoria !== "ignorar"),
    });
  };

  const handleSincronizar = () => {
    sincronizarMutation.mutate({
      empresaSlug: empresa.slug,
      mes: mesSinc,
      ano: anoSinc,
    });
  };

  const handleSalvarAgendamento = () => {
    atualizarAgendamentoMutation.mutate({
      empresaSlug: empresa.slug,
      sincAutoAtiva,
      horarioSinc,
    });
  };

  const handleSalvarCookie = () => {
    if (!cookieInput.trim()) {
      toast.error("Cole o valor do cookie ci_session antes de salvar.");
      return;
    }
    if (!config) {
      toast.error("Salve as credenciais Avec primeiro.");
      return;
    }
    setSalvandoCookie(true);
    salvarCookieMutation.mutate({
      empresaSlug: empresa.slug,
      avecSessionCookie: cookieInput.trim(),
    });
  };

  const handleRemoverCookie = () => {
    setRemovendoCookie(true);
    removerCookieMutation.mutate({ empresaSlug: empresa.slug });
  };

  const temConfig = !!config;
  const temCookie = !!(config?.avecSessionCookie);

  // Calcular idade do cookie
  const cookieIdade = config?.cookieConfiguradoEm
    ? Math.floor((Date.now() - new Date(config.cookieConfiguradoEm).getTime()) / (1000 * 60 * 60))
    : null;
  const cookieExpirado = cookieIdade !== null && cookieIdade > 48;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Cabeçalho da empresa */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-violet-400" />
          <div className="text-left">
            <div className="font-medium text-foreground">{empresa.nome}</div>
            <div className="text-xs text-muted-foreground">
              {temConfig ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  Configurado — {config?.avecSalaoNome || config?.avecSalaoId}
                  {temCookie && !cookieExpirado && (
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <Cookie className="w-3 h-3" />
                      Cookie ativo
                    </span>
                  )}
                  {temCookie && cookieExpirado && (
                    <span className="flex items-center gap-0.5 text-orange-400">
                      <AlertTriangle className="w-3 h-3" />
                      Cookie pode ter expirado
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  Não configurado
                </span>
              )}
            </div>
          </div>
        </div>
        {expandido ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-border">
          {carregandoConfig ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : (
            <>
              {/* Abas */}
              <div className="flex flex-wrap border-b border-border bg-muted/20">
                {[
                  { id: "config", label: "Credenciais", icon: Settings },
                  { id: "cookie", label: "Cookie Sessão", icon: Cookie, badge: temCookie },
                  { id: "mapeamento", label: "Mapeamento", icon: Map },
                  { id: "sincronizar", label: "Sincronizar", icon: RefreshCw },
                  { id: "agendamento", label: "Agendamento", icon: Clock },
                ].map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => setAbaAtiva(id as typeof abaAtiva)}
                    className={`relative flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                      abaAtiva === id
                        ? "border-b-2 border-violet-500 text-violet-400 bg-violet-500/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {badge && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>

              {/* Aba: Credenciais */}
              {abaAtiva === "config" && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Email Avec *</label>
                      <input
                        type="email"
                        value={avecEmail}
                        onChange={e => setAvecEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Senha Avec *</label>
                      <input
                        type="password"
                        value={avecSenha}
                        onChange={e => setAvecSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">ID do Salão Avec *</label>
                      <input
                        type="text"
                        value={avecSalaoId}
                        onChange={e => setAvecSalaoId(e.target.value)}
                        placeholder="Ex: 95687"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Encontrado na URL do painel Avec: /admin/relatorio/<strong>ID</strong></p>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Nome do Salão (opcional)</label>
                      <input
                        type="text"
                        value={avecSalaoNome}
                        onChange={e => setAvecSalaoNome(e.target.value)}
                        placeholder="Ex: Seraphine Beauty"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Status da conexão */}
                  {conexaoOk !== null && (
                    <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                      conexaoOk ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {conexaoOk ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {conexaoOk
                        ? `Conexão estabelecida! (${conexaoMetodo === "cookie_manual" ? "via cookie manual" : "via login automático"})`
                        : "Falha na conexão. Verifique as credenciais ou configure um cookie de sessão."}
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleTestarConexao}
                      disabled={testando || !avecEmail || !avecSenha || !avecSalaoId}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Testar Conexão
                    </button>
                    <button
                      onClick={handleSalvarConfig}
                      disabled={salvarConfigMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-md hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
                    >
                      {salvarConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Configuração
                    </button>
                  </div>
                </div>
              )}

              {/* Aba: Cookie de Sessão Manual */}
              {abaAtiva === "cookie" && (
                <div className="p-4 space-y-4">
                  {/* Aviso explicativo */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                      <Info className="w-4 h-4" />
                      Por que usar cookie manual?
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      O servidor do Avec bloqueia requisições automáticas de IPs de datacenter (403 Forbidden).
                      Para contornar isso, você pode fazer login no Avec no seu navegador e copiar o cookie de sessão aqui.
                      O sistema usará esse cookie para buscar os dados automaticamente.
                    </p>
                  </div>

                  {/* Status do cookie atual */}
                  {temCookie && (
                    <div className={`flex items-center justify-between p-3 rounded-md text-sm border ${
                      cookieExpirado
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Cookie className="w-4 h-4" />
                        <span>
                          Cookie configurado há {cookieIdade}h
                          {cookieExpirado ? " — pode ter expirado" : " — provavelmente ativo"}
                        </span>
                      </div>
                      <button
                        onClick={handleRemoverCookie}
                        disabled={removendoCookie}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                      >
                        {removendoCookie ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Remover
                      </button>
                    </div>
                  )}

                  {/* Instruções passo a passo */}
                  <div className="bg-muted/20 rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Key className="w-4 h-4 text-violet-400" />
                      Como obter o cookie de sessão:
                    </div>
                    <ol className="space-y-2 text-xs text-muted-foreground list-none">
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">1</span>
                        <span>
                          Abra o Avec no seu navegador:{" "}
                          <a
                            href="https://admin.avec.beauty/seraphine-beauty-ltda/admin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-400 hover:underline inline-flex items-center gap-0.5"
                          >
                            admin.avec.beauty/seraphine-beauty-ltda/admin
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">2</span>
                        <span>Faça login com as credenciais da Seraphine</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">3</span>
                        <span>Pressione <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-xs">F12</kbd> para abrir as Ferramentas do Desenvolvedor</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">4</span>
                        <span>Vá em <strong>Application</strong> → <strong>Cookies</strong> → <strong>admin.avec.beauty</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">5</span>
                        <span>Copie o valor do cookie <code className="px-1 py-0.5 bg-muted border border-border rounded text-xs">ci_session</code></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">6</span>
                        <span>Cole abaixo e clique em <strong>Salvar Cookie</strong></span>
                      </li>
                    </ol>
                  </div>

                  {/* Campo para colar o cookie */}
                  {!temConfig && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Configure e salve as credenciais Avec primeiro (aba Credenciais).
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Valor do cookie <code className="text-violet-400">ci_session</code>
                    </label>
                    <textarea
                      value={cookieInput}
                      onChange={e => setCookieInput(e.target.value)}
                      placeholder="Cole aqui o valor do cookie ci_session..."
                      rows={4}
                      className="w-full px-3 py-2 text-xs font-mono bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      O cookie é uma string longa (ex: <code className="text-violet-400">ci_session=a1b2c3d4...</code> ou apenas o valor após o "=").
                    </p>
                  </div>

                  <button
                    onClick={handleSalvarCookie}
                    disabled={salvandoCookie || !cookieInput.trim() || !temConfig}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-md hover:bg-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {salvandoCookie ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cookie className="w-4 h-4" />}
                    Salvar Cookie
                  </button>

                  {/* Nota sobre validade */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-xs text-blue-400">
                    <strong>Validade:</strong> O cookie do Avec expira após algumas horas de inatividade (geralmente 24–72h).
                    Quando a sincronização falhar com erro de autenticação, renove o cookie repetindo o processo acima.
                  </div>
                </div>
              )}

              {/* Aba: Mapeamento */}
              {abaAtiva === "mapeamento" && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Mapeie cada categoria do Avec para a categoria correspondente no Meta Dashboard.
                  </p>

                  {/* Categorias personalizadas do tenant */}
                  {categoriasMeta.length > 0 && (
                    <div className="bg-muted/20 rounded-md p-3 text-xs text-muted-foreground">
                      <strong>Categorias configuradas:</strong>{" "}
                      {categoriasMeta.map(c => `${c.nome} (cat${c.numero})`).join(", ")}
                    </div>
                  )}

                  <div className="space-y-2">
                    {mapeamento.map((item, idx) => (
                      <div key={item.avecCategoria} className="flex items-center gap-3 p-3 bg-muted/20 rounded-md">
                        <div className="flex-1 text-sm font-medium text-foreground">{item.avecCategoria}</div>
                        <div className="text-muted-foreground text-sm">→</div>
                        <select
                          value={item.metaCategoria}
                          onChange={e => {
                            const novo = [...mapeamento];
                            novo[idx] = { ...novo[idx], metaCategoria: e.target.value };
                            setMapeamento(novo);
                          }}
                          className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          {META_CATEGORIAS.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                          {categoriasMeta.map(c => (
                            <option key={`cat${c.numero}`} value={`cat${c.numero}`}>{c.nome}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar categoria customizada */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground mb-2">Adicionar categoria Avec personalizada:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome da categoria no Avec"
                        className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && !mapeamento.find(m => m.avecCategoria === val)) {
                              setMapeamento([...mapeamento, { avecCategoria: val, metaCategoria: "ignorar" }]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground self-center">Enter para adicionar</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSalvarMapeamento}
                    disabled={salvarMapeamentoMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-md hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
                  >
                    {salvarMapeamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Mapeamento
                  </button>
                </div>
              )}

              {/* Aba: Sincronizar */}
              {abaAtiva === "sincronizar" && (
                <div className="p-4 space-y-4">
                  {!temConfig && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Configure as credenciais Avec antes de sincronizar.
                    </div>
                  )}

                  {temConfig && !temCookie && (
                    <div className="flex items-center gap-2 p-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-sm">
                      <Cookie className="w-4 h-4" />
                      Sem cookie de sessão configurado. Configure na aba <strong>Cookie Sessão</strong> para sincronizar.
                    </div>
                  )}

                  {temConfig && temCookie && cookieExpirado && (
                    <div className="flex items-center gap-2 p-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Cookie pode ter expirado (configurado há {cookieIdade}h). Renove na aba <strong>Cookie Sessão</strong> se a sincronização falhar.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Mês</label>
                      <select
                        value={mesSinc}
                        onChange={e => setMesSinc(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                          <option key={i+1} value={i+1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Ano</label>
                      <input
                        type="number"
                        value={anoSinc}
                        onChange={e => setAnoSinc(Number(e.target.value))}
                        min={2020}
                        max={2100}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSincronizar}
                    disabled={sincronizarMutation.isPending || !temConfig}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-600/30 disabled:opacity-50 transition-colors"
                  >
                    {sincronizarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Sincronizar Agora
                  </button>

                  {/* Logs de sincronização */}
                  {logs && logs.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <History className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Histórico de Sincronizações</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {logs.map((log, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 rounded text-xs">
                            <div className="flex items-center gap-2">
                              {log.status === "ok" ? (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                              <span className="text-muted-foreground">
                                {new Date(log.executadoEm).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={log.status === "ok" ? "text-green-400" : "text-red-400"}>
                                {log.diasSincronizados ?? 0} dias
                              </span>
                              <span className="text-muted-foreground">{log.origem}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Agendamento */}
              {abaAtiva === "agendamento" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-md">
                    <input
                      type="checkbox"
                      id={`sinc-auto-${empresa.slug}`}
                      checked={sincAutoAtiva}
                      onChange={e => setSincAutoAtiva(e.target.checked)}
                      className="w-4 h-4 accent-violet-500"
                    />
                    <label htmlFor={`sinc-auto-${empresa.slug}`} className="text-sm text-foreground cursor-pointer">
                      Sincronização automática ativa
                    </label>
                  </div>

                  {sincAutoAtiva && (
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Horário de sincronização</label>
                      <input
                        type="time"
                        value={horarioSinc}
                        onChange={e => setHorarioSinc(e.target.value)}
                        className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  )}

                  {sincAutoAtiva && !temCookie && (
                    <div className="flex items-center gap-2 p-3 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-md text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Configure um cookie de sessão na aba <strong>Cookie Sessão</strong> para que o agendamento funcione.
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 text-xs text-blue-400">
                    <strong>Como funciona:</strong> O sistema usa o cookie de sessão configurado para buscar o faturamento diário por categoria no Avec.
                    Os dados são mapeados para as categorias do Meta Dashboard e salvos automaticamente.
                    Renove o cookie periodicamente (a cada 24–72h) para manter a sincronização ativa.
                  </div>

                  <button
                    onClick={handleSalvarAgendamento}
                    disabled={atualizarAgendamentoMutation.isPending || !temConfig}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600/20 text-violet-400 border border-violet-500/30 rounded-md hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
                  >
                    {atualizarAgendamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    Salvar Agendamento
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AvecIntegracao({ empresas }: AvecIntegracaoProps) {
  // Usar a primeira empresa ativa para buscar as categorias do tenant
  const primeiraEmpresa = empresas.find(e => e.ativo === 1);
  const { data: categoriasRaw } = trpc.categorias.listar.useQuery(
    { empresaSlug: primeiraEmpresa?.slug ?? "" },
    { enabled: !!primeiraEmpresa }
  );

  // Mapear para o formato esperado pelo painel
  const categoriasMeta = (categoriasRaw ?? []).map((c, idx) => ({
    numero: idx + 1,
    nome: c.nome,
  }));

  const empresasAtivas = empresas.filter(e => e.ativo === 1);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Integração Avec</h3>
          <p className="text-sm text-muted-foreground">
            Sincronize automaticamente o faturamento diário do Avec para o Meta Dashboard.
            Configure o cookie de sessão para ativar a sincronização.
          </p>
        </div>
      </div>

      {/* Empresas */}
      {empresasAtivas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma empresa ativa encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {empresasAtivas.map(empresa => (
            <EmpresaConfigPanel
              key={empresa.slug}
              empresa={empresa}
              categoriasMeta={categoriasMeta}
            />
          ))}
        </div>
      )}
    </div>
  );
}
