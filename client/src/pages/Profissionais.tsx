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
  categoriaRanking: 'barbeiro' | 'auxiliar' | 'recepcao';
  pinAcesso: string;
  metaMensal: string;
};
const emptyForm: FormData = {
  nome: "",
  apelido: "",
  cargo: "Barbeiro",
  cashbarberProfissionalId: "",
  exibirNoRanking: true,
  ativo: true,
  categoriaRanking: 'barbeiro',
  pinAcesso: "",
  metaMensal: "",
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
      categoriaRanking: p.categoriaRanking ?? 'barbeiro',
       pinAcesso: (p as any).pinAcesso ?? "",
      metaMensal: (p as any).metaMensal ? String((p as any).metaMensal) : "",
    });
    setModalAberto(true);
  };
  const handleSalvar = () => {
    if (!form.nome.trim()) {
      toast.error("O nome é obrigatório.");
      return;
    }
    const cbId = parseInt(form.cashbarberProfissionalId);
    if (!form.cashbarberProfissionalId || isNaN(cbId) || cbId <= 0) {
      toast.error("O ID do CashBarber é obrigatório. Encontre em: CashBarber → Minha Empresa → Listagem Profissionais → coluna ID.");
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
      categoriaRanking: form.categoriaRanking,
      pinAcesso: form.pinAcesso.trim() || null,
      metaMensal: form.metaMensal ? parseFloat(form.metaMensal.replace(',', '.')) : null,
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
                      {p.exibirNoRanking ? (
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
                <span className="text-white/40 font-normal">(4 dígitos)</span>
              </Label>
              <Input
                type="text"
                maxLength={4}
                value={form.pinAcesso}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm({ ...form, pinAcesso: v });
                }}
                placeholder="Ex: 1234"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 tracking-widest text-center text-lg"
              />
               <p className="text-white/30 text-xs">
                O profissional usa este PIN para acessar o ranking no celular em{" "}
                <span className="text-blue-400">/pro</span>
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
    </DashboardLayout>
  );
}
