import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Users,
  Link2,
  RefreshCw,
  Trophy,
  Camera,
  MessageSquare,
  Send,
  ExternalLink,
  Phone,
  Bell,
  Share2,
  Copy,
  CheckCheck,
} from "lucide-react";
import { useLocation } from "wouter";

const CARGOS = [
  "Barbeiro",
  "Barbeira",
  "Recepcionista",
  "Gerente",
  "Sócio",
  "Assistente",
  "Outro",
];

type Profissional = {
  id: number;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  cargo: string | null;
  exibirNoRanking: boolean;
  ativo: boolean;
  isGerencia: boolean;
  cashbarberProfissionalId: number | null;
  empresaSlug: string;
  categoriaRanking: 'barbeiro' | 'auxiliar' | 'recepcao';
};

type FormData = {
  id?: number;
  nome: string;
  apelido: string;
  cargo: string;
  cashbarberProfissionalId: string;
  exibirNoRanking: boolean;
  ativo: boolean;
  isGerencia: boolean;
  categoriaRanking: 'barbeiro' | 'auxiliar' | 'recepcao';
  pinAcesso: string;
  metaMensal: string;
  telefone: string;
};
const emptyForm: FormData = {
  nome: "",
  apelido: "",
  cargo: "Barbeiro",
  cashbarberProfissionalId: "",
  exibirNoRanking: true,
  ativo: true,
  isGerencia: false,
  categoriaRanking: 'barbeiro',
  pinAcesso: "",
  metaMensal: "",
  telefone: "",
};;

