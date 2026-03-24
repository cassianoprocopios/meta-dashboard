/**
 * CashBarberIntegracao.tsx
 *
 * Componente de configuração da integração com o CashBarber.
 * Permite ao administrador:
 * 1. Configurar credenciais por empresa (email, senha, filial)
 * 2. Testar a conexão
 * 3. Configurar o mapeamento de categorias CashBarber → Meta Dashboard
 * 4. Sincronizar dados de um mês específico
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2, CheckCircle, XCircle, RefreshCw, Settings,
  Zap, Map, Calendar, ChevronDown, ChevronRight,
  Building2, AlertTriangle, Info, Save, Play, Clock, History
} from "lucide-react";

type Empresa = { id: number; nome: string; slug: string; ativo: number };

interface CashBarberIntegracaoProps {
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

// ─── Painel de Configuração por Empresa ──────────────────────────────────────
function EmpresaConfigPanel({ empresa, categoriasMeta }: {
  empresa: Empresa;
  categoriasMeta: Array<{ numero: number; nome: string }>;
}) {
  const [expandido, setExpandido] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"config" | "mapeamento" | "sincronizar" | "agendamento">("config");

  // Formulário de configuração
  const [cbEmail, setCbEmail] = useState("");
  const [cbSenha, setCbSenha] = useState("");
  const [cbFilialId, setCbFilialId] = useState<number | "">("");
  const [cbFilialNome, setCbFilialNome] = useState("");
  const [filiais, setFiliais] = useState<Array<{ id: number; nome: string }>>([]);
  const [testando, setTestando] = useState(false);
  const [conexaoOk, setConexaoOk] = useState<boolean | null>(null);

  // Sincronização
  const [mesSinc, setMesSinc] = useState(new Date().getMonth() + 1);
  const [anoSinc, setAnoSinc] = useState(new Date().getFullYear());
  const [sobreescrever, setSobreescrever] = useState(false);

  // Agendamento
  const [sincAutoAtiva, setSincAutoAtiva] = useState(false);
  const [horarioSinc, setHorarioSinc] = useState("23:00");

  // Mapeamento de categorias
  const [mapeamento, setMapeamento] = useState<Array<{
    tipo: "servico_categoria" | "produto_categoria" | "servico_id" | "produto_id";
    cbId: string;
    cbNome: string;
    metaCategoria: string;
  }>>([]);
  const [catalogoCarregado, setCatalogoCarregado] = useState(false);

  const utils = trpc.useUtils();

  // Carregar logs de sincronização
  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = trpc.cashbarber.listarLogs.useQuery(
    { empresaSlug: empresa.slug, limit: 20 },
    { enabled: expandido && abaAtiva === "agendamento" }
  );

  // Carregar configuração existente
  const { data: configExistente, isLoading: loadingConfig } = trpc.cashbarber.listarConfig.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido }
  );

  // Carregar mapeamento existente
  const { data: mapeamentoExistente = [] } = trpc.cashbarber.listarMapeamento.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: expandido && abaAtiva === "mapeamento" }
  );

  // Buscar catálogo do CashBarber (apenas quando na aba de mapeamento)
  const { data: catalogo, isLoading: loadingCatalogo, refetch: refetchCatalogo } = trpc.cashbarber.buscarCatalogo.useQuery(
    { empresaSlug: empresa.slug },
    { enabled: false }
  );

  // Sincronizar com dados existentes
  useEffect(() => {
    if (configExistente) {
      setCbEmail(configExistente.cbEmail || "");
      setCbSenha(""); // Não preencher senha por segurança
      setCbFilialId(configExistente.cbFilialId || "");
      setCbFilialNome(configExistente.cbFilialNome || "");
      setSincAutoAtiva(!!(configExistente as any).sincAutoAtiva);
      setHorarioSinc((configExistente as any).horarioSinc || "23:00");
    }
  }, [configExistente]);

  useEffect(() => {
    if (mapeamentoExistente.length > 0 && !catalogoCarregado) {
      setMapeamento(mapeamentoExistente.map((m: any) => ({
        tipo: m.tipo,
        cbId: m.cbId,
        cbNome: m.cbNome,
        metaCategoria: m.metaCategoria,
      })));
    }
  }, [mapeamentoExistente]);

  useEffect(() => {
    if (catalogo && !catalogoCarregado) {
      // Inicializar mapeamento com categorias do catálogo
      const novoMapeamento: typeof mapeamento = [];

      // Adicionar categorias de serviços
      for (const cat of catalogo.categorias.filter((c: any) => c.cat_type === "SERVICO")) {
        const existente = mapeamentoExistente.find((m: any) => m.tipo === "servico_categoria" && m.cbId === String(cat.id));
        novoMapeamento.push({
          tipo: "servico_categoria",
          cbId: String(cat.id),
          cbNome: cat.cat_nome,
          metaCategoria: existente?.metaCategoria || "cat1",
        });
      }

      // Adicionar categorias de produtos
      for (const cat of catalogo.categorias.filter((c: any) => c.cat_type === "PRODUTO")) {
        const existente = mapeamentoExistente.find((m: any) => m.tipo === "produto_categoria" && m.cbId === String(cat.id));
        novoMapeamento.push({
          tipo: "produto_categoria",
          cbId: String(cat.id),
          cbNome: cat.cat_nome,
          metaCategoria: existente?.metaCategoria || "cat2",
        });
      }

      if (novoMapeamento.length > 0) {
        setMapeamento(novoMapeamento);
        setCatalogoCarregado(true);
      }
    }
  }, [catalogo]);

  // Mutations
  const salvarConfig = trpc.cashbarber.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      utils.cashbarber.listarConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(err.message),
  });

  const testarConexao = trpc.cashbarber.testarConexao.useMutation({
    onSuccess: (data) => {
      setTestando(false);
      if (data.ok) {
        setConexaoOk(true);
        setFiliais(data.filiais || []);
        toast.success(`Conexão bem-sucedida! ${data.filiais?.length || 0} filial(is) encontrada(s).`);
      } else {
        setConexaoOk(false);
        toast.error(`Falha na conexão: ${data.erro}`);
      }
    },
    onError: (err) => {
      setTestando(false);
      setConexaoOk(false);
      toast.error(err.message);
    },
  });

  const salvarMapeamento = trpc.cashbarber.salvarMapeamento.useMutation({
    onSuccess: () => {
      toast.success("Mapeamento salvo com sucesso!");
      utils.cashbarber.listarMapeamento.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(err.message),
  });

  const sincronizar = trpc.cashbarber.sincronizar.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Sincronização concluída! ${data.diasSincronizados} dia(s) importado(s), ${data.diasIgnorados} ignorado(s).`
      );
      if (data.erros.length > 0) {
        toast.warning(`${data.erros.length} erro(s) durante a sincronização.`);
      }
      utils.cashbarber.listarLogs.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(err.message),
  });

  const configurarAgendamento = trpc.cashbarber.configurarAgendamento.useMutation({
    onSuccess: () => {
      toast.success(sincAutoAtiva ? `Sincronização automática ativada para as ${horarioSinc}!` : "Sincronização automática desativada.");
      utils.cashbarber.listarConfig.invalidate({ empresaSlug: empresa.slug });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTestarConexao = () => {
    if (!cbEmail || !cbSenha) {
      toast.error("Preencha o email e a senha antes de testar.");
      return;
    }
    setTestando(true);
    setConexaoOk(null);
    testarConexao.mutate({ cbEmail, cbSenha });
  };

  const handleSalvarConfig = () => {
    if (!cbEmail || !cbSenha || !cbFilialId) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    salvarConfig.mutate({
      empresaSlug: empresa.slug,
      cbEmail,
      cbSenha,
      cbFilialId: Number(cbFilialId),
      cbFilialNome: cbFilialNome || undefined,
    });
  };

  const handleCarregarCatalogo = async () => {
    if (!configExistente) {
      toast.error("Salve a configuração antes de carregar o catálogo.");
      return;
    }
    setCatalogoCarregado(false);
    await refetchCatalogo();
  };

  const handleSalvarMapeamento = () => {
    if (mapeamento.length === 0) {
      toast.error("Nenhum mapeamento para salvar.");
      return;
    }
    salvarMapeamento.mutate({ empresaSlug: empresa.slug, mapeamento });
  };

  const handleSincronizar = () => {
    sincronizar.mutate({
      empresaSlug: empresa.slug,
      mes: mesSinc,
      ano: anoSinc,
      sobreescrever,
    });
  };

  const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const temConfig = !!configExistente;
  const temMapeamento = mapeamentoExistente.length > 0 || mapeamento.length > 0;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header da empresa */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${empresa.ativo ? "bg-blue-100" : "bg-slate-100"}`}>
            <Building2 className={`w-4 h-4 ${empresa.ativo ? "text-blue-600" : "text-slate-400"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{empresa.nome}</p>
            <p className="text-xs text-slate-400">{empresa.slug}</p>
          </div>
          {/* Status badges */}
          <div className="flex items-center gap-1.5 ml-2">
            {temConfig && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                <CheckCircle className="w-3 h-3" /> Configurado
              </span>
            )}
            {temMapeamento && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                <Map className="w-3 h-3" /> Mapeado
              </span>
            )}
            {configExistente?.ultimaSincronizacao && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                <RefreshCw className="w-3 h-3" /> Sincronizado
              </span>
            )}
          </div>
        </div>
        {expandido ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-slate-100">
          {loadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Sub-abas */}
              <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
                {[
                  { id: "config" as const, label: "Credenciais", icon: Settings },
                  { id: "mapeamento" as const, label: "Mapeamento", icon: Map },
                  { id: "sincronizar" as const, label: "Sincronizar", icon: RefreshCw },
                  { id: "agendamento" as const, label: "Agendamento", icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAbaAtiva(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      abaAtiva === tab.id
                        ? "border-blue-500 text-blue-600 bg-white"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Aba Credenciais */}
              {abaAtiva === "config" && (
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Configure as credenciais de acesso ao CashBarber para esta empresa. A senha é armazenada de forma segura e usada apenas para sincronização.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Email CashBarber *</label>
                      <input
                        type="email"
                        value={cbEmail}
                        onChange={(e) => setCbEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Senha CashBarber *</label>
                      <input
                        type="password"
                        value={cbSenha}
                        onChange={(e) => setCbSenha(e.target.value)}
                        placeholder={configExistente ? "••••••••" : "Digite a senha"}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Teste de conexão */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTestarConexao}
                      disabled={testando || testarConexao.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {testando || testarConexao.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Testar Conexão
                    </button>
                    {conexaoOk === true && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle className="w-4 h-4" /> Conexão bem-sucedida
                      </span>
                    )}
                    {conexaoOk === false && (
                      <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                        <XCircle className="w-4 h-4" /> Falha na conexão
                      </span>
                    )}
                  </div>

                  {/* Seleção de filial */}
                  {filiais.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Filial CashBarber *</label>
                      <select
                        value={cbFilialId}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setCbFilialId(id);
                          const fil = filiais.find((f) => f.id === id);
                          if (fil) setCbFilialNome(fil.nome);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione a filial...</option>
                        {filiais.map((f) => (
                          <option key={f.id} value={f.id}>{f.nome} (ID: {f.id})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Filial manual (se não testou ainda) */}
                  {filiais.length === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">ID da Filial CashBarber *</label>
                        <input
                          type="number"
                          value={cbFilialId}
                          onChange={(e) => setCbFilialId(e.target.value ? Number(e.target.value) : "")}
                          placeholder="Ex: 144"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-400 mt-1">Teste a conexão para ver as filiais disponíveis</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Nome da Filial (opcional)</label>
                        <input
                          type="text"
                          value={cbFilialNome}
                          onChange={(e) => setCbFilialNome(e.target.value)}
                          placeholder="Ex: Morumbi"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {configExistente?.ultimaSincronizacao && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Última sincronização: {new Date(configExistente.ultimaSincronizacao).toLocaleString()}
                      {configExistente.statusUltimaSinc && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          configExistente.statusUltimaSinc === "ok"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {configExistente.statusUltimaSinc}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSalvarConfig}
                      disabled={salvarConfig.isPending}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {salvarConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Configuração
                    </button>
                  </div>
                </div>
              )}

              {/* Aba Mapeamento */}
              {abaAtiva === "mapeamento" && (
                <div className="p-5 space-y-4">
                  {!temConfig ? (
                    <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-100">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Configure e salve as credenciais CashBarber antes de configurar o mapeamento.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          Defina como cada categoria do CashBarber deve ser mapeada para as categorias do Meta Dashboard.
                          Use "Ignorar" para excluir categorias da importação.
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                          {mapeamento.length > 0 ? `${mapeamento.length} categorias configuradas` : "Nenhuma categoria carregada"}
                        </p>
                        <button
                          onClick={handleCarregarCatalogo}
                          disabled={loadingCatalogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {loadingCatalogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Carregar do CashBarber
                        </button>
                      </div>

                      {mapeamento.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Categoria CashBarber</th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Tipo</th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Destino Meta Dashboard</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {mapeamento.map((item, idx) => {
                                const catMeta = categoriasMeta.find((c) => `cat${c.numero}` === item.metaCategoria);
                                return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2.5">
                                      <span className="font-medium text-slate-800">{item.cbNome}</span>
                                      <span className="ml-1.5 text-xs text-slate-400">#{item.cbId}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        item.tipo.includes("servico")
                                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                                          : "bg-purple-50 text-purple-700 border border-purple-100"
                                      }`}>
                                        {item.tipo.includes("servico") ? "Serviço" : "Produto"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <select
                                        value={item.metaCategoria}
                                        onChange={(e) => {
                                          const novo = [...mapeamento];
                                          novo[idx] = { ...novo[idx], metaCategoria: e.target.value };
                                          setMapeamento(novo);
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                      >
                                        {META_CATEGORIAS.map((cat) => {
                                          const catMeta = categoriasMeta.find((c) => `cat${c.numero}` === cat.value);
                                          return (
                                            <option key={cat.value} value={cat.value}>
                                              {catMeta ? catMeta.nome : cat.label}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {mapeamento.length > 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={handleSalvarMapeamento}
                            disabled={salvarMapeamento.isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {salvarMapeamento.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Mapeamento
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Aba Agendamento */}
              {abaAtiva === "agendamento" && (
                <div className="p-5 space-y-5">
                  {!temConfig ? (
                    <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-100">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Configure as credenciais CashBarber antes de ativar o agendamento.</span>
                    </div>
                  ) : (
                    <>
                      {/* Toggle de sincronização automática */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Sincronização Automática</p>
                          <p className="text-xs text-slate-500 mt-0.5">Importa os dados do mês corrente diariamente no horário configurado</p>
                        </div>
                        <button
                          onClick={() => setSincAutoAtiva(!sincAutoAtiva)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            sincAutoAtiva ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            sincAutoAtiva ? "translate-x-6" : "translate-x-0"
                          }`} />
                        </button>
                      </div>

                      {/* Seletor de horário */}
                      {sincAutoAtiva && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">
                              <Clock className="w-3.5 h-3.5 inline mr-1" />
                              Horário de Execução
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="time"
                                value={horarioSinc}
                                onChange={(e) => setHorarioSinc(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <span className="text-xs text-slate-500">Fuso horário do servidor (UTC-3)</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-100">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                              O job será executado diariamente às <strong>{horarioSinc}</strong>, sincronizando todos os dias do mês corrente.
                              Dias futuros são ignorados automaticamente.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => configurarAgendamento.mutate({ empresaSlug: empresa.slug, sincAutoAtiva, horarioSinc })}
                          disabled={configurarAgendamento.isPending}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {configurarAgendamento.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Salvar Agendamento
                        </button>
                      </div>

                      {/* Histórico de sincronizações */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <History className="w-4 h-4" />
                            Histórico de Sincronizações
                          </p>
                          <button
                            onClick={() => refetchLogs()}
                            disabled={loadingLogs}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                          >
                            {loadingLogs ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            Atualizar
                          </button>
                        </div>

                        {loadingLogs ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          </div>
                        ) : logs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <History className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Nenhuma sincronização registrada ainda</p>
                            <p className="text-xs text-slate-400 mt-1">Execute uma sincronização manual ou ative o agendamento automático</p>
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Data/Hora</th>
                                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Período</th>
                                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Origem</th>
                                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Dias</th>
                                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {logs.map((log: any) => (
                                  <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 text-slate-600">
                                      {new Date(log.executadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-700 font-medium">
                                      {String(log.mes).padStart(2, "0")}/{log.ano}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                        log.origem === "auto"
                                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                                          : "bg-blue-50 text-blue-700 border border-blue-100"
                                      }`}>
                                        {log.origem === "auto" ? <Clock className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                        {log.origem === "auto" ? "Automático" : "Manual"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-700">
                                      <span className="text-emerald-600 font-semibold">{log.diasSincronizados}</span>
                                      {log.diasIgnorados > 0 && <span className="text-slate-400 ml-1">(+{log.diasIgnorados} ign.)</span>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                        log.status === "ok"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                          : log.status === "parcial"
                                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                                          : "bg-red-50 text-red-700 border border-red-100"
                                      }`}>
                                        {log.status === "ok" ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                        {log.status === "ok" ? "OK" : log.status === "parcial" ? "Parcial" : "Erro"}
                                      </span>
                                      {log.erros && (
                                        <p className="text-red-500 mt-0.5 text-xs max-w-xs truncate" title={log.erros}>{log.erros}</p>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Aba Sincronizar */}
              {abaAtiva === "sincronizar" && (
                <div className="p-5 space-y-4">
                  {!temConfig ? (
                    <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-100">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Configure as credenciais CashBarber antes de sincronizar.</span>
                    </div>
                  ) : !temMapeamento ? (
                    <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-lg text-sm text-amber-700 border border-amber-100">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Configure o mapeamento de categorias antes de sincronizar.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          A sincronização importa os dados de faturamento do CashBarber dia a dia para o mês selecionado.
                          Dias futuros são ignorados automaticamente.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">Mês</label>
                          <select
                            value={mesSinc}
                            onChange={(e) => setMesSinc(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {mesesNomes.map((nome, i) => (
                              <option key={i + 1} value={i + 1}>{nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">Ano</label>
                          <select
                            value={anoSinc}
                            onChange={(e) => setAnoSinc(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {anosDisponiveis.map((ano) => (
                              <option key={ano} value={ano}>{ano}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sobreescrever}
                          onChange={(e) => setSobreescrever(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">Sobrescrever faturamentos já lançados</span>
                      </label>

                      {sobreescrever && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-100">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>Atenção: os faturamentos já lançados manualmente serão substituídos pelos dados do CashBarber.</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleSincronizar}
                          disabled={sincronizar.isPending}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {sincronizar.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {sincronizar.isPending ? "Sincronizando..." : `Sincronizar ${mesesNomes[mesSinc - 1]}/${anoSinc}`}
                        </button>
                      </div>

                      {configExistente?.ultimaSincronizacao && (
                        <p className="text-xs text-slate-400 text-right">
                          Última sincronização: {new Date(configExistente.ultimaSincronizacao).toLocaleString()}
                        </p>
                      )}
                    </>
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
export default function CashBarberIntegracao({ empresas }: CashBarberIntegracaoProps) {
  // Buscar categorias de todas as empresas para exibir nomes corretos no mapeamento
  const { data: configs = [] } = trpc.cashbarber.listarTodas.useQuery();

  // Buscar categorias de cada empresa
  const [categoriasPorEmpresa, setCategoriasPorEmpresa] = useState<Record<string, Array<{ numero: number; nome: string }>>>({});
  const { data: todasEmpresas = [] } = trpc.empresa.listar.useQuery();

  useEffect(() => {
    const mapa: Record<string, Array<{ numero: number; nome: string }>> = {};
    for (const emp of todasEmpresas as any[]) {
      if (emp.categorias) {
        mapa[emp.slug] = emp.categorias.map((c: any) => ({ numero: c.numero, nome: c.nome }));
      }
    }
    setCategoriasPorEmpresa(mapa);
  }, [todasEmpresas]);

  const empresasAtivas = empresas.filter((e) => e.ativo);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Integração CashBarber</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sincronize automaticamente os dados de faturamento do CashBarber para o Meta Dashboard.
            Configure as credenciais e o mapeamento de categorias para cada empresa.
          </p>
        </div>
      </div>

      {/* Guia de configuração */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { num: 1, title: "Credenciais", desc: "Configure email, senha e filial do CashBarber", icon: Settings, color: "blue" },
          { num: 2, title: "Mapeamento", desc: "Defina como as categorias CashBarber se traduzem para o Meta", icon: Map, color: "purple" },
          { num: 3, title: "Sincronizar", desc: "Importe os dados de faturamento por mês", icon: Calendar, color: "emerald" },
        ].map((step) => (
          <div key={step.num} className={`p-4 rounded-xl border ${
            step.color === "blue" ? "bg-blue-50 border-blue-100" :
            step.color === "purple" ? "bg-purple-50 border-purple-100" :
            "bg-emerald-50 border-emerald-100"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                step.color === "blue" ? "bg-blue-500" :
                step.color === "purple" ? "bg-purple-500" :
                "bg-emerald-500"
              }`}>{step.num}</span>
              <p className={`text-sm font-semibold ${
                step.color === "blue" ? "text-blue-800" :
                step.color === "purple" ? "text-purple-800" :
                "text-emerald-800"
              }`}>{step.title}</p>
            </div>
            <p className={`text-xs ${
              step.color === "blue" ? "text-blue-600" :
              step.color === "purple" ? "text-purple-600" :
              "text-emerald-600"
            }`}>{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Lista de empresas */}
      {empresasAtivas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhuma empresa ativa</h3>
          <p className="text-sm text-slate-400">Crie e ative empresas na aba Empresas para configurar a integração.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">{empresasAtivas.length} empresa(s) disponível(is)</p>
          {empresasAtivas.map((empresa) => (
            <EmpresaConfigPanel
              key={empresa.slug}
              empresa={empresa}
              categoriasMeta={categoriasPorEmpresa[empresa.slug] || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
