import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { empresas, faturamentos, InsertEmpresa, InsertFaturamento, InsertMeta, InsertUser, metas, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.name));
}

export async function updateUserPerfil(
  userId: number,
  perfil: "gerente" | "operador",
  empresaVinculada: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ perfil, empresaVinculada: empresaVinculada ?? undefined }).where(eq(users.id, userId));
}

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────

export async function getAllEmpresas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(empresas).where(eq(empresas.ativo, 1)).orderBy(asc(empresas.nome));
}

export async function getEmpresaBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(empresas).where(eq(empresas.slug, slug)).limit(1);
  return result[0];
}

export async function createEmpresa(input: InsertEmpresa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(empresas).values(input);
  return { ...input, id: (result as any).insertId };
}

export async function deactivateEmpresa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(empresas).set({ ativo: 0 }).where(eq(empresas.id, id));
}

// ─── FATURAMENTOS ─────────────────────────────────────────────────────────────

export async function getFaturamentoByDataEmpresa(data: string, empresaSlug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(faturamentos)
    .where(and(eq(faturamentos.data, data), eq(faturamentos.empresaSlug, empresaSlug)))
    .limit(1);
  return result[0];
}

export async function getAllFaturamentos(mes: number, ano: number, empresaSlug?: string) {
  const db = await getDb();
  if (!db) return [];
  const allRows = await db
    .select()
    .from(faturamentos)
    .orderBy(asc(faturamentos.data), asc(faturamentos.empresaSlug));
  return allRows.filter((row) => {
    const [rowAno, rowMes] = row.data.split("-").map(Number);
    const matchesMes = rowMes === mes && rowAno === ano;
    const matchesEmpresa = empresaSlug ? row.empresaSlug === empresaSlug : true;
    return matchesMes && matchesEmpresa;
  });
}

export async function upsertFaturamento(input: InsertFaturamento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getFaturamentoByDataEmpresa(
    input.data as string,
    input.empresaSlug as string
  );
  if (existing) {
    await db
      .update(faturamentos)
      .set({
        cat1: input.cat1,
        cat2: input.cat2,
        cat3: input.cat3,
        cat4: input.cat4,
        cat5: input.cat5,
        observacao: input.observacao,
        lancadoPor: input.lancadoPor,
      })
      .where(eq(faturamentos.id, existing.id));
    return { ...existing, ...input, id: existing.id };
  } else {
    const result = await db.insert(faturamentos).values(input);
    return { ...input, id: (result as any).insertId };
  }
}

export async function deleteFaturamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(faturamentos).where(eq(faturamentos.id, id));
}

// ─── METAS ────────────────────────────────────────────────────────────────────

export async function getMetasByMes(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metas).where(and(eq(metas.mes, mes), eq(metas.ano, ano)));
}

export async function getMetaByEmpresaMes(empresaSlug: string, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(metas)
    .where(and(eq(metas.empresaSlug, empresaSlug), eq(metas.mes, mes), eq(metas.ano, ano)))
    .limit(1);
  return result[0];
}

export async function upsertMeta(input: InsertMeta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMetaByEmpresaMes(
    input.empresaSlug as string,
    input.mes as number,
    input.ano as number
  );
  if (existing) {
    await db.update(metas).set({
      metaMensal: input.metaMensal,
      metaQuinzenal: input.metaQuinzenal,
      diasUteis: input.diasUteis,
      diasUteisQuinzenal: input.diasUteisQuinzenal,
    }).where(eq(metas.id, existing.id));
    return { ...existing, ...input, id: existing.id };
  } else {
    const result = await db.insert(metas).values(input);
    return { ...input, id: (result as any).insertId };
  }
}