export default function Profissionais() {
  const [, setLocation] = useLocation();
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const hoje = new Date();
  const [syncMes, setSyncMes] = useState(hoje.getMonth() + 1);
  const [syncAno, setSyncAno] = useState(hoje.getFullYear());
  const [modalRankingWa, setModalRankingWa] = useState(false);
  type MensagemRanking = {
    colaboradorId: number;
    nome: string;
    apelido: string | null;
    telefone: string | null;
    posicao: number;
    totalGeral: number;
    faltaParaSubir: number | null;
    mensagem: string;
    linkWhatsApp: string | null;
  };
  const [mensagensRanking, setMensagensRanking] = useState<MensagemRanking[]>([]);
  const [mensagensRankingMeta, setMensagensRankingMeta] = useState<{ comTelefone: number; semTelefone: number; nomeMes: string; ano: number } | null>(null);

  // Estado do modal de ranking para grupo
  const [modalRankingGrupo, setModalRankingGrupo] = useState(false);
  const [rankingGrupoEmpresaSlug, setRankingGrupoEmpresaSlug] = useState("");
  type RankingGrupoResult = {
    mensagem: string;
    linkCompartilhar: string;
    grupoLink: string | null;
    nomeEmpresa: string;
    nomeMes: string;
    mes: number;
    ano: number;
    fatUnidade: number;
    metaUnidade: number;
    pctMeta: number | null;
    totalProfissionais: number;
  };
  const [rankingGrupoData, setRankingGrupoData] = useState<RankingGrupoResult | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [rankingGrupoMes, setRankingGrupoMes] = useState(hoje.getMonth() + 1);
  const [rankingGrupoAno, setRankingGrupoAno] = useState(hoje.getFullYear());
  const [rankingGrupoPeriodo, setRankingGrupoPeriodo] = useState<'mensal' | 'semanal'>('mensal');

  const utils = trpc.useUtils();

  const { data: profissionais = [], isLoading } = trpc.profissionais.listar.useQuery();

  const salvar = trpc.profissionais.salvar.useMutation({
    onSuccess: () => {
      utils.profissionais.listar.invalidate();
      setModalAberto(false);
      setForm(emptyForm);
      toast.success(form.id ? "Profissional atualizado!" : "Profissional cadastrado!");
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  const toggleAtivo = trpc.profissionais.toggleAtivo.useMutation({
    onSuccess: () => utils.profissionais.listar.invalidate(),
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const sincronizar = trpc.profissionais.sincronizarFaturamento.useMutation({
    onSuccess: (data) => {
      toast.success(data.mensagem);
    },
    onError: (err) => toast.error("Erro na sincronização: " + err.message),
  });

  const syncFotos = trpc.profissionais.syncFotos.useMutation({
    onSuccess: (data) => {
      utils.profissionais.listar.invalidate();
      toast.success(`Fotos sincronizadas! ${data.atualizados} atualizadas, ${data.semFoto} sem foto.`);
    },
    onError: (err) => toast.error("Erro ao sincronizar fotos: " + err.message),
  });

  const deletar = trpc.profissionais.deletar.useMutation({
    onSuccess: () => {
      utils.profissionais.listar.invalidate();
      setConfirmDeleteId(null);
      toast.success("Profissional removido.");
    },
    onError: (err) => toast.error("Erro ao remover: " + err.message),
  });

  const { data: empresasData = [] } = trpc.empresa.listar.useQuery();

  const gerarRankingGrupo = trpc.profissionais.gerarRankingGrupoWhatsApp.useMutation({
    onSuccess: (data) => {
      setRankingGrupoData(data);
    },
    onError: (err) => toast.error("Erro ao gerar ranking: " + err.message),
  });

  const gerarMensagensRanking = trpc.profissionais.gerarMensagensRankingWhatsApp.useMutation({
    onSuccess: (data) => {
      setMensagensRanking(data.resultados);
      setMensagensRankingMeta({ comTelefone: data.comTelefone, semTelefone: data.semTelefone, nomeMes: data.nomeMes, ano: data.ano });
      setModalRankingWa(true);
      toast.success(`${data.total} mensagens geradas! ${data.comTelefone} com link WhatsApp.`);
    },
    onError: (err) => toast.error("Erro ao gerar mensagens: " + err.message),
  });

  const dispararPushRanking = trpc.profissionais.dispararPushRankingParaTodos.useMutation({
    onSuccess: () => {
      toast.info("Notificações desativadas.");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  // Estado do modal de PIN para gerentes
  const [modalPinGerentes, setModalPinGerentes] = useState(false);

  // Filtrar gerentes da lista de profissionais
  const gerentes = profissionais.filter((p: any) => p.isGerencia);

  // Gerar mensagem de acesso para gerente
  const gerarMensagemAcessoGerente = (gerente: any) => {
    const appUrl = window.location.origin;
    const link = `${appUrl}/pro`;
    const pin = (gerente as any).pinAcesso || '(sem PIN)';
    const nome = gerente.apelido || gerente.nome;
    return (
      `Olá ${nome}! 👋\n\n` +
      `Aqui está seu acesso ao ranking da equipe:\n\n` +
      `🔗 *Link:* ${link}\n` +
      `🔑 *Seu PIN:* ${pin}\n\n` +
      `Você pode acompanhar o ranking completo, ver o faturamento da unidade e enviar mensagens de motivação para a equipe! 💪\n\n` +
      `_Acesso exclusivo gerencial — seu nome não aparece na competição._`
    );
  };

  const abrirNovo = () => {
    setForm(emptyForm);
    setModalAberto(true);
  };

  const abrirEditar = (p: Profissional) => {
    setForm({
      id: p.id,
      nome: p.nome,
      apelido: p.apelido ?? "",
      cargo: p.cargo ?? "Barbeiro",
      cashbarberProfissionalId: p.cashbarberProfissionalId?.toString() ?? "",
      exibirNoRanking: p.exibirNoRanking,
      ativo: p.ativo,
      isGerencia: p.isGerencia ?? false,
      categoriaRanking: p.categoriaRanking ?? 'barbeiro',
       pinAcesso: (p as any).pinAcesso ?? "",
      metaMensal: (p as any).metaMensal ? String((p as any).metaMensal) : "",
      telefone: (p as any).telefone ?? "",
    });
    setModalAberto(true);
  };
  const handleSalvar = () => {
    if (!form.nome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    salvar.mutate({
      id: form.id,
      nome: form.nome.trim(),
      apelido: form.apelido.trim() || null,
      cargo: form.cargo,
      cashbarberProfissionalId: form.cashbarberProfissionalId
        ? parseInt(form.cashbarberProfissionalId)
        : null,
      exibirNoRanking: form.exibirNoRanking,
      ativo: form.ativo,
      isGerencia: form.isGerencia,
      categoriaRanking: form.categoriaRanking,
      pinAcesso: form.pinAcesso.trim() || null,
      metaMensal: form.metaMensal ? parseFloat(form.metaMensal.replace(',', '.')) : null,
      telefone: form.telefone.trim() || null,
    });
  };

  const filtrados = profissionais.filter((p) => {
    const q = busca.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      (p.apelido ?? "").toLowerCase().includes(q) ||
      (p.cargo ?? "").toLowerCase().includes(q)
    );
  });

  const totalAtivos = profissionais.filter((p) => p.ativo).length;
  const totalVinculados = profissionais.filter((p) => p.cashbarberProfissionalId).length;
  const totalSemId = profissionais.filter((p) => p.ativo && !p.cashbarberProfissionalId).length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Scissors className="w-6 h-6 text-blue-400" />
              Profissionais
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Gerencie os profissionais e vincule ao CashBarber para sincronização automática
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
              <select
                value={syncMes}
                onChange={(e) => setSyncMes(Number(e.target.value))}
                className="bg-transparent text-white/70 text-sm border-none outline-none cursor-pointer"
              >
                {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                  <option key={i+1} value={i+1} className="bg-gray-900">{m}</option>
                ))}
              </select>
              <select
                value={syncAno}
                onChange={(e) => setSyncAno(Number(e.target.value))}
                className="bg-transparent text-white/70 text-sm border-none outline-none cursor-pointer"
              >
                {[hoje.getFullYear(), hoje.getFullYear()-1, hoje.getFullYear()-2].map((y) => (
                  <option key={y} value={y} className="bg-gray-900">{y}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => syncFotos.mutate()}
              disabled={syncFotos.isPending}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Camera className={`w-4 h-4 mr-2 ${syncFotos.isPending ? 'animate-pulse' : ''}`} />
              {syncFotos.isPending ? 'Sincronizando...' : 'Sync Fotos'}
            </Button>
            <Button
              onClick={() => sincronizar.mutate({ mes: syncMes, ano: syncAno })}
              disabled={sincronizar.isPending}
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${sincronizar.isPending ? 'animate-spin' : ''}`} />
              {sincronizar.isPending ? 'Sincronizando...' : 'Sincronizar CashBarber'}
            </Button>
            <Button
              onClick={() => setLocation('/ranking')}
              variant="outline"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Ver Ranking
            </Button>
            <Button
              onClick={() => gerarMensagensRanking.mutate({ appUrl: window.location.origin })}
              disabled={gerarMensagensRanking.isPending}
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <MessageSquare className={`w-4 h-4 mr-2 ${gerarMensagensRanking.isPending ? 'animate-pulse' : ''}`} />
              {gerarMensagensRanking.isPending ? 'Gerando...' : 'Ranking WhatsApp'}
            </Button>
            <Button
              onClick={() => {
                // Abre o modal de seleção de unidade para compartilhar no grupo
                setRankingGrupoData(null);
                setRankingGrupoEmpresaSlug(empresasData[0]?.slug ?? "");
                setRankingGrupoMes(hoje.getMonth() + 1);
                setRankingGrupoAno(hoje.getFullYear());
                setModalRankingGrupo(true);
              }}
              variant="outline"
              className="border-green-500/30 text-green-400 hover:bg-green-500/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Ranking no Grupo
            </Button>
            <Button
              onClick={() => dispararPushRanking.mutate()}
              disabled={dispararPushRanking.isPending}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              title="Envia push de ranking agora para todos os profissionais com notificação ativa"
            >
              <Bell className={`w-4 h-4 mr-2 ${dispararPushRanking.isPending ? 'animate-pulse' : ''}`} />
              {dispararPushRanking.isPending ? 'Enviando...' : 'Testar Push'}
            </Button>
            {gerentes.length > 0 && (
              <Button
                onClick={() => setModalPinGerentes(true)}
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                title="Enviar PIN de acesso para gerentes via WhatsApp"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                PIN Gerentes
              </Button>
            )}
            <Button
              onClick={abrirNovo}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Profissional
            </Button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Total Ativos</p>
              <p className="text-white text-xl font-bold">{totalAtivos}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Vinculados ao CashBarber</p>
              <p className="text-white text-xl font-bold">{totalVinculados}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Sem ID CashBarber</p>
              <p className="text-white text-xl font-bold">{totalSemId}</p>
            </div>
          </div>
        </div>

        {/* Cards de Faturamento da Unidade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {empresasData.map((empresa) => {
            const profissionaisEmpresa = profissionais.filter(p => p.empresaSlug === empresa.slug && p.ativo);
            const totalFaturamento = profissionaisEmpresa.reduce((sum, p) => sum + ((p as any).totalMes ?? 0), 0);
            const metaMensal = 100000; // Ajustar conforme necessário
            const diasNoMes = 30;
            const hoje = new Date();
            const diasPassados = hoje.getDate();
            const mediaDiaria = diasPassados > 0 ? totalFaturamento / diasPassados : 0;
            const projecao = mediaDiaria * diasNoMes;
            const falta = Math.max(0, metaMensal - totalFaturamento);
            const percentualMeta = (totalFaturamento / metaMensal) * 100;
            
            const corProjecao = projecao >= metaMensal ? 'text-green-400' : projecao >= metaMensal * 0.85 ? 'text-yellow-400' : 'text-red-400';
            
            return (
              <div key={empresa.slug} className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">{empresa.nome}</h3>
                  <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">{profissionaisEmpresa.length} prof.</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Faturamento:</span>
                    <span className="text-white font-bold">R$ {totalFaturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Média/dia:</span>
                    <span className="text-blue-400 font-semibold">R$ {mediaDiaria.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Projeção:</span>
                    <span className={`font-semibold ${corProjecao}`}>R$ {projecao.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Falta:</span>
                    <span className="text-orange-400 font-semibold">R$ {falta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mt-2">
                    <div 
                      className={`h-full transition-all ${
                        percentualMeta >= 100 ? 'bg-green-500' : 
                        percentualMeta >= 85 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{width: `${Math.min(percentualMeta, 100)}%`}}
                    />
                  </div>
                  <div className="text-xs text-white/50 text-right">{percentualMeta.toFixed(1)}% da meta</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por nome, apelido ou cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {/* Tabela de profissionais */}
        {isLoading ? (
          <div className="text-center py-12 text-white/40">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            {busca ? "Nenhum profissional encontrado." : "Nenhum profissional cadastrado."}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Profissional
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Apelido (Ranking)
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    ID CashBarber
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Ranking
                  </th>
                  <th className="text-left px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-white/50 text-xs font-medium uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      !p.ativo ? "opacity-50" : ""
                    } ${idx % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt={p.nome} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {p.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-white font-medium">{p.nome}</span>
                      </div>
                    </td>
                    {/* Apelido */}
                    <td className="px-4 py-3">
                      {p.apelido ? (
                        <span className="text-blue-300 font-medium">{p.apelido}</span>
                      ) : (
                        <span className="text-white/30 text-sm italic">Igual ao nome</span>
                      )}
                    </td>
                    {/* Cargo */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="border-white/20 text-white/70 text-xs"
                      >
                        {p.cargo ?? "—"}
                      </Badge>
                    </td>
                    {/* Categoria Ranking */}
                    <td className="px-4 py-3">
                      {p.categoriaRanking === 'barbeiro' && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">✂️ Barbeiro</Badge>
                      )}
                      {p.categoriaRanking === 'auxiliar' && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">💇 Auxiliar</Badge>
                      )}
                      {p.categoriaRanking === 'recepcao' && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">💼 Recepção</Badge>
                      )}
                    </td>
                    {/* ID CashBarber */}
                    <td className="px-4 py-3">
                      {p.cashbarberProfissionalId ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          <span className="text-green-300 font-mono text-sm">
                            #{p.cashbarberProfissionalId}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="text-orange-300 text-sm">Não vinculado</span>
                        </div>
                      )}
                    </td>
                    {/* Exibir no Ranking */}
                    <td className="px-4 py-3">
                      {p.isGerencia ? (
                        <div className="flex items-center gap-1.5 text-amber-300 text-sm">
                          <span className="text-base">💼</span>
                          Gerência
                        </div>
                      ) : p.exibirNoRanking ? (
                        <div className="flex items-center gap-1.5 text-blue-300 text-sm">
                          <Eye className="w-4 h-4" />
                          Visível
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-white/30 text-sm">
                          <EyeOff className="w-4 h-4" />
                          Oculto
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtivo.mutate({ id: p.id, ativo: !p.ativo })}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        {p.ativo ? (
                          <span className="flex items-center gap-1.5 text-green-400">
                            <UserCheck className="w-4 h-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-white/30">
                            <UserCheck className="w-4 h-4" />
                            Inativo
                          </span>
                        )}
                      </button>
                    </td>
                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => abrirEditar(p)}
                          className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de cadastro/edição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-blue-400" />
              {form.id ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Nome Completo <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Cleison Santos"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            {/* Apelido */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Apelido{" "}
                <span className="text-white/40 font-normal">(nome exibido no ranking)</span>
              </Label>
              <Input
                value={form.apelido}
                onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                placeholder="Ex: Clei (deixe vazio para usar o nome completo)"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-white/30 text-xs">
                Se preenchido, este nome aparecerá no ranking público em vez do nome completo.
              </p>
            </div>

            {/* Cargo */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Cargo</Label>
              <Select
                value={form.cargo}
                onValueChange={(v) => setForm({ ...form, cargo: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  {CARGOS.map((c) => (
                    <SelectItem key={c} value={c} className="text-white hover:bg-white/10">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria no Ranking */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Categoria no Ranking</Label>
              <Select
                value={form.categoriaRanking}
                onValueChange={(v) => setForm({ ...form, categoriaRanking: v as 'barbeiro' | 'auxiliar' | 'recepcao' })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="barbeiro" className="text-white hover:bg-white/10">
                    ✂️ Barbeiro
                  </SelectItem>
                  <SelectItem value="auxiliar" className="text-white hover:bg-white/10">
                    💇 Auxiliar
                  </SelectItem>
                  <SelectItem value="recepcao" className="text-white hover:bg-white/10">
                    💼 Recepção
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-white/30 text-xs">
                Define em qual aba do ranking este profissional aparecerá.
              </p>
            </div>

            {/* ID CashBarber */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                ID do Profissional no CashBarber{" "}
                <span className="text-red-400 font-semibold text-xs">* obrigatório</span>
              </Label>
              <Input
                type="number"
                value={form.cashbarberProfissionalId}
                onChange={(e) =>
                  setForm({ ...form, cashbarberProfissionalId: e.target.value })
                }
                placeholder="Ex: 42"
                className={`bg-white/5 text-white placeholder:text-white/30 ${
                  !form.cashbarberProfissionalId
                    ? 'border-red-500/60 focus-visible:ring-red-500/40'
                    : 'border-green-500/50'
                }`}
              />
              {!form.cashbarberProfissionalId ? (
                <p className="text-red-400/80 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Obrigatório — sem este ID o profissional não aparece no ranking.
                </p>
              ) : (
                <p className="text-green-400/70 text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ID vinculado ao CashBarber.
                </p>
              )}
              <p className="text-white/30 text-xs">
                Encontre em: CashBarber → Minha Empresa → Listagem Profissionais → coluna ID.
              </p>
            </div>

            {/* PIN de Acesso */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                PIN de Acesso{" "}
                <span className="text-white/40 font-normal">(números ou letras, até 20 caracteres)</span>
              </Label>
              <Input
                type="text"
                maxLength={20}
                value={form.pinAcesso}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 20);
                  setForm({ ...form, pinAcesso: v });
                }}
                placeholder="Ex: 1234 ou DANIELA123"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 tracking-widest text-center text-lg"
              />
               <p className="text-white/30 text-xs">
                O profissional usa este PIN para acessar o ranking no celular em{" "}
                <span className="text-blue-400">/pro</span>
              </p>
            </div>
            {/* WhatsApp */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                📱 WhatsApp{" "}
                <span className="text-white/40 font-normal">(DDD + número, sem espaços)</span>
              </Label>
              <Input
                type="tel"
                value={form.telefone}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 15);
                  setForm({ ...form, telefone: v });
                }}
                placeholder="Ex: 11999998888"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-white/30 text-xs">
                Usado para enviar o link de acesso ao ranking e mensagens de desempenho via WhatsApp
              </p>
            </div>
            {/* Meta Mensal Individual */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                Meta Mensal Individual{" "}
                <span className="text-white/40 font-normal">(R$, opcional)</span>
              </Label>
              <Input
                type="text"
                value={form.metaMensal}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.,]/g, '');
                  setForm({ ...form, metaMensal: v });
                }}
                placeholder="Ex: 4000"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-white/30 text-xs">
                Quando definida, o ranking exibe o % de atingimento da meta (ex: 89%)
              </p>
            </div>
            {/* É Gerência */}
            <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div>
                <p className="text-amber-300 text-sm font-medium">💼 É Gerência</p>
                <p className="text-white/40 text-xs">
                  Gerentes visualizam o ranking completo mas não aparecem na competição
                </p>
              </div>
              <Switch
                checked={form.isGerencia}
                onCheckedChange={(v) => setForm({ ...form, isGerencia: v })}
              />
            </div>

            {/* Exibir no Ranking */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="text-white text-sm font-medium">Exibir no Ranking Público</p>
                <p className="text-white/40 text-xs">
                  Quando ativo, aparece no placar de faturamento
                </p>
              </div>
              <Switch
                checked={form.exibirNoRanking}
                onCheckedChange={(v) => setForm({ ...form, exibirNoRanking: v })}
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="text-white text-sm font-medium">Profissional Ativo</p>
                <p className="text-white/40 text-xs">
                  Desative para ocultar sem excluir o histórico
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setModalAberto(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={salvar.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {salvar.isPending ? "Salvando..." : form.id ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={() => setConfirmDeleteId(null)}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/60 text-sm py-2">
            Tem certeza que deseja remover este profissional? Esta ação não pode ser
            desfeita. O histórico de faturamento será mantido.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteId(null)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => confirmDeleteId && deletar.mutate({ id: confirmDeleteId })}
              disabled={deletar.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletar.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Mensagens de Ranking WhatsApp */}
      <Dialog open={modalRankingWa} onOpenChange={setModalRankingWa}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Mensagens de Ranking — {mensagensRankingMeta?.nomeMes}/{mensagensRankingMeta?.ano}
            </DialogTitle>
          </DialogHeader>
          {mensagensRankingMeta && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                <p className="text-emerald-400 text-xl font-bold">{mensagensRankingMeta.comTelefone}</p>
                <p className="text-white/50 text-xs">Com link WhatsApp</p>
              </div>
              <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                <p className="text-amber-400 text-xl font-bold">{mensagensRankingMeta.semTelefone}</p>
                <p className="text-white/50 text-xs">Sem telefone cadastrado</p>
              </div>
              <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                <p className="text-blue-400 text-xl font-bold">{mensagensRanking.length}</p>
                <p className="text-white/50 text-xs">Total no ranking</p>
              </div>
            </div>
          )}
          <p className="text-white/40 text-xs mb-3">
            Clique em “Abrir WhatsApp” para enviar a mensagem diretamente para cada profissional.
            Profissionais sem telefone cadastrado não terão o botão disponível.
          </p>
          <div className="space-y-3">
            {mensagensRanking.map((m) => {
              const medalha = m.posicao === 1 ? '🥇' : m.posicao === 2 ? '🥈' : m.posicao === 3 ? '🥉' : `${m.posicao}º`;
              const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              return (
                <div key={m.colaboradorId} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Cabeçalho do profissional */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{medalha}</span>
                        <span className="text-white font-semibold text-sm">{m.apelido || m.nome}</span>
                        {m.telefone ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <Phone className="w-2.5 h-2.5" />{m.telefone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Sem telefone</span>
                        )}
                      </div>
                      {/* Stats rápidos */}
                      <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                        <span className="bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-full">
                          Fat. {fmtBRL(m.totalGeral)}
                        </span>
                        {m.faltaParaSubir !== null && m.faltaParaSubir > 0 && (
                          <span className="bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
                            🎯 Falta {fmtBRL(m.faltaParaSubir)} para subir
                          </span>
                        )}
                        {m.posicao === 1 && (
                          <span className="bg-yellow-500/15 text-yellow-300 px-2 py-0.5 rounded-full">
                            👑 Líder do ranking
                          </span>
                        )}
                      </div>
                      {/* Preview da mensagem */}
                      <details className="group">
                        <summary className="text-white/30 text-[10px] cursor-pointer hover:text-white/50 transition-colors mb-1 select-none">
                          Ver prévia da mensagem ▾
                        </summary>
                        <pre className="text-white/50 text-[10px] whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-3 leading-relaxed mt-1 border border-white/5">{m.mensagem}</pre>
                      </details>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {m.linkWhatsApp ? (
                        <a
                          href={m.linkWhatsApp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Enviar
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/30 text-center">Sem telefone</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setModalRankingWa(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Ranking para Grupo de WhatsApp ─── */}
      <Dialog open={modalRankingGrupo} onOpenChange={setModalRankingGrupo}>
        <DialogContent className="bg-[#0f1117] border border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Share2 className="w-5 h-5 text-green-400" />
              Compartilhar Ranking no Grupo
            </DialogTitle>
          </DialogHeader>

          {/* Seletor de tipo de período */}
          <div className="mb-3">
            <Label className="text-white/60 text-xs mb-1 block">Período</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={rankingGrupoPeriodo === 'mensal' ? 'default' : 'outline'}
                className={rankingGrupoPeriodo === 'mensal' ? 'flex-1 bg-green-600 hover:bg-green-700 text-white' : 'flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
                onClick={() => { setRankingGrupoPeriodo('mensal'); setRankingGrupoData(null); }}
              >
                📅 Mensal
              </Button>
              <Button
                size="sm"
                variant={rankingGrupoPeriodo === 'semanal' ? 'default' : 'outline'}
                className={rankingGrupoPeriodo === 'semanal' ? 'flex-1 bg-blue-600 hover:bg-blue-700 text-white' : 'flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
                onClick={() => { setRankingGrupoPeriodo('semanal'); setRankingGrupoData(null); }}
              >
                ⚡ Semana Atual
              </Button>
            </div>
          </div>

          {/* Seletores de mês/ano (apenas para período mensal) */}
          {rankingGrupoPeriodo === 'mensal' && (
          <div className="grid grid-cols-2 gap-3 mb-1">
            {/* Mês */}
            <div>
              <Label className="text-white/60 text-xs mb-1 block">Mês</Label>
              <Select
                value={String(rankingGrupoMes)}
                onValueChange={(v) => { setRankingGrupoMes(Number(v)); setRankingGrupoData(null); }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)} className="text-white hover:bg-white/10">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Ano */}
            <div>
              <Label className="text-white/60 text-xs mb-1 block">Ano</Label>
              <Select
                value={String(rankingGrupoAno)}
                onValueChange={(v) => { setRankingGrupoAno(Number(v)); setRankingGrupoData(null); }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  {Array.from({ length: 4 }, (_, i) => hoje.getFullYear() - i).map((a) => (
                    <SelectItem key={a} value={String(a)} className="text-white hover:bg-white/10">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {/* Informativo para período semanal */}
          {rankingGrupoPeriodo === 'semanal' && (
            <div className="mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
              ⚡ Gera o ranking da semana atual (segunda a domingo) via CashBarber em tempo real.
            </div>
          )}

          {/* Seletor de unidade (quando há mais de uma) */}
          {empresasData.length > 1 && (
            <div className="mb-3">
              <Label className="text-white/60 text-xs mb-1 block">Unidade</Label>
              <Select
                value={rankingGrupoEmpresaSlug}
                onValueChange={(v) => { setRankingGrupoEmpresaSlug(v); setRankingGrupoData(null); }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-white/10">
                  {empresasData.map((e) => (
                    <SelectItem key={e.slug} value={e.slug} className="text-white hover:bg-white/10">
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Botão gerar */}
          {!rankingGrupoData && (
            <Button
              onClick={() => {
                if (!rankingGrupoEmpresaSlug) {
                  toast.error("Selecione uma unidade.");
                  return;
                }
                gerarRankingGrupo.mutate({
                  empresaSlug: rankingGrupoEmpresaSlug,
                  mes: rankingGrupoMes,
                  ano: rankingGrupoAno,
                  periodo: rankingGrupoPeriodo,
                  appUrl: window.location.origin,
                });
              }}
              disabled={gerarRankingGrupo.isPending || !rankingGrupoEmpresaSlug}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Share2 className={`w-4 h-4 mr-2 ${gerarRankingGrupo.isPending ? 'animate-pulse' : ''}`} />
              {gerarRankingGrupo.isPending ? 'Gerando mensagem...' : 'Gerar Mensagem do Ranking'}
            </Button>
          )}

          {/* Resultado */}
          {rankingGrupoData && (
            <div className="space-y-4">
              {/* Stats rápidos */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[10px] mb-0.5">Profissionais</p>
                  <p className="text-white font-bold text-sm">{rankingGrupoData.totalProfissionais}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[10px] mb-0.5">Faturamento</p>
                  <p className="text-green-400 font-bold text-xs">{rankingGrupoData.fatUnidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/40 text-[10px] mb-0.5">Meta</p>
                  <p className={`font-bold text-sm ${rankingGrupoData.pctMeta !== null ? (rankingGrupoData.pctMeta >= 100 ? 'text-green-400' : rankingGrupoData.pctMeta >= 70 ? 'text-yellow-400' : 'text-red-400') : 'text-white/40'}`}>
                    {rankingGrupoData.pctMeta !== null ? `${rankingGrupoData.pctMeta}%` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Preview da mensagem */}
              <div>
                <p className="text-white/40 text-xs mb-1">Prévia da mensagem:</p>
                <pre className="text-white/70 text-[11px] whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3 leading-relaxed border border-white/5 max-h-48 overflow-y-auto">{rankingGrupoData.mensagem}</pre>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col gap-2">
                {/* Copiar mensagem */}
                <Button
                  variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10 w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(rankingGrupoData.mensagem);
                    setCopiado(true);
                    toast.success("Mensagem copiada!");
                    setTimeout(() => setCopiado(false), 2500);
                  }}
                >
                  {copiado ? <CheckCheck className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiado ? 'Copiado!' : 'Copiar Mensagem'}
                </Button>

                {/* Compartilhar via WhatsApp (abre seletor de contato) */}
                <a
                  href={rankingGrupoData.linkCompartilhar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full"
                >
                  <Send className="w-4 h-4" />
                  Compartilhar via WhatsApp
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>

                {/* Link direto para o grupo (se cadastrado) */}
                {rankingGrupoData.grupoLink && (
                  <a
                    href={rankingGrupoData.grupoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full"
                  >
                    <Link2 className="w-4 h-4" />
                    Abrir Grupo da Equipe
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                )}

                {/* Gerar novamente */}
                <Button
                  variant="ghost"
                  className="text-white/40 hover:text-white/70 text-xs"
                  onClick={() => setRankingGrupoData(null)}
                >
                  Gerar novamente
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="ghost"
              onClick={() => setModalRankingGrupo(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: PIN de Acesso para Gerentes */}
      <Dialog open={modalPinGerentes} onOpenChange={setModalPinGerentes}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Acesso Gerencial — Enviar PIN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-white/60 text-sm">
              Envie o link e PIN de acesso para as gerentes via WhatsApp.
              Elas poderão acompanhar o ranking completo sem aparecer na competição.
            </p>

            {gerentes.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">Nenhuma gerente cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {gerentes.map((gerente: any) => {
                  const mensagem = gerarMensagemAcessoGerente(gerente);
                  const telefone = gerente.telefone?.replace(/\D/g, '');
                  const linkWa = telefone
                    ? `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`
                    : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
                  const temPin = !!(gerente as any).pinAcesso;
                  const temTelefone = !!gerente.telefone;

                  return (
                    <div key={gerente.id} className="bg-white/5 rounded-xl p-4 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{gerente.nome}</p>
                            <p className="text-white/40 text-xs">
                              {gerente.empresaSlug} • PIN: {temPin ? <span className="text-amber-300 font-mono">{(gerente as any).pinAcesso}</span> : <span className="text-red-400">sem PIN</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!temPin && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Sem PIN</span>
                          )}
                          {!temTelefone && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Sem telefone</span>
                          )}
                        </div>
                      </div>

                      {/* Preview da mensagem */}
                      <pre className="text-white/60 text-[11px] whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3 leading-relaxed border border-white/5 max-h-32 overflow-y-auto mb-3">{mensagem}</pre>

                      {/* Botões */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white/70 hover:bg-white/10 flex-1 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(mensagem);
                            toast.success('Mensagem copiada!');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 text-xs"
                          onClick={() => window.open(linkWa, '_blank')}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          {temTelefone ? 'Enviar WhatsApp' : 'Compartilhar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                          onClick={() => abrirEditar(gerente)}
                          title="Editar PIN ou telefone"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModalPinGerentes(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
