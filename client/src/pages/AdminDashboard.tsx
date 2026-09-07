import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  KeyRound,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Building2,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordModalProps {
  user: {
    id: number;
    name: string | null;
    email: string | null;
  } | null;
  onClose: () => void;
}

function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const utils = trpc.useUtils();

  const redefinirSenha = trpc.adminDashboard.redefinirSenha.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
      onClose();
    },
    onError: (err) => {
      toast.error("Erro ao redefinir senha: " + err.message);
    },
  });

  const gerarSenhaAleatoria = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    let senha = "";
    for (let i = 0; i < 10; i++) {
      senha += chars[Math.floor(Math.random() * chars.length)];
    }
    setNovaSenha(senha);
    setConfirmarSenha(senha);
    setMostrarSenha(true);
  };

  const handleSubmit = () => {
    if (!user) return;
    if (novaSenha.length < 6) {
      toast.error("Senha muito curta — mínimo 6 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    redefinirSenha.mutate({ userId: user.id, novaSenha });
  };

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="premium-form-scope max-w-md border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#12233f]">
            <KeyRound className="w-5 h-5 text-blue-400" />
            Redefinir Senha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-400">Utilizador</p>
            <p className="font-medium text-[#12233f]">{user?.name || "—"}</p>
            <p className="text-sm text-slate-400">{user?.email || "—"}</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={gerarSenhaAleatoria}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Gerar Senha Aleatória
          </Button>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Nova Senha</label>
            <div className="relative">
              <Input
                type={mostrarSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
                className="bg-white/5 border-white/20 text-white pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Confirmar Senha</label>
            <Input
              type={mostrarSenha ? "text" : "password"}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirme a nova senha"
              className="bg-white/5 border-white/20 text-white"
            />
          </div>

          {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
            <p className="text-sm text-red-400">As senhas não coincidem</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={redefinirSenha.isPending || !novaSenha || novaSenha !== confirmarSenha}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {redefinirSenha.isPending ? "Salvando..." : "Redefinir Senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditTelefoneModalProps {
  user: {
    id: number;
    name: string | null;
    telefone: string | null;
  } | null;
  onClose: () => void;
}

function EditTelefoneModal({ user, onClose }: EditTelefoneModalProps) {
  const [telefone, setTelefone] = useState(user?.telefone || "");
  const utils = trpc.useUtils();

  const atualizarTelefone = trpc.adminDashboard.atualizarTelefone.useMutation({
    onSuccess: () => {
      toast.success("Telefone atualizado!");
      utils.adminDashboard.listarUtilizadores.invalidate();
      onClose();
    },
    onError: (err) => {
      toast.error("Erro ao atualizar telefone: " + err.message);
    },
  });

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="premium-form-scope max-w-sm border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#12233f]">
            <Phone className="w-5 h-5 text-green-400" />
            Editar Telefone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-400">
            Utilizador: <span className="text-[#12233f] font-medium">{user?.name}</span>
          </p>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Telefone</label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="bg-white/5 border-white/20 text-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button
            onClick={() => user && atualizarTelefone.mutate({ userId: user.id, telefone: telefone || null })}
            disabled={atualizarTelefone.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {atualizarTelefone.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AdminDashboardProps {
  onBack?: () => void;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { user: currentUser } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtroTenant, setFiltroTenant] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [userParaResetSenha, setUserParaResetSenha] = useState<{
    id: number;
    name: string | null;
    email: string | null;
  } | null>(null);
  const [userParaTelefone, setUserParaTelefone] = useState<{
    id: number;
    name: string | null;
    telefone: string | null;
  } | null>(null);

  const { data: utilizadores, isLoading, refetch } = trpc.adminDashboard.listarUtilizadores.useQuery();
  const { data: stats } = trpc.adminDashboard.stats.useQuery();
  const utils = trpc.useUtils();

  const toggleAtivo = trpc.adminDashboard.toggleAtivo.useMutation({
    onSuccess: () => {
      utils.adminDashboard.listarUtilizadores.invalidate();
      utils.adminDashboard.stats.invalidate();
      toast.success("Status atualizado!");
    },
    onError: (err) => {
      toast.error("Erro: " + err.message);
    },
  });

  // Lista de tenants únicos para o filtro
  const tenantsList = useMemo(() => {
    if (!utilizadores) return [];
    const map = new Map<string, string>();
    utilizadores.forEach((u) => {
      if (u.tenantId && u.tenantNome) {
        map.set(String(u.tenantId), u.tenantNome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [utilizadores]);

  // Filtros aplicados
  const utilizadoresFiltrados = useMemo(() => {
    if (!utilizadores) return [];
    return utilizadores.filter((u) => {
      const matchBusca =
        !busca ||
        (u.name?.toLowerCase().includes(busca.toLowerCase()) ?? false) ||
        (u.email?.toLowerCase().includes(busca.toLowerCase()) ?? false) ||
        (u.telefone?.includes(busca) ?? false);
      const matchTenant = filtroTenant === "todos" || String(u.tenantId) === filtroTenant;
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && u.ativo === 1) ||
        (filtroStatus === "inativo" && u.ativo === 0);
      return matchBusca && matchTenant && matchStatus;
    });
  }, [utilizadores, busca, filtroTenant, filtroStatus]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="premium-admin-scope min-h-screen bg-[#f5f7fa] text-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-slate-500 hover:text-[#12233f] mr-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#12233f]">Admin Dashboard</h1>
              <p className="text-xs text-slate-500">Gestão de Utilizadores</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-slate-500 hover:text-[#12233f]"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2035] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#12233f]">{stats?.total ?? "—"}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2035] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#12233f]">{stats?.ativos ?? "—"}</p>
                  <p className="text-xs text-slate-400">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2035] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#12233f]">{stats?.inativos ?? "—"}</p>
                  <p className="text-xs text-slate-400">Inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2035] border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#12233f]">{stats?.novosMes ?? "—"}</p>
                  <p className="text-xs text-slate-400">Novos este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="premium-panel">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, email ou telefone..."
                  className="pl-9 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <Select value={filtroTenant} onValueChange={setFiltroTenant}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-slate-200 text-slate-800">
                  <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Tenant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="todos" className="text-slate-700 hover:bg-slate-50">
                    Todos os tenants
                  </SelectItem>
                  {tenantsList.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-slate-700 hover:bg-slate-50">
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-40 bg-white border-slate-200 text-slate-800">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="todos" className="text-slate-700 hover:bg-slate-50">Todos</SelectItem>
                  <SelectItem value="ativo" className="text-slate-700 hover:bg-slate-50">Ativos</SelectItem>
                  <SelectItem value="inativo" className="text-slate-700 hover:bg-slate-50">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Utilizadores */}
        <Card className="premium-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#12233f] text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Utilizadores
              <Badge variant="secondary" className="bg-white/10 text-slate-300 text-xs">
                {utilizadoresFiltrados.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : utilizadoresFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-40" />
                <p>Nenhum utilizador encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-medium">Nome</TableHead>
                      <TableHead className="text-slate-400 font-medium">Email</TableHead>
                      <TableHead className="text-slate-400 font-medium">Telefone</TableHead>
                      <TableHead className="text-slate-400 font-medium">Tenant</TableHead>
                      <TableHead className="text-slate-400 font-medium">Perfil</TableHead>
                      <TableHead className="text-slate-400 font-medium">Status</TableHead>
                      <TableHead className="text-slate-400 font-medium">Último Acesso</TableHead>
                      <TableHead className="text-slate-400 font-medium text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilizadoresFiltrados.map((u) => (
                      <TableRow
                        key={u.id}
                        className="border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <TableCell className="text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {(u.name || "?")[0].toUpperCase()}
                            </div>
                            <span className="truncate max-w-[140px]">{u.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          <span className="truncate max-w-[180px] block">{u.email || "—"}</span>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm">
                          <div className="flex items-center gap-1">
                            <span>{u.telefone || <span className="text-slate-500 italic">—</span>}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-slate-500 hover:text-green-400 hover:bg-green-400/10"
                              onClick={() =>
                                setUserParaTelefone({
                                  id: u.id,
                                  name: u.name,
                                  telefone: u.telefone,
                                })
                              }
                            >
                              <Phone className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.tenantNome ? (
                            <Badge
                              variant="outline"
                              className="border-blue-500/30 text-blue-300 text-xs"
                            >
                              {u.tenantNome}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-yellow-500/30 text-yellow-300 text-xs"
                            >
                              Super Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.role === "admin"
                                ? "border-purple-500/30 text-purple-300 text-xs"
                                : u.perfil === "gerente"
                                ? "border-orange-500/30 text-orange-300 text-xs"
                                : "border-slate-500/30 text-slate-400 text-xs"
                            }
                          >
                            {u.role === "admin" ? "Admin" : u.perfil === "gerente" ? "Gerente" : "Operador"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.ativo === 1
                                ? "border-green-500/30 text-green-400 text-xs"
                                : "border-red-500/30 text-red-400 text-xs"
                            }
                          >
                            {u.ativo === 1 ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {formatDateTime(u.lastSignedIn)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Redefinir Senha */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Redefinir Senha"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                              onClick={() =>
                                setUserParaResetSenha({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                })
                              }
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>

                            {/* Ativar/Desativar */}
                            <Button
                              variant="ghost"
                              size="sm"
                              title={u.ativo === 1 ? "Desativar" : "Ativar"}
                              className={`h-7 w-7 p-0 ${
                                u.ativo === 1
                                  ? "text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                                  : "text-slate-400 hover:text-green-400 hover:bg-green-400/10"
                              }`}
                              disabled={toggleAtivo.isPending}
                              onClick={() =>
                                toggleAtivo.mutate({
                                  userId: u.id,
                                  ativo: u.ativo === 1 ? 0 : 1,
                                })
                              }
                            >
                              {u.ativo === 1 ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <ResetPasswordModal
        user={userParaResetSenha}
        onClose={() => setUserParaResetSenha(null)}
      />
      <EditTelefoneModal
        user={userParaTelefone}
        onClose={() => setUserParaTelefone(null)}
      />
    </div>
  );
}
