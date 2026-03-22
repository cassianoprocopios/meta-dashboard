import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accessLogs,
  bonificacoes,
  categorias,
  empresas,
  faturamentos,
  InsertAccessLog,
  InsertBonificacao,
  InsertEmpresa,
  InsertFaturamento,
  InsertMeta,
  InsertUser,
  metas,
  notificacaoEventos,
  tenants,
  userEmpresas,
  users,
} from "../drizzle/schema";
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

// ─── TENANTS ──────────────────────────────────────────────────────────────────

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(asc(tenants.nome));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result[0];
}

export async function getTenantByAdminEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.adminEmail, email)).limit(1);
  return result[0];
}

export async function createTenant(data: {
  nome: string;
  slug: string;
  adminEmail: string;
  plano?: "trial" | "basico" | "pro";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(tenants).values({
    nome: data.nome,
    slug: data.slug,
    adminEmail: data.adminEmail,
    plano: data.plano ?? "trial",
    ativo: 1,
  });
  // Buscar o tenant recém criado pelo slug para obter o ID real
  const created = await db.select().from(tenants).where(eq(tenants.slug, data.slug)).limit(1);
  if (!created[0]) throw new Error("Tenant não encontrado após criação");
  return { id: created[0].id, ...data };
}

export async function updateTenantAtivo(tenantId: number, ativo: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenants).set({ ativo }).where(eq(tenants.id, tenantId));
}

export async function updateTenantPlano(tenantId: number, plano: "trial" | "basico" | "pro") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenants).set({ plano }).where(eq(tenants.id, tenantId));
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Retorna todos os utilizadores de um tenant */
export async function getAllUsersByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.name));
}

/** Retorna todos os usuários do tenant com os slugs de empresas vinculadas embutidos */
export async function getAllUsersByTenantWithEmpresas(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.name));
  if (allUsers.length === 0) return [];
  const allVinculos = await db
    .select()
    .from(userEmpresas)
    .where(inArray(userEmpresas.userId, allUsers.map((u) => u.id)));
  return allUsers.map((u) => ({
    ...u,
    empresasSlugs: allVinculos.filter((e) => e.userId === u.id).map((e) => e.empresaSlug),
  }));
}

export async function createUserWithPassword(data: {
  tenantId: number;
  name: string;
  email: string;
  passwordHash: string;
  perfil: "gerente" | "operador" | "recepcionista";
  empresaVinculada: string | null;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await db.insert(users).values({
    openId,
    tenantId: data.tenantId,
    name: data.name,
    email: data.email,
    loginMethod: "password",
    passwordHash: data.passwordHash,
    perfil: data.perfil,
    empresaVinculada: data.empresaVinculada ?? null,
    telefone: null,
    role: data.role ?? "user",
    ativo: 1,
    lastSignedIn: new Date(),
  });
  return { id: (result as any).insertId, openId };
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserAtivo(userId: number, ativo: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ativo, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

export async function updateUserFull(
  userId: number,
  data: {
    name?: string;
    email?: string;
    perfil?: string;
    empresaVinculada?: string | null;
    role?: "user" | "admin";
    passwordHash?: string;
    telefone?: string | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.email !== undefined) updateSet.email = data.email;
  if (data.perfil !== undefined) updateSet.perfil = data.perfil;
  if ("empresaVinculada" in data) updateSet.empresaVinculada = data.empresaVinculada ?? null;
  if (data.role !== undefined) updateSet.role = data.role;
  if (data.passwordHash !== undefined) updateSet.passwordHash = data.passwordHash;
  if ("telefone" in data) updateSet.telefone = data.telefone ?? null;

  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

/** Retorna todos os utilizadores de todos os tenants (apenas super-admin) */
export async function getAllUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    tenantId: users.tenantId,
    name: users.name,
    email: users.email,
    telefone: users.telefone,
    role: users.role,
    perfil: users.perfil,
    empresaVinculada: users.empresaVinculada,
    ativo: users.ativo,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    tenantNome: tenants.nome,
    tenantSlug: tenants.slug,
    tenantPlano: tenants.plano,
  })
  .from(users)
  .leftJoin(tenants, eq(users.tenantId, tenants.id))
  .orderBy(asc(users.tenantId), asc(users.name));
}

/** Retorna estatísticas de utilizadores para o admin dashboard */
export async function getUserStats() {
  const db = await getDb();
  if (!db) return { total: 0, ativos: 0, inativos: 0, novosMes: 0 };
  const allUsers = await db.select({
    ativo: users.ativo,
    createdAt: users.createdAt,
  }).from(users);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    total: allUsers.length,
    ativos: allUsers.filter(u => u.ativo === 1).length,
    inativos: allUsers.filter(u => u.ativo === 0).length,
    novosMes: allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= firstOfMonth).length,
  };
}

