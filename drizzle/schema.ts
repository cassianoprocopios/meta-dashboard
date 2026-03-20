import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Estendida com perfil, empresa vinculada, senha própria e controle de ativo.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  perfil: mysqlEnum("perfil", ["gerente", "operador"]).default("operador").notNull(),
  /** Slug da empresa vinculada (legado - mantido para compatibilidade). Null = acesso a todas (admin). */
  empresaVinculada: varchar("empresaVinculada", { length: 64 }),
  /** Hash bcrypt da senha própria do sistema (independente do OAuth) */
  passwordHash: varchar("passwordHash", { length: 256 }),
  /** Se o utilizador está ativo (1) ou bloqueado (0) */
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── RELAÇÃO N:N UTILIZADOR ↔ EMPRESAS ───────────────────────────────────────
// Cada utilizador pode ter acesso a múltiplas empresas
export const userEmpresas = mysqlTable("userEmpresas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserEmpresa = typeof userEmpresas.$inferSelect;
export type InsertUserEmpresa = typeof userEmpresas.$inferInsert;

// ─── LOG DE ACESSOS ───────────────────────────────────────────────────────────
export const accessLogs = mysqlTable("accessLogs", {
  id: int("id").autoincrement().primaryKey(),
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

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  nome: varchar("nome", { length: 128 }).notNull(),
  cor: varchar("cor", { length: 16 }).notNull().default("#3b82f6"),
  tipoCategorias: mysqlEnum("tipoCategorias", ["padrao", "seraphine"]).notNull().default("padrao"),
  cat1Nome: varchar("cat1Nome", { length: 64 }).notNull().default("Avulso"),
  cat2Nome: varchar("cat2Nome", { length: 64 }).notNull().default("Produtos"),
  cat3Nome: varchar("cat3Nome", { length: 64 }).notNull().default("Serv. Extra"),
  cat4Nome: varchar("cat4Nome", { length: 64 }).notNull().default("Lavatório"),
  cat5Nome: varchar("cat5Nome", { length: 64 }).notNull().default("Recorrência"),
  ativo: int("ativo").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Empresa = typeof empresas.$inferSelect;
export type InsertEmpresa = typeof empresas.$inferInsert;

// ─── BONIFICAÇÕES ─────────────────────────────────────────────────────────────
// Percentuais configuráveis por empresa para cálculo de bonificação
export const bonificacoes = mysqlTable("bonificacoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull().unique(),
  /** % sobre montante quinzenal quando NÃO bate a meta quinzenal */
  pctQuinzenalSemMeta: decimal("pctQuinzenalSemMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  /** % sobre montante quinzenal quando BATE a meta quinzenal */
  pctQuinzenalComMeta: decimal("pctQuinzenalComMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  /** % sobre montante mensal quando NÃO bate a meta mensal */
  pctMensalSemMeta: decimal("pctMensalSemMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  /** % sobre montante mensal quando BATE a meta mensal */
  pctMensalComMeta: decimal("pctMensalComMeta", { precision: 6, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bonificacao = typeof bonificacoes.$inferSelect;
export type InsertBonificacao = typeof bonificacoes.$inferInsert;

// ─── METAS ────────────────────────────────────────────────────────────────────
export const metas = mysqlTable("metas", {
  id: int("id").autoincrement().primaryKey(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }).notNull().default("0"),
  metaQuinzenal: decimal("metaQuinzenal", { precision: 12, scale: 2 }).notNull().default("0"),
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
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  data: varchar("data", { length: 10 }).notNull(),
  cat1: decimal("cat1", { precision: 12, scale: 2 }).notNull().default("0"),
  cat2: decimal("cat2", { precision: 12, scale: 2 }).notNull().default("0"),
  cat3: decimal("cat3", { precision: 12, scale: 2 }).notNull().default("0"),
  cat4: decimal("cat4", { precision: 12, scale: 2 }).notNull().default("0"),
  cat5: decimal("cat5", { precision: 12, scale: 2 }).notNull().default("0"),
  observacao: text("observacao"),
  lancadoPor: int("lancadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Faturamento = typeof faturamentos.$inferSelect;
export type InsertFaturamento = typeof faturamentos.$inferInsert;
