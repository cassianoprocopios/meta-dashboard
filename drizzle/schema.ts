import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Estendida com perfil (gerente/operador) e empresa vinculada.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** admin = dono do sistema; manager = gerente de unidade; operator = operador somente leitura */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Perfil dentro do sistema de metas */
  perfil: mysqlEnum("perfil", ["gerente", "operador"]).default("operador").notNull(),
  /** Empresa vinculada ao usuário (null = acesso a todas, apenas admin) */
  empresaVinculada: mysqlEnum("empresaVinculada", ["MORUMBI", "MASCOTE", "SERAPHINE"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── METAS ────────────────────────────────────────────────────────────────────
// Meta mensal e quinzenal por empresa
export const metas = mysqlTable("metas", {
  id: int("id").autoincrement().primaryKey(),
  empresa: mysqlEnum("empresa", ["MORUMBI", "MASCOTE", "SERAPHINE"]).notNull(),
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(),
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }).notNull().default("0"),
  metaQuinzenal: decimal("metaQuinzenal", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meta = typeof metas.$inferSelect;
export type InsertMeta = typeof metas.$inferInsert;

// ─── FATURAMENTOS ─────────────────────────────────────────────────────────────
// Morumbi e Mascote: avulso, produtos, servExtra, lavatorio, recorrencia
// Seraphine:         cabelo, unha, outros, produtos (campo produtos reutilizado)
export const faturamentos = mysqlTable("faturamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresa: mysqlEnum("empresa", ["MORUMBI", "MASCOTE", "SERAPHINE"]).notNull(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD

  // Categorias Morumbi / Mascote
  avulso: decimal("avulso", { precision: 12, scale: 2 }).notNull().default("0"),
  produtos: decimal("produtos", { precision: 12, scale: 2 }).notNull().default("0"),
  servExtra: decimal("servExtra", { precision: 12, scale: 2 }).notNull().default("0"),
  lavatorio: decimal("lavatorio", { precision: 12, scale: 2 }).notNull().default("0"),
  recorrencia: decimal("recorrencia", { precision: 12, scale: 2 }).notNull().default("0"),

  // Categorias exclusivas Seraphine (cabelo usa avulso, unha usa servExtra, outros usa lavatorio)
  // cabelo → avulso | unha → servExtra | outros → lavatorio | produtos → produtos | recorrencia → recorrencia

  observacao: text("observacao"),
  lancadoPor: int("lancadoPor"), // FK users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Faturamento = typeof faturamentos.$inferSelect;
export type InsertFaturamento = typeof faturamentos.$inferInsert;