// ─── USER EMPRESAS (N:N) ──────────────────────────────────────────────────────

export async function getUserEmpresaSlugs(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(userEmpresas).where(eq(userEmpresas.userId, userId));
  return rows.map((r) => r.empresaSlug);
}

export async function setUserEmpresas(userId: number, tenantId: number, slugs: string[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Sempre limpar o campo legado empresaVinculada ao usar a tabela userEmpresas
  // Isso evita conflito entre o campo legado e os vínculos N:N
  await db.update(users).set({ empresaVinculada: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(userEmpresas).where(eq(userEmpresas.userId, userId));
  if (slugs.length > 0) {
    await db.insert(userEmpresas).values(slugs.map((s) => ({ userId, tenantId, empresaSlug: s })));
  }
}

// ─── EMPRESAS ─────────────────────────────────────────────────────────────────

export async function getEmpresasByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(empresas)
    .where(and(eq(empresas.tenantId, tenantId), eq(empresas.ativo, 1)))
    .orderBy(asc(empresas.nome));
}

/** Retorna TODAS as empresas do tenant (ativas e inativas) — uso exclusivo do AdminPanel */
export async function getAllEmpresasByTenantAdmin(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(empresas)
    .where(eq(empresas.tenantId, tenantId))
    .orderBy(asc(empresas.nome));
}

export async function getEmpresaBySlugAndTenant(slug: string, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(empresas)
    .where(and(eq(empresas.slug, slug), eq(empresas.tenantId, tenantId)))
    .limit(1);
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

export async function updateEmpresaAtivo(id: number, ativo: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(empresas).set({ ativo }).where(eq(empresas.id, id));
}

export async function updateEmpresa(
  id: number,
  data: {
    nome?: string;
    cor?: string;
    tipoCategorias?: "padrao" | "seraphine";
    cat1Nome?: string;
    cat2Nome?: string;
    cat3Nome?: string;
    cat4Nome?: string;
    cat5Nome?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(empresas).set(data).where(eq(empresas.id, id));
}

// ─── FATURAMENTOS ─────────────────────────────────────────────────────────────

export async function getFaturamentoByDataEmpresaTenant(data: string, empresaSlug: string, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(faturamentos)
    .where(and(
      eq(faturamentos.data, data),
      eq(faturamentos.empresaSlug, empresaSlug),
      eq(faturamentos.tenantId, tenantId)
    ))
    .limit(1);
  return result[0];
}

export async function getAllFaturamentosByTenant(tenantId: number, mes: number, ano: number, empresaSlug?: string) {
  const db = await getDb();
  if (!db) return [];
  const allRows = await db
    .select()
    .from(faturamentos)
    .where(eq(faturamentos.tenantId, tenantId))
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
  const existing = await getFaturamentoByDataEmpresaTenant(
    input.data as string,
    input.empresaSlug as string,
    input.tenantId as number
  );
  if (existing) {
    // Não sobrescreve totalPrevisto: preserva o valor original da previsão.
    // Se ainda não tinha totalPrevisto (lançamento antigo) e o dia ainda é futuro,
    // preenche agora para garantir rastreabilidade.
    const novoTotal = [
      parseFloat(input.cat1 as string || "0"),
      parseFloat(input.cat2 as string || "0"),
      parseFloat(input.cat3 as string || "0"),
      parseFloat(input.cat4 as string || "0"),
      parseFloat(input.cat5 as string || "0"),
    ].reduce((a, b) => a + b, 0);
    const hoje = new Date();
    const [ano, mes, dia] = (input.data as string).split("-").map(Number);
    const dataLancamento = new Date(ano, mes - 1, dia);
    const isFuturo = dataLancamento > hoje;
    const setObj: Record<string, any> = {
      cat1: input.cat1,
      cat2: input.cat2,
      cat3: input.cat3,
      cat4: input.cat4,
      cat5: input.cat5,
      observacao: input.observacao,
      lancadoPor: input.lancadoPor,
    };
    // Preenche totalPrevisto apenas se ainda não existia e o dia é futuro
    if (existing.totalPrevisto === null && isFuturo) {
      setObj.totalPrevisto = novoTotal.toFixed(2);
    }
    await db.update(faturamentos).set(setObj).where(eq(faturamentos.id, existing.id));
    return { ...existing, ...input, id: existing.id };
  } else {
    // Ao criar, se o dia for futuro, registra o totalPrevisto
    const hoje = new Date();
    const [ano, mes, dia] = (input.data as string).split("-").map(Number);
    const dataLancamento = new Date(ano, mes - 1, dia);
    const isFuturo = dataLancamento > hoje;
    const total = [
      parseFloat(input.cat1 as string || "0"),
      parseFloat(input.cat2 as string || "0"),
      parseFloat(input.cat3 as string || "0"),
      parseFloat(input.cat4 as string || "0"),
      parseFloat(input.cat5 as string || "0"),
    ].reduce((a, b) => a + b, 0);
    const insertData = {
      ...input,
      totalPrevisto: isFuturo ? total.toFixed(2) : null,
    };
    const result = await db.insert(faturamentos).values(insertData);
    return { ...insertData, id: (result as any).insertId };
  }
}

export async function deleteFaturamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(faturamentos).where(eq(faturamentos.id, id));
}

// ─── METAS ────────────────────────────────────────────────────────────────────

export async function getMetasByMesAndTenant(tenantId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metas)
    .where(and(eq(metas.tenantId, tenantId), eq(metas.mes, mes), eq(metas.ano, ano)));
}

export async function getMetaByEmpresaMesTenant(empresaSlug: string, mes: number, ano: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(metas)
    .where(and(
      eq(metas.empresaSlug, empresaSlug),
      eq(metas.mes, mes),
      eq(metas.ano, ano),
      eq(metas.tenantId, tenantId)
    ))
    .limit(1);
  return result[0];
}

export async function upsertMeta(input: InsertMeta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getMetaByEmpresaMesTenant(
    input.empresaSlug as string,
    input.mes as number,
    input.ano as number,
    input.tenantId as number
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

// ─── BONIFICAÇÕES ─────────────────────────────────────────────────────────────

export async function getBonificacaoByEmpresaTenant(empresaSlug: string, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bonificacoes)
    .where(and(eq(bonificacoes.empresaSlug, empresaSlug), eq(bonificacoes.tenantId, tenantId)))
    .limit(1);
  return result[0];
}

export async function getAllBonificacoesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bonificacoes).where(eq(bonificacoes.tenantId, tenantId));
}

export async function upsertBonificacao(data: InsertBonificacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getBonificacaoByEmpresaTenant(
    data.empresaSlug as string,
    data.tenantId as number
  );
  if (existing) {
    await db.update(bonificacoes).set({
      pctQuinzenalSemMeta: data.pctQuinzenalSemMeta,
      pctQuinzenalComMeta: data.pctQuinzenalComMeta,
      pctMensalSemMeta: data.pctMensalSemMeta,
      pctMensalComMeta: data.pctMensalComMeta,
    }).where(eq(bonificacoes.id, existing.id));
  } else {
    await db.insert(bonificacoes).values(data);
  }
}

// ─── CATEGORIAS DINÂMICAS ─────────────────────────────────────────────────────

export async function getCategoriasByEmpresaTenant(empresaSlug: string, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categorias)
    .where(and(
      eq(categorias.empresaSlug, empresaSlug),
      eq(categorias.tenantId, tenantId),
      eq(categorias.ativo, 1)
    ))
    .orderBy(asc(categorias.ordem), asc(categorias.id));
}

