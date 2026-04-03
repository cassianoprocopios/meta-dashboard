/**
 * AvecIntegracao.tsx
 *
 * Componente de configuração da integração com o Avec.
 * Permite ao administrador:
 * 1. Configurar credenciais por empresa (email, senha)
 * 2. Testar a conexão
 * 3. Configurar o mapeamento de categorias Avec → Meta Dashboard
 * 4. Sincronizar dados de um mês específico
 * 5. Ver logs de sincronização
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2, CheckCircle, XCircle, RefreshCw, Settings,
  Zap, Map, Calendar, ChevronDown, ChevronRight,
  Building2, AlertTriangle, Save, Play, History, Clock
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

// Categorias padrão do Avec para a Seraphine
const AVEC_CATEGORIAS_SERAPHINE = [
  "Serviços",
  "Pacotes",
  "Produtos",
  "Caixinha",
  "Recorrência",
];

// ─── Painel de Configuração por Empresa ──────────────────────────────────────

function EmpresaConfigPanel({
  empresa,
  categoriasMeta,
}: {
  empresa: Empresa;
  categoriasMeta: Array<{ numero: number; nome: string }>;
}) {
  const [expandido, setExpandido] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"config" | "mapeamento" | "sincronizar" | "logs">("config");

  // Formulário de configuração
  const [avecEmail, setAvecEmail] = useState("");
  const [avecSenha, setAvecSenha] = useState("");
  const [sincAutoAtiva, setSincAutoAtiva] = useState(false);
  const [testando, setTestando] = useState(false);
  const [conexaoOk, setConexaoOk] = useState<boolean | null>(null);

  // Sincronização
  const [mesSinc, setMesSinc] = useState(new Date().getMonth() + 1);
  const [anoSinc, setAnoSinc] = useState(new Date().getFullYear());
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSinc, setResultadoSinc] = useState<{
    diasSincronizados: number;
    diasIgnorados: number;
    diasFechados: number;
    erros?: string;
  } | null>(null);

  // Mapeamento de categorias
  const [mapeamento, setMapeamento] = useState<Array<{
    avecCategoria: string;
    metaCategoria: string;
  }>>([]);

  const utils = trpc.useUtils();

  // Carregar configuração existente
  const { data: configExistente, isLoading: loadingConfig } = trpc.avec.listarConfig.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido }
  );

  // Carregar mapeamento existente
  const { data: mapeamentoExistente = [] } = trpc.avec.listarMapeamento.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido && abaAtiva === "mapeamento" }
  );

  // Carregar logs
  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = trpc.avec.listarLogs.useQuery(
    { empresaSlug: empresa.slug, limit: 20 },
    { enabled: expandido && abaAtiva === "logs" }
  );

  // Sincronizar com dados existentes
  useEffect(() => {
    if (configExistente) {
      setAvecEmail(configExistente.avecEmail || "");
      setAvecSenha(configExistente.avecSenha || "");
      setSincAutoAtiva(configExistente.sincAutoAtiva === 1);
    }
  }, [configExistente]);

  useEffect(() => {
    if (mapeamentoExistente.length > 0) {
      setMapeamento(
        mapeamentoExistente.map((m: any) => ({
          avecCategoria: m.avecCategoria || "",
          metaCategoria: m.metaCategoria || "ignorar",
        }))
      );
    } else if (abaAtiva === "mapeamento" && mapeamento.length === 0) {
      // Inicializar com categorias padrão da Seraphine
      setMapeamento(
        AVEC_CATEGORIAS_SERAPHINE.map((cat) => ({
          avecCategoria: cat,
          metaCategoria: "ignorar",
        }))
      );
    }
  }, [mapeamentoExistente, abaAtiva]);

  // Mutations
  const salvarConfigMutation = trpc.avec.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      utils.avec.listarConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (e) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const testarConexaoMutation = trpc.avec.testarConexao.useMutation({
    onSuccess: (data) => {
      setConexaoOk(data.sucesso);
      if (data.sucesso) {
        toast.success("Conexão com o Avec estabelecida com sucesso!");
      } else {
        toast.error(`Falha na conexão: ${data.mensagem}`);
      }
    },
    onError: (e) => {
      setConexaoOk(false);
      toast.error(`Erro ao testar: ${e.message}`);
    },
  });

  const salvarMapeamentoMutation = trpc.avec.salvarMapeamento.useMutation({
    onSuccess: () => {
      toast.success("Mapeamento salvo com sucesso!");
      utils.avec.listarMapeamento.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (e) => toast.error(`Erro ao salvar mapeamento: ${e.message}`),
  });

  const sincronizarMutation = trpc.avec.sincronizar.useMutation({
    onSuccess: (data) => {
      setResultadoSinc(data);
      setSincronizando(false);
      if (data.erros) {
        toast.error(`Sincronização com erros: ${data.erros}`);
      } else {
        toast.success(`Sincronização concluída! ${data.diasSincronizados} dias sincronizados.`);
      }
    },
    onError: (e) => {
      setSincronizando(false);
      toast.error(`Erro na sincronização: ${e.message}`);
    },
  });

  const handleTestarConexao = async () => {
    if (!avecEmail || !avecSenha) {
      toast.error("Preencha email e senha antes de testar.");
      return;
    }
    setTestando(true);
    setConexaoOk(null);
    try {
      await testarConexaoMutation.mutateAsync({ empresaSlug: empresa.slug, email: avecEmail, senha: avecSenha });
    } finally {
      setTestando(false);
    }
  };

  const handleSalvarConfig = () => {
    salvarConfigMutation.mutate({
      empresaSlug: empresa.slug,
      avecEmail,
      avecSenha,
      sincAutoAtiva,
    });
  };

  const handleSalvarMapeamento = () => {
    salvarMapeamentoMutation.mutate({
      empresaSlug: empresa.slug,
      mapeamento: mapeamento.filter((m) => m.metaCategoria !== "ignorar"),
    });
  };

  const handleSincronizar = () => {
    setSincronizando(true);
    setResultadoSinc(null);
    sincronizarMutation.mutate({
      empresaSlug: empresa.slug,
      mes: mesSinc,
      ano: anoSinc,
    });
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden mb-3">
      {/* Header da empresa */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-pink-400" />
          <div>
            <div className="font-medium text-white">{empresa.nome}</div>
            <div className="text-xs text-zinc-400">{empresa.slug}</div>
          </div>
          {configExistente && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              configExistente.statusUltimaSinc === "sucesso"
                ? "bg-green-500/20 text-green-400"
                : configExistente.statusUltimaSinc === "erro"
                ? "bg-red-500/20 text-red-400"
                : "bg-zinc-600/30 text-zinc-400"
            }`}>
              {configExistente.statusUltimaSinc === "sucesso" ? "✓ Conectado" :
               configExistente.statusUltimaSinc === "erro" ? "✗ Erro" : "Não configurado"}
            </span>
          )}
        </div>
        {expandido ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="p-4 bg-zinc-900/30">
          {loadingConfig ? (
            <div className="flex items-center gap-2 text-zinc-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando configuração...</span>
            </div>
          ) : (
            <>
              {/* Abas */}
              <div className="flex gap-1 mb-4 border-b border-zinc-700 pb-2">
                {[
                  { id: "config", label: "Configuração", icon: Settings },
                  { id: "mapeamento", label: "Mapeamento", icon: Map },
                  { id: "sincronizar", label: "Sincronizar", icon: Zap },
                  { id: "logs", label: "Logs", icon: History },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAbaAtiva(id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                      abaAtiva === id
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Aba: Configuração */}
              {abaAtiva === "config" && (
                <div className="space-y-4">
                  <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-pink-300">
                      As credenciais são usadas para login automático no Avec via browser headless.
                      Certifique-se de que o email e senha estão corretos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Email do Avec</label>
                      <input
                        type="email"
                        value={avecEmail}
                        onChange={(e) => setAvecEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Senha do Avec</label>
                      <input
                        type="password"
                        value={avecSenha}
                        onChange={(e) => setAvecSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`sinc-auto-${empresa.slug}`}
                      checked={sincAutoAtiva}
                      onChange={(e) => setSincAutoAtiva(e.target.checked)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <label htmlFor={`sinc-auto-${empresa.slug}`} className="text-sm text-zinc-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-pink-400" />
                      Sincronização automática a cada 1 hora
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleTestarConexao}
                      disabled={testando || !avecEmail || !avecSenha}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : conexaoOk === true ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : conexaoOk === false ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      {testando ? "Testando..." : "Testar Conexão"}
                    </button>

                    <button
                      onClick={handleSalvarConfig}
                      disabled={salvarConfigMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                    >
                      {salvarConfigMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Salvar Configuração
                    </button>
                  </div>

                  {configExistente?.ultimaSincronizacao && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Última sincronização: {new Date(configExistente.ultimaSincronizacao).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              )}

              {/* Aba: Mapeamento */}
              {abaAtiva === "mapeamento" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Mapeie cada categoria do Avec para a categoria correspondente no Meta Dashboard.
                  </p>

                  <div className="space-y-2">
                    {mapeamento.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-zinc-800/50 rounded p-2">
                        <div className="flex-1">
                          <div className="text-sm text-white font-medium">{m.avecCategoria}</div>
                          <div className="text-xs text-zinc-500">Categoria do Avec</div>
                        </div>
                        <div className="text-zinc-500">→</div>
                        <div className="flex-1">
                          <select
                            value={m.metaCategoria}
                            onChange={(e) => {
                              const novo = [...mapeamento];
                              novo[idx] = { ...novo[idx], metaCategoria: e.target.value };
                              setMapeamento(novo);
                            }}
                            className="w-full bg-zinc-700 border border-zinc-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500"
                          >
                            {META_CATEGORIAS.map((cat) => {
                              const catMeta = categoriasMeta.find((c) => `cat${c.numero}` === cat.value);
                              return (
                                <option key={cat.value} value={cat.value}>
                                  {catMeta ? `${cat.value.toUpperCase()}: ${catMeta.nome}` : cat.label}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSalvarMapeamento}
                    disabled={salvarMapeamentoMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {salvarMapeamentoMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar Mapeamento
                  </button>
                </div>
              )}

              {/* Aba: Sincronizar */}
              {abaAtiva === "sincronizar" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Sincronize o faturamento do Avec para um mês específico. Os dados serão importados por categoria.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Mês</label>
                      <select
                        value={mesSinc}
                        onChange={(e) => setMesSinc(Number(e.target.value))}
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                      >
                        {meses.map((m, i) => (
                          <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Ano</label>
                      <select
                        value={anoSinc}
                        onChange={(e) => setAnoSinc(Number(e.target.value))}
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                      >
                        {[2024, 2025, 2026, 2027].map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSincronizar}
                    disabled={sincronizando}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm transition-colors disabled:opacity-50"
                  >
                    {sincronizando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {sincronizando ? "Sincronizando..." : "Iniciar Sincronização"}
                  </button>

                  {sincronizando && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                      Fazendo login no Avec e importando dados... Isso pode levar alguns minutos.
                    </div>
                  )}

                  {resultadoSinc && (
                    <div className={`rounded-lg p-4 ${resultadoSinc.erros ? "bg-red-500/10 border border-red-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {resultadoSinc.erros ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        <span className={`text-sm font-medium ${resultadoSinc.erros ? "text-red-400" : "text-green-400"}`}>
                          {resultadoSinc.erros ? "Sincronização com erros" : "Sincronização concluída"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
                        <div>
                          <span className="text-green-400 font-medium">{resultadoSinc.diasSincronizados}</span> dias sincronizados
                        </div>
                        <div>
                          <span className="text-zinc-300 font-medium">{resultadoSinc.diasFechados}</span> dias fechados
                        </div>
                        <div>
                          <span className="text-zinc-300 font-medium">{resultadoSinc.diasIgnorados}</span> ignorados
                        </div>
                      </div>
                      {resultadoSinc.erros && (
                        <p className="text-xs text-red-300 mt-2">{resultadoSinc.erros}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Aba: Logs */}
              {abaAtiva === "logs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">Histórico das últimas sincronizações</p>
                    <button
                      onClick={() => refetchLogs()}
                      className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Atualizar
                    </button>
                  </div>

                  {loadingLogs ? (
                    <div className="flex items-center gap-2 text-zinc-400 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Carregando logs...</span>
                    </div>
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-4 text-center">Nenhum log encontrado.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(logs as any[]).map((log: any, idx: number) => (
                        <div key={idx} className="bg-zinc-800/50 rounded p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`px-1.5 py-0.5 rounded ${
                              log.status === "sucesso" ? "bg-green-500/20 text-green-400" :
                              log.status === "erro" ? "bg-red-500/20 text-red-400" :
                              "bg-zinc-600/30 text-zinc-400"
                            }`}>
                              {log.status}
                            </span>
                            <span className="text-zinc-500">
                              {new Date(log.executadoEm).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div className="text-zinc-400">
                            {meses[(log.mes || 1) - 1]}/{log.ano} · {log.origem} ·{" "}
                            {log.diasSincronizados} dias sincronizados
                          </div>
                          {log.erros && <div className="text-red-400 mt-1">{log.erros}</div>}
                        </div>
                      ))}
                    </div>
                  )}
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
  // Filtrar apenas empresas do tipo Seraphine (tipoCategorias = seraphine)
  // Por enquanto mostrar todas as empresas que podem ter integração Avec
  const empresasComAvec = empresas;

  // Buscar categorias de uma empresa para o mapeamento (usamos a primeira empresa como referência)
  const primeiraEmpresa = empresasComAvec[0];
  const { data: todasCategorias = [] } = trpc.categorias.listar.useQuery(
    { empresaSlug: primeiraEmpresa?.slug ?? "" },
    { enabled: !!primeiraEmpresa }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-pink-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Integração Avec</h3>
          <p className="text-xs text-zinc-400">
            Configure a sincronização automática com o sistema Avec para importar faturamento por categoria.
          </p>
        </div>
      </div>

      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <Calendar className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
          <div className="text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">Sincronização automática:</span>{" "}
            O sistema faz login no Avec via browser headless e importa o faturamento por categoria (Serviços, Pacotes, Produtos, Caixinha, Recorrência) a cada 1 hora automaticamente.
          </div>
        </div>
      </div>

      {empresasComAvec.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma empresa disponível para integração com o Avec.</p>
        </div>
      ) : (
        empresasComAvec.map((empresa) => (
          <EmpresaConfigPanel
            key={empresa.id}
            empresa={empresa}
            categoriasMeta={(todasCategorias as any[])
              .filter((c: any) => c.empresaSlug === empresa.slug)
              .map((c: any) => ({ numero: c.numero, nome: c.nome }))}
          />
        ))
      )}
    </div>
  );
}
