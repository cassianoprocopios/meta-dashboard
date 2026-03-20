import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  perfil: mysqlEnum("perfil", ["gerente", "operador"]).default("operador").notNull(),
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
  cat5Nome: varchar("cat5Nome", { length: 64 }).notNull().default("Recorrência"),
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
  observacao: text("observacao"),
  lancadoPor: varchar("lancadoPor", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Faturamento = typeof faturamentos.$inferSelect;
export type InsertFaturamento = typeof faturamentos.$inferInsert;