export async function addCategoria(empresaSlug: string, tenantId: number, nome: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(categorias)
    .where(and(eq(categorias.empresaSlug, empresaSlug), eq(categorias.tenantId, tenantId)));
  const maxOrdem = existing.length > 0 ? Math.max(...existing.map(c => c.ordem)) : 0;
  await db.insert(categorias).values({ empresaSlug, tenantId, nome, ordem: maxOrdem + 1, ativo: 1 });
}

export async function removeCategoria(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categorias).set({ ativo: 0 }).where(eq(categorias.id, id));
}

export async function updateCategoriaNome(id: number, nome: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categorias).set({ nome }).where(eq(categorias.id, id));
}

// ─── ACCESS LOGS ─────────────────────────────────────────────────────────────

export async function createAccessLog(data: InsertAccessLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(accessLogs).values(data);
  } catch (e) {
    console.warn("[AccessLog] Failed to insert:", e);
  }
}

export async function getAccessLogs(limit = 200, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (tenantId) {
    return db.select().from(accessLogs)
      .where(eq(accessLogs.tenantId, tenantId))
      .orderBy(desc(accessLogs.createdAt))
      .limit(limit);
  }
  return db.select().from(accessLogs).orderBy(desc(accessLogs.createdAt)).limit(limit);
}

