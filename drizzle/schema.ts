import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de metas mensais por empresa
export const metas = mysqlTable("metas", {
  id: int("id").autoincrement().primaryKey(),
  empresa: mysqlEnum("empresa", ["MORUMBI", "MASCOTE", "SERAPHINE"]).notNull(),
  mes: int("mes").notNull(), // 1-12
  ano: int("ano").notNull(),
  metaMensal: decimal("metaMensal", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meta = typeof metas.$inferSelect;
export type InsertMeta = typeof metas.$inferInsert;

// Tabela de faturamentos diários por empresa
export const faturamentos = mysqlTable("faturamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresa: mysqlEnum("empresa", ["MORUMBI", "MASCOTE", "SERAPHINE"]).notNull(),
  data: varchar("data", { length: 10 }).notNull(), // YYYY-MM-DD
  servicos: decimal("servicos", { precision: 12, scale: 2 }).notNull().default("0"),
  vendaProdutos: decimal("vendaProdutos", { precision: 12, scale: 2 }).notNull().default("0"),
  novasAssinaturas: decimal("novasAssinaturas", { precision: 12, scale: 2 }).notNull().default("0"),
  recorrencia: decimal("recorrencia", { precision: 12, scale: 2 }).notNull().default("0"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Faturamento = typeof faturamentos.$inferSelect;
export type InsertFaturamento = typeof faturamentos.$inferInsert;