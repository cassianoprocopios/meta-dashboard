import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

// ─── TENANTS (Empresas Clientes do SaaS) ─────────────────────────────────────
// Cada tenant é uma empresa cliente que comprou acesso ao sistema
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  adminEmail: varchar("adminEmail", { length: 320 }).notNull(),
  plano: mysqlEnum("plano", ["trial", "basico", "pro"]).notNull().default("trial"),
  /** 1 = ativo, 0 = bloqueado pelo super-admin */
  ativo: int("ativo").notNull().default(1),
  /** Data de validade do acesso ao sistema (null = sem validade) */
  validadeAte: timestamp("validadeAte"),
  /** Observações internas do desenvolvedor sobre este tenant */
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── UTILIZADORES ─────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** tenantId = null apenas para super-admin (Cassiano) */
  tenantId: int("tenantId"),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  perfil: mysqlEnum("perfil", ["gerente", "operador", "recepcionista"]).default("operador").notNull(),
  empresaVinculada: varchar("empresaVinculada", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  telefone: varchar("telefone", { length: 32 }),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── RELAÇÃO N:N UTILIZADOR ↔ EMPRESAS ───────────────────────────────────────
export const userEmpresas = mysqlTable("userEmpresas", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserEmpresa = typeof userEmpresas.$inferSelect;
export type InsertUserEmpresa = typeof userEmpresas.$inferInsert;

// ─── LOG DE ACESSOS ───────────────────────────────────────────────────────────
export const accessLogs = mysqlTable("accessLogs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  userId: int("userId"),
  userName: varchar("userName", { length: 256 }),
  userEmail: varchar("userEmail", { length: 320 }),
  acao: varchar("acao", { length: 64 }).notNull(),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("userAgent"),
  detalhes: text("detalhes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;

// ─── EMPRESAS (Unidades de cada Tenant) ──────────────────────────────────────
// NOTA: slug é único por tenant (slug + tenantId), não globalmente.
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  nome: varchar("nome", { length: 128 }).notNull(),
  cor: varchar("cor", { length: 16 }).notNull().default("#3b82f6"),
  tipoCategorias: mysqlEnum("tipoCategorias", ["padrao", "seraphine"]).notNull().default("padrao"),
  cat1Nome: varchar("cat1Nome", { length: 64 }).notNull().default("Avulso"),
  cat2Nome: varchar("cat2Nome", { length: 64 }).notNull().default("Produtos"),
  cat3Nome: varchar("cat3Nome", { length: 64 }).notNull().default("Serv. Extra"),
  cat4Nome: varchar("cat4Nome", { length: 64 }).notNull().default("Lavatório"),
  cat5Nome: varchar("cat5Nome", { length: 64 }).notNull().default("Don Alcides"),
  cat6Nome: varchar("cat6Nome", { length: 64 }).notNull().default("Caixinha"),
  cat7Nome: varchar("cat7Nome", { length: 64 }).notNull().default("Barbiero"),
  cat8Nome: varchar("cat8Nome", { length: 64 }).notNull().default("Bar"),
  cat9Nome: varchar("cat9Nome", { length: 64 }).notNull().default("Recorrência"),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Empresa = typeof empresas.$inferSelect;
export type InsertEmpresa = typeof empresas.$inferInsert;

// ─── BONIFICAÇÕES ─────────────────────────────────────────────────────────────
export const bonificacoes = mysqlTable("bonificacoes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  pctQuinzenalSemMeta: decimal("pctQuinzenalSemMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  pctQuinzenalComMeta: decimal("pctQuinzenalComMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  pctMensalSemMeta: decimal("pctMensalSemMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  pctMensalComMeta: decimal("pctMensalComMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  pctSuperMeta: decimal("pctSuperMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bonificacao = typeof bonificacoes.$inferSelect;
export type InsertBonificacao = typeof bonificacoes.$inferInsert;

// ─── CATEGORIAS DE FATURAMENTO ──────────────────────────────────────────────
export const categorias = mysqlTable("categorias", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  nome: varchar("nome", { length: 64 }).notNull(),
  ordem: int("ordem").notNull().default(0),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Categoria = typeof categorias.$inferSelect;
export type InsertCategoria = typeof categorias.$inferInsert;

// ─── METAS ────────────────────────────────────────────────────────────────────
export const metas = mysqlTable("metas", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }).notNull().default("0"),
  metaQuinzenal: decimal("metaQuinzenal", { precision: 12, scale: 2 }).notNull().default("0"),
  /** Super Meta: objetivo ambicioso acima da meta mensal (bônus extra) */
  superMeta: decimal("superMeta", { precision: 12, scale: 2 }).notNull().default("0"),
  diasUteis: int("diasUteis").notNull().default(26),
  diasUteisQuinzenal: int("diasUteisQuinzenal").notNull().default(13),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meta = typeof metas.$inferSelect;
export type InsertMeta = typeof metas.$inferInsert;

// ─── FATURAMENTOS ─────────────────────────────────────────────────────────────
export const faturamentos = mysqlTable("faturamentos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  data: varchar("data", { length: 10 }).notNull(),
  cat1: decimal("cat1", { precision: 12, scale: 2 }).notNull().default("0"),
  cat2: decimal("cat2", { precision: 12, scale: 2 }).notNull().default("0"),
  cat3: decimal("cat3", { precision: 12, scale: 2 }).notNull().default("0"),
  cat4: decimal("cat4", { precision: 12, scale: 2 }).notNull().default("0"),
  cat5: decimal("cat5", { precision: 12, scale: 2 }).notNull().default("0"),
  cat6: decimal("cat6", { precision: 12, scale: 2 }).notNull().default("0"),
  cat7: decimal("cat7", { precision: 12, scale: 2 }).notNull().default("0"),
  cat8: decimal("cat8", { precision: 12, scale: 2 }).notNull().default("0"),
  cat9: decimal("cat9", { precision: 12, scale: 2 }).notNull().default("0"),
  observacao: text("observacao"),
  lancadoPor: varchar("lancadoPor", { length: 128 }),
  // Valor total registrado quando o lançamento era previsto (dia futuro).
  // Preenchido automaticamente ao criar; não atualizado nas edições posteriores.
  totalPrevisto: decimal("totalPrevisto", { precision: 12, scale: 2 }),
  // Indica se este registro foi importado automaticamente pelo CashBarber (1 = sim, 0 = não)
  sincronizadoCB: tinyint("sincronizadoCB").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Faturamento = typeof faturamentos.$inferSelect;
export type InsertFaturamento = typeof faturamentos.$inferInsert;

// ─── EVENTOS DE NOTIFICAÇÃO ───────────────────────────────────────────────────────────────────────────────────
// Registra eventos já notificados para evitar duplicatas
export const notificacaoEventos = mysqlTable("notificacaoEventos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  // Chave única do evento: ex "meta_atingida:morumbi:2025-03" ou "ranking:morumbi:2025-03:1"
  chave: varchar("chave", { length: 256 }).notNull(),
  tipo: mysqlEnum("tipo", ["meta_atingida", "mudanca_ranking", "meta_diaria_atingida"]).notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mensagem: text("mensagem"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificacaoEvento = typeof notificacaoEventos.$inferSelect;
export type InsertNotificacaoEvento = typeof notificacaoEventos.$inferInsert;

// ─── CONFIGURAÇÃO CASHBARBER ──────────────────────────────────────────────────
// Credenciais e configuração de integração com o CashBarber por empresa
export const cashbarberConfig = mysqlTable("cashbarberConfig", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  /** Email de login no CashBarber */
  cbEmail: varchar("cbEmail", { length: 320 }).notNull(),
  /** Senha de login no CashBarber (armazenada em texto simples, pois é credencial de terceiro) */
  cbSenha: varchar("cbSenha", { length: 256 }).notNull(),
  /** ID da filial no CashBarber (ex: 144 para Morumbi, 3520 para Mascote) */
  cbFilialId: int("cbFilialId").notNull(),
  /** Nome da filial no CashBarber para exibição */
  cbFilialNome: varchar("cbFilialNome", { length: 128 }),
  /** Data/hora da última sincronização bem-sucedida */
  ultimaSincronizacao: timestamp("ultimaSincronizacao"),
  /** Status da última sincronização */
  statusUltimaSinc: varchar("statusUltimaSinc", { length: 32 }),
  ativo: int("ativo").notNull().default(1),
  /** Sincronização automática ativa */
  sincAutoAtiva: int("sincAutoAtiva").notNull().default(0),
  /** Horário de execução do job (formato HH:MM, ex: '23:00') */
  horarioSinc: varchar("horarioSinc", { length: 5 }).default("23:00"),
  /** ID da filial no módulo Dpote do CashBarber (pode diferir do cbFilialId; ex: 144 = Morumbi, 3520 = Mascote) */
  dpoteFilialId: int("dpoteFilialId"),
  /** Nome da filial no módulo Dpote (ex: 'Morumbi', 'Mascote') — usado para identificar a filial na resposta do Dpote */
  dpoteFilialNome: varchar("dpoteFilialNome", { length: 128 }),
  /** ID do histórico Dpote criado para o mês atual (evita criar duplicatas a cada sync) */
  dpoteHistoricoId: int("dpoteHistoricoId"),
  /** Mês/ano do histórico Dpote armazenado (formato YYYY-MM, ex: '2026-03') */
  dpoteHistoricoMes: varchar("dpoteHistoricoMes", { length: 7 }),
  /** Valor total das assinaturas do mês (base para cálculo da comissão bruta Dpote) */
  dpoteValorAssinaturas: decimal("dpoteValorAssinaturas", { precision: 12, scale: 2 }),
  /** Percentual da comissão que vai para a barbearia (ex: 65 = 65%) */
  dpotePorcentagemBarbearia: decimal("dpotePorcentagemBarbearia", { precision: 5, scale: 2 }),
  /**
   * Fonte do valor de Recorrência exibido no dashboard:
   * 'cashbarber' = usa o valor sincronizado com a API do CashBarber
   * 'manual'     = usa o valor digitado manualmente pelo gerente
   * Padrão: 'cashbarber'
   */
  recorrenciaFonte: varchar("recorrenciaFonte", { length: 16 }).default("cashbarber"),
  /** Valor manual de Recorrência informado pelo gerente (total apurado até hoje) */
  recorrenciaValorManual: decimal("recorrenciaValorManual", { precision: 12, scale: 2 }),
  /** Data/hora em que o valor manual foi salvo */
  recorrenciaManualAtualizadoEm: timestamp("recorrenciaManualAtualizadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashbarberConfig = typeof cashbarberConfig.$inferSelect;
export type InsertCashbarberConfig = typeof cashbarberConfig.$inferInsert;

// ─── LOG DE SINCRONIZAÇÃO CASHBARBER ─────────────────────────────────────────────────
export const cashbarberSyncLog = mysqlTable("cashbarberSyncLog", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  /** 'auto' = agendado, 'manual' = disparado pelo usuário */
  origem: varchar("origem", { length: 16 }).notNull().default("manual"),
  status: varchar("status", { length: 16 }).notNull().default("ok"),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  diasSincronizados: int("diasSincronizados").notNull().default(0),
  diasIgnorados: int("diasIgnorados").notNull().default(0),
  erros: text("erros"),
  executadoEm: timestamp("executadoEm").defaultNow().notNull(),
});

export type CashbarberSyncLog = typeof cashbarberSyncLog.$inferSelect;
export type InsertCashbarberSyncLog = typeof cashbarberSyncLog.$inferInsert;

// ─── MAPEAMENTO DE CATEGORIAS CASHBARBER ─────────────────────────────────────
// Mapeia categorias/serviços/produtos do CashBarber para categorias do Meta Dashboard
export const cashbarberMapeamento = mysqlTable("cashbarberMapeamento", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  /** Tipo: 'servico_categoria' | 'produto_categoria' | 'servico_id' | 'produto_id' */
  tipo: mysqlEnum("tipo", ["servico_categoria", "produto_categoria", "servico_id", "produto_id"]).notNull(),
  /** ID ou nome da categoria/serviço/produto no CashBarber */
  cbId: varchar("cbId", { length: 64 }).notNull(),
  /** Nome para exibição (ex: 'AVULSO/CLUBE', 'Bar', 'Barbiero') */
  cbNome: varchar("cbNome", { length: 128 }).notNull(),
  /** Coluna de destino no faturamento: 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5' | 'ignorar' */
  metaCategoria: varchar("metaCategoria", { length: 16 }).notNull().default("cat1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashbarberMapeamento = typeof cashbarberMapeamento.$inferSelect;
export type InsertCashbarberMapeamento = typeof cashbarberMapeamento.$inferInsert;


// ─── HISTÓRICO DE SINCRONIZAÇÕES DO DPOTE ────────────────────────────────────
// Registra cada execução de sync do Dpote (automática ou manual) com valores antes/depois
export const dpoteSyncLog = mysqlTable("dpoteSyncLog", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  /** Valor de recorrência antes da sincronização (0 se era o primeiro sync) */
  valorAnterior: decimal("valorAnterior", { precision: 12, scale: 2 }).notNull().default("0"),
  /** Novo valor de recorrência após a sincronização */
  valorNovo: decimal("valorNovo", { precision: 12, scale: 2 }).notNull().default("0"),
  /** Diferença entre novo e anterior (pode ser negativa) */
  variacao: decimal("variacao", { precision: 12, scale: 2 }).notNull().default("0"),
  /** Número de dias atualizados no banco */
  diasAtualizados: int("diasAtualizados").notNull().default(0),
  /** Fonte do valor: 'api' (CashBarber retornou) | 'manual' (valor manual configurado) */
  fonte: varchar("fonte", { length: 16 }).notNull().default("api"),
  /** Tipo de execução: 'automatico' (job) | 'manual' (acionado pelo usuário) */
  tipoExecucao: varchar("tipoExecucao", { length: 16 }).notNull().default("automatico"),
  /** Mensagem de erro, se houver */
  erro: text("erro"),
  executadoEm: timestamp("executadoEm").defaultNow().notNull(),
});
export type DpoteSyncLog = typeof dpoteSyncLog.$inferSelect;
export type InsertDpoteSyncLog = typeof dpoteSyncLog.$inferInsert;

// Profissionais/colaboradores da barbearia vinculados ao CashBarber
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull().default("barbiero-grupo"),
  nome: varchar("nome", { length: 128 }).notNull(),
  apelido: varchar("apelido", { length: 64 }),
  fotoUrl: text("fotoUrl"),
  cargo: varchar("cargo", { length: 64 }).default("Barbeiro"),
  /** Categoria para separar os rankings: barbeiro | auxiliar | recepcao */
  categoriaRanking: mysqlEnum("categoriaRanking", ["barbeiro", "auxiliar", "recepcao"]).default("barbeiro"),
  exibirNoRanking: int("exibirNoRanking").notNull().default(1),
  ativo: int("ativo").notNull().default(1),
  cashbarberProfissionalId: int("cashbarberProfissionalId"),
  /** PIN de 4 dígitos para acesso do profissional ao ranking */
  pinAcesso: varchar("pinAcesso", { length: 4 }),
  /** Número de WhatsApp do profissional (ex: 5511999999999) */
  telefone: varchar("telefone", { length: 32 }),
  /** Meta mensal individual em reais (null = sem meta definida) */
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Colaborador = typeof colaboradores.$inferSelect;
export type InsertColaborador = typeof colaboradores.$inferInsert;

// Faturamento mensal por profissional (sincronizado do CashBarber)
export const faturamentoColaboradores = mysqlTable("faturamentoColaboradores", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  colaboradorId: int("colaboradorId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  totalProdutos: decimal("totalProdutos", { precision: 12, scale: 2 }).notNull().default("0"),
  totalComissaoProdutos: decimal("totalComissaoProdutos", { precision: 12, scale: 2 }).notNull().default("0"),
  detalhesProdutos: text("detalhesProdutos"),
  totalServicos: decimal("totalServicos", { precision: 12, scale: 2 }).notNull().default("0"),
  totalGeral: decimal("totalGeral", { precision: 12, scale: 2 }).notNull().default("0"),
  detalhesServicos: text("detalhesServicos"),
  ultimaSyncEm: timestamp("ultimaSyncEm").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type FaturamentoColaborador = typeof faturamentoColaboradores.$inferSelect;
export type InsertFaturamentoColaborador = typeof faturamentoColaboradores.$inferInsert;