/** Estatísticas de uso por tenant para o super-admin */
export async function getTenantStats(tenantId: number) {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalEmpresas: 0, totalLancamentos: 0 };
  const [usersCount, empresasCount, lancamentosCount] = await Promise.all([
    db.select().from(users).where(eq(users.tenantId, tenantId)),
    db.select().from(empresas).where(and(eq(empresas.tenantId, tenantId), eq(empresas.ativo, 1))),
    db.select().from(faturamentos).where(eq(faturamentos.tenantId, tenantId)),
  ]);
  return {
    totalUsers: usersCount.length,
    totalEmpresas: empresasCount.length,
    totalLancamentos: lancamentosCount.length,
  };
}

// ─── PAINEL DO DESENVOLVEDOR ──────────────────────────────────────────────────

/** Lista todos os tenants com estatísticas de uso (apenas para o desenvolvedor) */
export async function getAllTenantsWithStats() {
  const db = await getDb();
  if (!db) return [];

  const allTenants = await db.select().from(tenants).orderBy(asc(tenants.createdAt));

  const results = await Promise.all(
    allTenants.map(async (t) => {
      const [usersCount, empresasCount, lancamentosCount, lastAccess] = await Promise.all([
        db.select({ id: users.id }).from(users).where(eq(users.tenantId, t.id)),
        db.select({ id: empresas.id }).from(empresas).where(and(eq(empresas.tenantId, t.id), eq(empresas.ativo, 1))),
        db.select({ id: faturamentos.id }).from(faturamentos).where(eq(faturamentos.tenantId, t.id)),
        db.select({ createdAt: accessLogs.createdAt })
          .from(accessLogs)
          .where(eq(accessLogs.tenantId, t.id))
          .orderBy(desc(accessLogs.createdAt))
          .limit(1),
      ]);
      return {
        ...t,
        totalUsers: usersCount.length,
        totalEmpresas: empresasCount.length,
        totalLancamentos: lancamentosCount.length,
        ultimoAcesso: lastAccess[0]?.createdAt ?? null,
      };
    })
  );
  return results;
}

/** Cria um novo tenant com email genérico (sem validação de domínio) */
export async function createTenantDev(data: {
  nome: string;
  slug: string;
  adminEmail: string;
  plano: "trial" | "basico" | "pro";
  validadeAte?: Date | null;
  observacoes?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se slug já existe
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, data.slug));
  if (existing.length > 0) throw new Error("Slug já existe");

  // Verificar se email já existe
  const existingEmail = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.adminEmail, data.adminEmail));
  if (existingEmail.length > 0) throw new Error("Email já registado em outro tenant");

  await db.insert(tenants).values({
    nome: data.nome,
    slug: data.slug,
    adminEmail: data.adminEmail,
    plano: data.plano,
    ativo: 1,
    validadeAte: data.validadeAte ?? null,
    observacoes: data.observacoes ?? null,
  });

  // Buscar o tenant criado pelo slug
  const [created] = await db.select().from(tenants).where(eq(tenants.slug, data.slug));
  return created;
}

/** Cria o utilizador admin para um tenant recém-criado pelo desenvolvedor */
export async function createAdminUserForTenant(data: {
  tenantId: number;
  name: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar se email já existe em qualquer tenant
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email));
  if (existing.length > 0) throw new Error("Email já registado na plataforma");

  const openId = `dev_${data.tenantId}_${Date.now()}`;
  await db.insert(users).values({
    tenantId: data.tenantId,
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "password",
    role: "admin",
    perfil: "gerente",
    telefone: null,
    empresaVinculada: null,
    ativo: 1,
  });

  const [created] = await db.select().from(users).where(eq(users.email, data.email));
  return created;
}

