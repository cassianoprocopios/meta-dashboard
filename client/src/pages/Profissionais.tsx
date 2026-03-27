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
} from "lucide-react";

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
};

type FormData = {
  id?: number;
  nome: string;
  apelido: string;
  cargo: string;
  cashbarberProfissionalId: string;
  exibirNoRanking: boolean;
  ativo: boolean;
};

const emptyForm: FormData = {
  nome: "",
  apelido: "",
  cargo: "Barbeiro",
  cashbarberProfissionalId: "",
  exibirNoRanking: true,
  ativo: true,
};

export default function Profissionais() {
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
          <Button
            onClick={abrirNovo}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Profissional
          </Button>
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {p.nome.charAt(0).toUpperCase()}
                        </div>
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

            {/* ID CashBarber */}
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">
                ID do Profissional no CashBarber{" "}
                <span className="text-white/40 font-normal">(opcional)</span>
              </Label>
              <Input
                type="number"
                value={form.cashbarberProfissionalId}
                onChange={(e) =>
                  setForm({ ...form, cashbarberProfissionalId: e.target.value })
                }
                placeholder="Ex: 42"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-white/30 text-xs">
                Encontre em: CashBarber → Minha Empresa → Listagem Profissionais → coluna ID.
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
