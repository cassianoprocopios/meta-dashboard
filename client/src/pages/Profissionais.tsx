import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Scissors,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Link2,
  UserX,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ColaboradorForm {
  id?: number;
  nome: string;
  apelido: string;
  cargo: string;
  cashbarberProfissionalId: string;
  exibirNoRanking: number;
  ativo: number;
}

const FORM_VAZIO: ColaboradorForm = {
  nome: "",
  apelido: "",
  cargo: "barbeiro",
  cashbarberProfissionalId: "",
  exibirNoRanking: 1,
  ativo: 1,
};

export default function Profissionais() {
  const { user } = useAuth();

  const [empresaSlug, setEmpresaSlug] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<ColaboradorForm>(FORM_VAZIO);
  const [desativarId, setDesativarId] = useState<number | null>(null);

  const empresasQuery = trpc.empresa.listar.useQuery(undefined, { enabled: !!user });
  const empresas = empresasQuery.data ?? [];
  const empresaAtual = empresaSlug || empresas[0]?.slug || "";

  const colaboradoresQuery = trpc.colaboradores.listar.useQuery(
    { empresaSlug: empresaAtual },
    { enabled: !!empresaAtual }
  );
  const colaboradores = colaboradoresQuery.data ?? [];

  // Filtrar por busca
  const colaboradoresFiltrados = useMemo(() => {
    if (!busca.trim()) return colaboradores;
    const q = busca.toLowerCase();
    return colaboradores.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.apelido ?? "").toLowerCase().includes(q) ||
        (c.cargo ?? "").toLowerCase().includes(q)
    );
  }, [colaboradores, busca]);

  const totalAtivos = colaboradores.filter((c) => c.ativo).length;
  const totalComCB = colaboradores.filter((c) => c.cashbarberProfissionalId).length;
  const totalSemCB = colaboradores.filter((c) => !c.cashbarberProfissionalId && c.ativo).length;

  const salvarMutation = trpc.colaboradores.salvar.useMutation({
    onSuccess: () => {
      toast.success(form.id ? "Profissional atualizado!" : "Profissional cadastrado!");
      setDialogAberto(false);
      setForm(FORM_VAZIO);
      colaboradoresQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const desativarMutation = trpc.colaboradores.desativar.useMutation({
    onSuccess: () => {
      toast.success("Profissional desativado.");
      setDesativarId(null);
      colaboradoresQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleRankingMutation = trpc.colaboradores.salvar.useMutation({
    onSuccess: () => colaboradoresQuery.refetch(),
    onError: (err) => toast.error(err.message),
  });

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  };

  const abrirEditar = (col: (typeof colaboradores)[0]) => {
    setForm({
      id: col.id,
      nome: col.nome,
      apelido: col.apelido ?? "",
      cargo: col.cargo ?? "barbeiro",
      cashbarberProfissionalId: col.cashbarberProfissionalId
        ? String(col.cashbarberProfissionalId)
        : "",
      exibirNoRanking: col.exibirNoRanking,
      ativo: col.ativo,
    });
    setDialogAberto(true);
  };

  const handleSalvar = () => {
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    salvarMutation.mutate({
      id: form.id,
      empresaSlug: empresaAtual,
      nome: form.nome.trim(),
      apelido: form.apelido.trim() || undefined,
      cargo: form.cargo.trim() || undefined,
      cashbarberProfissionalId: form.cashbarberProfissionalId
        ? parseInt(form.cashbarberProfissionalId)
        : null,
      exibirNoRanking: form.exibirNoRanking,
      ativo: form.ativo,
    });
  };

  const handleToggleRanking = (col: (typeof colaboradores)[0]) => {
    toggleRankingMutation.mutate({
      id: col.id,
      empresaSlug: empresaAtual,
      nome: col.nome,
      exibirNoRanking: col.exibirNoRanking === 1 ? 0 : 1,
    });
  };

  const isAdmin = user?.role === "admin" || user?.perfil === "gerente";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scissors className="w-6 h-6 text-primary" />
              Profissionais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os profissionais e vincule-os ao CashBarber
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {empresas.length > 1 && (
              <Select value={empresaAtual} onValueChange={setEmpresaSlug}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => colaboradoresQuery.refetch()}
              disabled={colaboradoresQuery.isFetching}
            >
              <RefreshCw
                className={`w-4 h-4 ${colaboradoresQuery.isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={abrirNovo}>
                <Plus className="w-4 h-4 mr-1" />
                Novo Profissional
              </Button>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{totalAtivos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Vinculados CB
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalComCB}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-orange-500" /> Sem ID CB
              </p>
              <p className="text-2xl font-bold text-orange-500">{totalSemCB}</p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, apelido ou cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista de profissionais */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              Profissionais
              {empresaAtual && (
                <Badge variant="secondary" className="ml-auto">
                  {colaboradoresFiltrados.length} resultado(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaboradoresQuery.isLoading ? (
              <div className="text-center py-10 text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-40" />
                Carregando...
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Scissors className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Nenhum profissional encontrado.</p>
                {isAdmin && (
                  <p className="text-xs mt-1">
                    Clique em "Novo Profissional" para cadastrar.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {colaboradoresFiltrados.map((col) => {
                  const nome = col.apelido || col.nome;
                  const iniciais = nome
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const temCB = !!col.cashbarberProfissionalId;

                  return (
                    <div
                      key={col.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        col.ativo
                          ? "bg-card hover:bg-muted/30"
                          : "bg-muted/20 opacity-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {col.fotoUrl ? (
                          <img
                            src={col.fotoUrl}
                            alt={nome}
                            className="w-11 h-11 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                            {iniciais}
                          </div>
                        )}
                        {/* Indicador de status CashBarber */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                            temCB ? "bg-green-500" : "bg-orange-400"
                          }`}
                          title={
                            temCB
                              ? `Vinculado ao CashBarber (ID: ${col.cashbarberProfissionalId})`
                              : "Sem ID do CashBarber"
                          }
                        />
                      </div>

                      {/* Dados */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{col.nome}</p>
                          {col.apelido && col.apelido !== col.nome && (
                            <span className="text-xs text-muted-foreground">
                              ({col.apelido})
                            </span>
                          )}
                          {!col.ativo && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {col.cargo && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {col.cargo}
                            </span>
                          )}
                          {temCB ? (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              CB #{col.cashbarberProfissionalId}
                            </span>
                          ) : (
                            <span className="text-xs text-orange-500 flex items-center gap-1">
                              <Link2 className="w-3 h-3" />
                              Sem ID CashBarber
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Toggle ranking */}
                          <Button
                            size="sm"
                            variant="ghost"
                            title={
                              col.exibirNoRanking
                                ? "Ocultar do ranking"
                                : "Exibir no ranking"
                            }
                            onClick={() => handleToggleRanking(col)}
                          >
                            {col.exibirNoRanking ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          {/* Editar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Editar profissional"
                            onClick={() => abrirEditar(col)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {/* Desativar */}
                          {col.ativo ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Desativar profissional"
                              onClick={() => setDesativarId(col.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nota sobre ID CashBarber */}
        {totalSemCB > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-orange-500/30 bg-orange-500/5 text-sm">
            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-orange-600 dark:text-orange-400">
                {totalSemCB} profissional(is) sem ID do CashBarber
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Para sincronizar serviços e produtos via CashBarber, edite cada profissional e
                informe o ID. Acesse: CashBarber → Relatório → Financeiro/Vendas → selecione o
                profissional para localizar o ID.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de cadastro/edição */}
      <Dialog
        open={dialogAberto}
        onOpenChange={(o) => {
          if (!o) {
            setDialogAberto(false);
            setForm(FORM_VAZIO);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              {form.id ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Nome completo <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Ex: João Silva"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>

            {/* Apelido */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Apelido{" "}
                <span className="text-muted-foreground text-xs">(exibido no ranking)</span>
              </label>
              <Input
                placeholder="Ex: João"
                value={form.apelido}
                onChange={(e) => setForm({ ...form, apelido: e.target.value })}
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Cargo</label>
              <Select
                value={form.cargo}
                onValueChange={(v) => setForm({ ...form, cargo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barbeiro">Barbeiro</SelectItem>
                  <SelectItem value="cabeleireiro">Cabeleireiro</SelectItem>
                  <SelectItem value="manicure">Manicure</SelectItem>
                  <SelectItem value="esteticista">Esteticista</SelectItem>
                  <SelectItem value="recepcionista">Recepcionista</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID CashBarber */}
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                ID do Profissional no CashBarber
              </label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 12345"
                value={form.cashbarberProfissionalId}
                onChange={(e) =>
                  setForm({ ...form, cashbarberProfissionalId: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Acesse CashBarber → Relatório → Financeiro/Vendas → selecione o profissional.
                O ID aparece na URL ou nos filtros.
              </p>
            </div>

            {/* Exibir no ranking */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Exibir no ranking público</p>
                <p className="text-xs text-muted-foreground">
                  Aparece no placar visível para a equipe
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    exibirNoRanking: form.exibirNoRanking === 1 ? 0 : 1,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  form.exibirNoRanking === 1 ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.exibirNoRanking === 1 ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAberto(false);
                setForm(FORM_VAZIO);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvarMutation.isPending}>
              {salvarMutation.isPending
                ? "Salvando..."
                : form.id
                ? "Salvar alterações"
                : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de desativação */}
      <AlertDialog
        open={desativarId !== null}
        onOpenChange={(o) => !o && setDesativarId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              O profissional será removido do ranking e não aparecerá nas sincronizações.
              Esta ação pode ser revertida editando o profissional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => desativarId && desativarMutation.mutate({ id: desativarId })}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