/** Atualiza dados de um tenant (desenvolvedor) */
export async function updateTenantDev(tenantId: number, data: {
  nome?: string;
  plano?: "trial" | "basico" | "pro";
  ativo?: number;
  validadeAte?: Date | null;
  observacoes?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.nome !== undefined) updateSet.nome = data.nome;
  if (data.plano !== undefined) updateSet.plano = data.plano;
  if (data.ativo !== undefined) updateSet.ativo = data.ativo;
  if (data.validadeAte !== undefined) updateSet.validadeAte = data.validadeAte;
  if (data.observacoes !== undefined) updateSet.observacoes = data.observacoes;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(tenants).set(updateSet).where(eq(tenants.id, tenantId));
}

/** Retorna o histórico completo do tenant: empresas criadas, usuários criados e logs de acesso */
export async function getHistoricoCompleto(tenantId: number, limit = 300) {
  const db = await getDb();
  if (!db) return [];

  // Buscar empresas do tenant (todas, incluindo inativas)
  const todasEmpresas = await db.select({
    id: empresas.id,
    nome: empresas.nome,
    slug: empresas.slug,
    createdAt: empresas.createdAt,
  }).from(empresas).where(eq(empresas.tenantId, tenantId));

  // Buscar usuários do tenant (exceto o próprio admin)
  const todosUsuarios = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    perfil: users.perfil,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.tenantId, tenantId));

  // Buscar logs de acesso do tenant
  const logs = await db.select().from(accessLogs)
    .where(eq(accessLogs.tenantId, tenantId))
    .orderBy(desc(accessLogs.createdAt))
    .limit(limit);

  // Montar lista unificada de eventos
  const eventos: Array<{
    tipo: "empresa_criada" | "usuario_criado" | "acesso";
    titulo: string;
    descricao: string;
    data: Date;
    extra?: string;
  }> = [];

  todasEmpresas.forEach((e) => {
    eventos.push({
      tipo: "empresa_criada",
      titulo: `Empresa criada: ${e.nome}`,
      descricao: `Slug: ${e.slug}`,
      data: new Date(e.createdAt),
    });
  });

  todosUsuarios.forEach((u) => {
    eventos.push({
      tipo: "usuario_criado",
      titulo: `Usuário cadastrado: ${u.name ?? u.email}`,
      descricao: `${u.email} — perfil: ${u.perfil ?? u.role}`,
      data: new Date(u.createdAt),
    });
  });

  logs.forEach((l) => {
    eventos.push({
      tipo: "acesso",
      titulo: l.acao.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      descricao: l.detalhes ?? `${l.userName ?? l.userEmail ?? "Usuário desconhecido"}`,
      data: new Date(l.createdAt),
      extra: l.ip ?? undefined,
    });
  });

  // Ordenar por data decrescente
  eventos.sort((a, b) => b.data.getTime() - a.data.getTime());

  return eventos.slice(0, limit);
}

// ─── NOTIFICAÇÃO DE EVENTOS ───────────────────────────────────────────────────

/** Verifica se um evento já foi notificado (evita duplicatas) */
export async function eventoJaNotificado(tenantId: number, chave: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Se sem DB, assume já notificado para não enviar duplicata
  const rows = await db
    .select({ id: notificacaoEventos.id })
    .from(notificacaoEventos)
    .where(and(eq(notificacaoEventos.tenantId, tenantId), eq(notificacaoEventos.chave, chave)))
    .limit(1);
  return rows.length > 0;
}

/** Registra um evento como notificado */
export async function registrarEventoNotificado(
  tenantId: number,
  chave: string,
  tipo: "meta_atingida" | "mudanca_ranking",
  empresaSlug: string,
  mensagem: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(notificacaoEventos).values({ tenantId, chave, tipo, empresaSlug, mensagem });
}

/** Lista eventos notificados recentes de um tenant */
export async function getEventosNotificados(tenantId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notificacaoEventos)
    .where(eq(notificacaoEventos.tenantId, tenantId))
    .orderBy(desc(notificacaoEventos.createdAt))
    .limit(limit);
}
