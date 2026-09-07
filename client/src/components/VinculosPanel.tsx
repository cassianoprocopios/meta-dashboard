import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Link2,
  Link2Off,
} from "lucide-react";
import { toast } from "sonner";

const PERFIL_LABEL: Record<string, string> = {
  gerente: "Gerente",
  recepcionista: "Recepcionista",
  operador: "Operador",
};

const PERFIL_COLOR: Record<string, string> = {
  gerente: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  recepcionista: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  operador: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export default function VinculosPanel() {
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.admin.listarVinculos.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const toggleMutation = trpc.admin.toggleVinculo.useMutation({
    onMutate: async ({ userId, empresaSlug, vincular }) => {
      const key = `${userId}-${empresaSlug}`;
      setPendingToggles((prev) => { const next = new Set(Array.from(prev)); next.add(key); return next; });

      // Optimistic update
      await utils.admin.listarVinculos.cancel();
      const previous = utils.admin.listarVinculos.getData();
      utils.admin.listarVinculos.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          usuarios: old.usuarios.map((u) => {
            if (u.id !== userId) return u;
            const slugs = vincular
              ? Array.from(new Set([...u.empresasSlugs, empresaSlug]))
              : u.empresasSlugs.filter((s) => s !== empresaSlug);
            return { ...u, empresasSlugs: slugs };
          }),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        utils.admin.listarVinculos.setData(undefined, context.previous);
      }
      toast.error("Erro ao atualizar vínculo. Tente novamente.");
    },
    onSuccess: (_data, { vincular, empresaSlug }) => {
      toast.success(vincular ? `Vínculo com ${empresaSlug} adicionado.` : `Vínculo com ${empresaSlug} removido.`);
    },
    onSettled: (_data, _err, { userId, empresaSlug }) => {
      const key = `${userId}-${empresaSlug}`;
      setPendingToggles((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(key);
        return next;
      });
      utils.admin.listarVinculos.invalidate();
    },
  });

  const usuarios = data?.usuarios ?? [];
  const empresas = data?.empresas ?? [];

  // Filtrar usuários
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca =
        busca === "" ||
        (u.name ?? "").toLowerCase().includes(busca.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchPerfil = filtroPerfil === "todos" || u.perfil === filtroPerfil;
      const matchEmpresa =
        filtroEmpresa === "todas" ||
        u.empresasSlugs.includes(filtroEmpresa);
      return matchBusca && matchPerfil && matchEmpresa;
    });
  }, [usuarios, busca, filtroPerfil, filtroEmpresa]);

  // Estatísticas
  const stats = useMemo(() => {
    const semVinculo = usuarios.filter((u) => u.empresasSlugs.length === 0).length;
    const totalVinculos = usuarios.reduce((acc, u) => acc + u.empresasSlugs.length, 0);
    return { semVinculo, totalVinculos };
  }, [usuarios]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mr-3" />
        <span className="text-slate-400">Carregando vínculos...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="premium-form-scope space-y-5">
        {/* Cabeçalho com estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Usuários</span>
            </div>
            <p className="text-2xl font-bold text-white">{usuarios.length}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400">Empresas</span>
            </div>
            <p className="text-2xl font-bold text-white">{empresas.length}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Vínculos ativos</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalVinculos}</p>
          </div>
          <div className={`border rounded-xl p-4 ${stats.semVinculo > 0 ? "bg-amber-900/20 border-amber-700/40" : "bg-slate-800/50 border-slate-700/50"}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${stats.semVinculo > 0 ? "text-amber-400" : "text-slate-500"}`} />
              <span className="text-xs text-slate-400">Sem vínculo</span>
            </div>
            <p className={`text-2xl font-bold ${stats.semVinculo > 0 ? "text-amber-400" : "text-white"}`}>{stats.semVinculo}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
            <SelectTrigger className="w-full sm:w-44 bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent className="people-select-content">
              <SelectItem value="todos">Todos os perfis</SelectItem>
              <SelectItem value="gerente">Gerente</SelectItem>
              <SelectItem value="recepcionista">Recepcionista</SelectItem>
              <SelectItem value="operador">Operador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800/60 border-slate-700 text-white">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent className="people-select-content">
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.slug} value={e.slug}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="shrink-0 border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabela Matricial */}
        {empresas.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma empresa cadastrada ainda.</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum usuário encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/80">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium min-w-[200px]">
                    Usuário
                  </th>
                  {empresas.map((empresa) => (
                    <th key={empresa.slug} className="px-3 py-3 text-center min-w-[110px]">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: empresa.cor }}
                        />
                        <span className="text-slate-300 font-medium text-xs leading-tight">
                          {empresa.nome}
                        </span>
                        {empresa.ativo === 0 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-600 text-slate-500">
                            inativa
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-slate-400 font-medium min-w-[80px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario, idx) => {
                  const semVinculo = usuario.empresasSlugs.length === 0;
                  return (
                    <tr
                      key={usuario.id}
                      className={`border-b border-slate-700/30 transition-colors hover:bg-slate-800/40 ${
                        idx % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
                      } ${semVinculo ? "bg-amber-900/10" : ""}`}
                    >
                      {/* Coluna do usuário */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(usuario.name ?? "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-medium text-sm truncate max-w-[140px]">
                                {usuario.name ?? "—"}
                              </span>
                              {usuario.ativo === 0 && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-700 text-red-400">
                                  bloqueado
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-500 text-xs truncate max-w-[160px]">{usuario.email}</p>
                            <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded border ${PERFIL_COLOR[usuario.perfil] ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
                              {PERFIL_LABEL[usuario.perfil] ?? usuario.perfil}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Colunas de empresas */}
                      {empresas.map((empresa) => {
                        const vinculado = usuario.empresasSlugs.includes(empresa.slug);
                        const key = `${usuario.id}-${empresa.slug}`;
                        const isPending = pendingToggles.has(key);
                        return (
                          <td key={empresa.slug} className="px-3 py-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={vinculado}
                                    disabled={isPending}
                                    onCheckedChange={(checked) => {
                                      toggleMutation.mutate({
                                        userId: usuario.id,
                                        empresaSlug: empresa.slug,
                                        vincular: checked,
                                      });
                                    }}
                                    className={`data-[state=checked]:bg-green-500 ${isPending ? "opacity-50" : ""}`}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="border-slate-200 bg-white text-xs text-slate-700 shadow-lg">
                                {vinculado ? (
                                  <span className="flex items-center gap-1.5">
                                    <Link2 className="w-3 h-3 text-green-400" />
                                    Remover acesso à {empresa.nome}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <Link2Off className="w-3 h-3 text-slate-400" />
                                    Conceder acesso à {empresa.nome}
                                  </span>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}

                      {/* Coluna total */}
                      <td className="px-4 py-3 text-center">
                        {semVinculo ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />
                            </TooltipTrigger>
                            <TooltipContent side="left" className="border-slate-200 bg-white text-xs text-slate-700 shadow-lg">
                              Sem nenhum vínculo
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 font-bold text-sm">
                              {usuario.empresasSlugs.length}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            Vínculo ativo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-600 inline-block" />
            Sem acesso
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Usuário sem nenhum vínculo
          </span>
          <span className="ml-auto text-slate-600">
            Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
