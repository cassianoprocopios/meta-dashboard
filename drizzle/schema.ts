import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Estendida com perfil (gerente/operador) e empresa vinculada (por slug).
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  perfil: mysqlEnum("perfil", ["gerente", "operador"]).default("operador").notNull(),
  /** Slug da empresa vinculada (ex: "MORUMBI"). Null = acesso a todas (admin). */
  empresaVinculada: varchar("empresaVinculada", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────
// Tabela dinâmica de empresas gerenciada pelo admin
export const empresas = mysqlTable("empresas", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(), // ex: "MORUMBI"
  nome: varchar("nome", { length: 128 }).notNull(),
  cor: varchar("cor", { length: 16 }).notNull().default("#3b82f6"), // hex color
  /** Tipo de categorias: "padrao" ou "seraphine" */
  tipoCategorias: mysqlEnum("tipoCategorias", ["padrao", "seraphine"]).notNull().default("padrao"),
  /** Nomes personalizados das categorias (cat1..cat5) */
  cat1Nome: varchar("cat1Nome", { length: 64 }).notNull().default("Avulso"),
  cat2Nome: varchar("cat2Nome", { length: 64 }).notNull().default("Produtos"),
  cat3Nome: varchar("cat3Nome", { length: 64 }).notNull().default("Serv. Extra"),
  cat4Nome: varchar("cat4Nome", { length: 64 }).notNull().default("Lavatório"),
  cat5Nome: varchar("cat5Nome", { length: 64 }).notNull().default("Recorrência"),
  ativo: int("ativo").notNull().default(1), // 1=ativo, 0=inativo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Empresa = typeof empresas.$inferSelect;
export type InsertEmpresa = typeof empresas.$inferInsert;

// ─── METAS ────────────────────────────────────────────────────────────────────
// Meta mensal e quinzenal por empresa, com dias úteis manuais
export const metas = mysqlTable("metas", {
  id: int("id").autoincrement().primaryKey(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(),
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }).notNull().default("0"),
  metaQuinzenal: decimal("metaQuinzenal", { precision: 12, scale: 2 }).notNull().default("0"),
  /** Dias úteis do mês para esta empresa (definido manualmente) */
  diasUteis: int("diasUteis").notNull().default(26),
  /** Dias úteis da quinzena (dias 1-15) para esta empresa */
  diasUteisQuinzenal: int("diasUteisQuinzenal").notNull().default(13),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meta = typeof metas.$inferSelect;
export type InsertMeta = typeof metas.$inferInsert;

// ─── FATURAMENTOS ─────────────────────────────────────────────────────────────
// Campos genéricos cat1-cat5 cujos nomes são definidos por empresa
export const faturamentos = mysqlTable("faturamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresaSlug: varchar("empresaSlug", { length: 64 }).notNull(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
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
