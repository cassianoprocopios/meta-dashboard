import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accessLogs,
  bonificacoes,
  cashbarberConfig,
  cashbarberMapeamento,
  cashbarberSyncLog,
  CashbarberConfig,
  CashbarberMapeamento,
  colaboradores,
  faturamentoColaboradores,
  FaturamentoColaborador,
  InsertFaturamentoColaborador,
  dpoteSyncLog,
  InsertDpoteSyncLog,
  categorias,
  empresas,
  faturamentos,
  InsertAccessLog,
  InsertBonificacao,
  InsertCashbarberConfig,
  InsertCashbarberMapeamento,
  InsertColaborador,
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

/** Retorna todos os utilizadores de todos os tenants (apenas super-admin), com nomes de empresas vinculadas */
export async function getAllUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select({
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

  if (allUsers.length === 0) return [];

  // Buscar vínculos N:N de empresas
  const allVinculos = await db
    .select({ userId: userEmpresas.userId, empresaSlug: userEmpresas.empresaSlug })
    .from(userEmpresas)
    .where(inArray(userEmpresas.userId, allUsers.map((u) => u.id)));

  // Buscar nomes das empresas para os slugs encontrados
  const slugsUnicos = Array.from(new Set(allVinculos.map((v) => v.empresaSlug)));
  const nomesEmpresas: Record<string, string> = {};
  if (slugsUnicos.length > 0) {
    const empRows = await db
      .select({ slug: empresas.slug, nome: empresas.nome })
      .from(empresas)
      .where(inArray(empresas.slug, slugsUnicos));
    for (const e of empRows) nomesEmpresas[e.slug] = e.nome;
  }

  return allUsers.map((u) => {
    const vinculosSlugs = allVinculos.filter((v) => v.userId === u.id).map((v) => v.empresaSlug);
    // Fallback: se não há vínculos N:N mas há campo legado empresaVinculada
    const empresasNomes = vinculosSlugs.length > 0
      ? vinculosSlugs.map((s) => nomesEmpresas[s] ?? s)
      : u.empresaVinculada
      ? [nomesEmpresas[u.empresaVinculada] ?? u.empresaVinculada]
      : [];
    return { ...u, empresas: empresasNomes };
  });
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
  const emps = await db.select().from(empresas)
    .where(and(eq(empresas.tenantId, tenantId), eq(empresas.ativo, 1)))
    .orderBy(asc(empresas.nome));
  if (emps.length === 0) return [];
  // Buscar categorias ativas de todas as empresas do tenant
  const slugs = emps.map((e) => e.slug);
  const cats = await db.select().from(categorias)
    .where(and(
      inArray(categorias.empresaSlug, slugs),
      eq(categorias.tenantId, tenantId),
      eq(categorias.ativo, 1)
    ))
    .orderBy(asc(categorias.ordem), asc(categorias.id));
  // Montar mapa slug -> categorias
  const catsMap: Record<string, typeof cats> = {};
  for (const c of cats) {
    if (!catsMap[c.empresaSlug]) catsMap[c.empresaSlug] = [];
    catsMap[c.empresaSlug].push(c);
  }
  return emps.map((e) => ({ ...e, categorias: catsMap[e.slug] ?? [] }));
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
  const empresaId = (result as any).insertId;
  // Inicializar categorias padrão na tabela categorias
  const CATS_PADRAO = ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência"];
  const CATS_SERAPHINE = ["Cabelo", "Produtos", "Unha", "Outros", "Pacotes", "Cat 6", "Cat 7", "Cat 8", "Recorrência"];
  const catNomes = input.tipoCategorias === "seraphine" ? CATS_SERAPHINE : CATS_PADRAO;
  // Usar cat1Nome..cat9Nome se fornecidos, senão usar padrão do tipo
  const nomes = [
    (input as any).cat1Nome ?? catNomes[0],
    (input as any).cat2Nome ?? catNomes[1],
    (input as any).cat3Nome ?? catNomes[2],
    (input as any).cat4Nome ?? catNomes[3],
    (input as any).cat5Nome ?? catNomes[4],
    (input as any).cat6Nome ?? catNomes[5],
    (input as any).cat7Nome ?? catNomes[6],
    (input as any).cat8Nome ?? catNomes[7],
    (input as any).cat9Nome ?? catNomes[8],
  ];
  await db.insert(categorias).values(
    nomes.map((nome, i) => ({
      tenantId: input.tenantId,
      empresaSlug: input.slug,
      nome,
      ordem: i + 1,
      ativo: 1,
    }))
  );
  return { ...input, id: empresaId };
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
    cat6Nome?: string;
    cat7Nome?: string;
    cat8Nome?: string;
    cat9Nome?: string;
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
      parseFloat(input.cat6 as string || "0"),
      parseFloat(input.cat7 as string || "0"),
      parseFloat(input.cat8 as string || "0"),
      parseFloat(input.cat9 as string || "0"),
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
      cat6: input.cat6,
      cat7: input.cat7,
      cat8: input.cat8,
      cat9: input.cat9,
      observacao: input.observacao,
      lancadoPor: input.lancadoPor,
      // Propaga sincronizadoCB se fornecido (1 = importado pelo CashBarber)
      ...(input.sincronizadoCB !== undefined ? { sincronizadoCB: input.sincronizadoCB } : {}),
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
      parseFloat(input.cat6 as string || "0"),
      parseFloat(input.cat7 as string || "0"),
      parseFloat(input.cat8 as string || "0"),
      parseFloat(input.cat9 as string || "0"),
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

export async function getMetasAnoByTenant(tenantId: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metas)
    .where(and(eq(metas.tenantId, tenantId), eq(metas.ano, ano)));
}

export async function getFaturamentosAnoByTenant(tenantId: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const allRows = await db
    .select()
    .from(faturamentos)
    .where(eq(faturamentos.tenantId, tenantId))
    .orderBy(asc(faturamentos.data), asc(faturamentos.empresaSlug));
  return allRows.filter((row) => {
    const [rowAno] = row.data.split('-').map(Number);
    return rowAno === ano;
  });
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
      superMeta: input.superMeta ?? "0",
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
      pctSuperMeta: data.pctSuperMeta ?? "0",
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

/** Reordena categorias: recebe array de IDs na nova ordem e atualiza o campo `ordem` */
export async function reordenarCategorias(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < ids.length; i++) {
    await db.update(categorias).set({ ordem: i + 1 }).where(eq(categorias.id, ids[i]));
  }
}

/** Inicializa as categorias padrão de uma empresa caso não existam */
export async function inicializarCategorias(
  empresaSlug: string,
  tenantId: number,
  tipoCategorias: "padrao" | "seraphine"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(categorias)
    .where(and(eq(categorias.empresaSlug, empresaSlug), eq(categorias.tenantId, tenantId)));
  if (existing.length > 0) return; // já tem categorias, não sobrescrever
  const CATS_PADRAO = ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
  const CATS_SERAPHINE = ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"];
  const nomes = tipoCategorias === "seraphine" ? CATS_SERAPHINE : CATS_PADRAO;
  await db.insert(categorias).values(
    nomes.map((nome, i) => ({ tenantId, empresaSlug, nome, ordem: i + 1, ativo: 1 }))
  );
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
  tipo: "meta_atingida" | "mudanca_ranking" | "meta_diaria_atingida",
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

// ─── CASHBARBER CONFIG ────────────────────────────────────────────────────────

/** Busca a configuração CashBarber de uma empresa */
export async function getCashbarberConfig(tenantId: number, empresaSlug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(cashbarberConfig)
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)))
    .limit(1);
  return result[0];
}

/** Lista todas as configurações CashBarber de um tenant */
export async function listCashbarberConfigs(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cashbarberConfig)
    .where(eq(cashbarberConfig.tenantId, tenantId))
    .orderBy(asc(cashbarberConfig.empresaSlug));
}

/** Salva (upsert) a configuração CashBarber de uma empresa */
export async function upsertCashbarberConfig(data: InsertCashbarberConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getCashbarberConfig(data.tenantId, data.empresaSlug);
  if (existing) {
    await db
      .update(cashbarberConfig)
      .set({
        cbEmail: data.cbEmail,
        cbSenha: data.cbSenha,
        cbFilialId: data.cbFilialId,
        cbFilialNome: data.cbFilialNome,
        dpoteFilialId: data.dpoteFilialId ?? null,
        dpoteFilialNome: data.dpoteFilialNome ?? null,
        dpoteValorAssinaturas: data.dpoteValorAssinaturas ?? null,
        dpotePorcentagemBarbearia: data.dpotePorcentagemBarbearia ?? null,
        ativo: data.ativo ?? 1,
      })
      .where(and(eq(cashbarberConfig.tenantId, data.tenantId), eq(cashbarberConfig.empresaSlug, data.empresaSlug)));
    return existing.id;
  } else {
    const result = await db.insert(cashbarberConfig).values(data);
    return (result as any)[0]?.insertId ?? 0;
  }
}

/** Atualiza apenas os campos de Dpote (valor de assinaturas e porcentagem) sem sobrescrever credenciais */
export async function updateCashbarberDpoteConfig(
  tenantId: number,
  empresaSlug: string,
  dpoteValorAssinaturas: number,
  dpotePorcentagemBarbearia: number
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(cashbarberConfig)
    .set({
      dpoteValorAssinaturas: String(dpoteValorAssinaturas),
      dpotePorcentagemBarbearia: String(dpotePorcentagemBarbearia),
    })
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
}

/** Atualiza o status da última sincronização */
export async function updateCashbarberSyncStatus(
  tenantId: number,
  empresaSlug: string,
  status: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(cashbarberConfig)
    .set({
      ultimaSincronizacao: new Date(),
      statusUltimaSinc: status,
    })
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
}

// ─── CASHBARBER MAPEAMENTO ────────────────────────────────────────────────────

/** Lista o mapeamento de categorias CashBarber de uma empresa */
export async function listCashbarberMapeamento(tenantId: number, empresaSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cashbarberMapeamento)
    .where(and(eq(cashbarberMapeamento.tenantId, tenantId), eq(cashbarberMapeamento.empresaSlug, empresaSlug)))
    .orderBy(asc(cashbarberMapeamento.tipo), asc(cashbarberMapeamento.cbNome));
}

/** Salva o mapeamento completo de categorias CashBarber (substitui tudo) */
export async function saveCashbarberMapeamento(
  tenantId: number,
  empresaSlug: string,
  items: Array<{ tipo: "servico_categoria" | "produto_categoria" | "servico_id" | "produto_id"; cbId: string; cbNome: string; metaCategoria: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deletar mapeamento existente
  await db
    .delete(cashbarberMapeamento)
    .where(and(eq(cashbarberMapeamento.tenantId, tenantId), eq(cashbarberMapeamento.empresaSlug, empresaSlug)));
  // Inserir novo mapeamento
  if (items.length > 0) {
    await db.insert(cashbarberMapeamento).values(
      items.map((item) => ({
        tenantId,
        empresaSlug,
        tipo: item.tipo,
        cbId: item.cbId,
        cbNome: item.cbNome,
        metaCategoria: item.metaCategoria,
      }))
    );
  }
}

// ─── CASHBARBER SYNC LOG ──────────────────────────────────────────────────────

/** Insere um registro de log de sincronização */
export async function insertCashbarberSyncLog(data: {
  tenantId: number;
  empresaSlug: string;
  origem: "auto" | "manual";
  status: "ok" | "erro" | "parcial";
  mes: number;
  ano: number;
  diasSincronizados: number;
  diasIgnorados: number;
  erros?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(cashbarberSyncLog).values({
    tenantId: data.tenantId,
    empresaSlug: data.empresaSlug,
    origem: data.origem,
    status: data.status,
    mes: data.mes,
    ano: data.ano,
    diasSincronizados: data.diasSincronizados,
    diasIgnorados: data.diasIgnorados,
    erros: data.erros,
  });
}

/** Lista os logs de sincronização de uma empresa */
export async function listCashbarberSyncLogs(tenantId: number, empresaSlug: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cashbarberSyncLog)
    .where(and(eq(cashbarberSyncLog.tenantId, tenantId), eq(cashbarberSyncLog.empresaSlug, empresaSlug)))
    .orderBy(desc(cashbarberSyncLog.executadoEm))
    .limit(limit);
}

/** Atualiza configurações de agendamento automático */
export async function updateCashbarberAgendamento(
  tenantId: number,
  empresaSlug: string,
  sincAutoAtiva: boolean,
  horarioSinc: string
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(cashbarberConfig)
    .set({ sincAutoAtiva: sincAutoAtiva ? 1 : 0, horarioSinc })
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
}

/** Salva o ID do histórico Dpote criado para o mês atual, evitando duplicatas */
export async function saveDpoteHistoricoId(
  tenantId: number,
  empresaSlug: string,
  historicoId: number,
  mesSigla: string, // formato YYYY-MM
  valorAssinaturas?: number
) {
  const db = await getDb();
  if (!db) return;
  if (valorAssinaturas !== undefined) {
    await db
      .update(cashbarberConfig)
      .set({ dpoteHistoricoId: historicoId, dpoteHistoricoMes: mesSigla, dpoteValorAssinaturas: String(valorAssinaturas) })
      .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
  } else {
    await db
      .update(cashbarberConfig)
      .set({ dpoteHistoricoId: historicoId, dpoteHistoricoMes: mesSigla })
      .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
  }
}

/** Retorna o ID do histórico Dpote salvo para o mês atual (ou null se não existir / for de outro mês) */
export async function getDpoteHistoricoId(
  tenantId: number,
  empresaSlug: string,
  mesSigla: string // formato YYYY-MM
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ dpoteHistoricoId: cashbarberConfig.dpoteHistoricoId, dpoteHistoricoMes: cashbarberConfig.dpoteHistoricoMes })
    .from(cashbarberConfig)
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  if (row.dpoteHistoricoMes === mesSigla && row.dpoteHistoricoId) {
    return row.dpoteHistoricoId;
  }
  return null;
}


// ─── HISTÓRICO MENSAL DE RECORRÊNCIA (cat5) ───────────────────────────────────

/**
 * Retorna o total de cat5 (Recorrência/Dpote) por empresa e mês/ano
 * para os últimos N meses a partir do mês de referência.
 * Retorna array de { mesAno: "YYYY-MM", empresaSlug: string, totalCat5: number }
 */
export async function getFaturamentosHistoricoMensalByTenant(
  tenantId: number,
  anoFim: number,
  mesFim: number,
  qtdMeses = 12
): Promise<Array<{ mesAno: string; empresaSlug: string; totalCat5: number }>> {
  const db = await getDb();
  if (!db) return [];

  // Calcular o mês de início (qtdMeses atrás)
  let anoInicio = anoFim;
  let mesInicio = mesFim - qtdMeses + 1;
  while (mesInicio <= 0) {
    mesInicio += 12;
    anoInicio -= 1;
  }

  // Buscar todos os faturamentos do tenant no intervalo
  const allRows = await db
    .select({
      data: faturamentos.data,
      empresaSlug: faturamentos.empresaSlug,
      cat9: faturamentos.cat9,
    })
    .from(faturamentos)
    .where(eq(faturamentos.tenantId, tenantId))
    .orderBy(asc(faturamentos.data), asc(faturamentos.empresaSlug));

  // Filtrar pelo intervalo de datas e agregar por mesAno + empresaSlug
  const mapa: Record<string, number> = {};

  for (const row of allRows) {
    const [rowAnoStr, rowMesStr] = row.data.split("-");
    const rowAno = parseInt(rowAnoStr, 10);
    const rowMes = parseInt(rowMesStr, 10);

    // Verificar se está no intervalo
    const aposInicio = rowAno > anoInicio || (rowAno === anoInicio && rowMes >= mesInicio);
    const antesOuIgualFim = rowAno < anoFim || (rowAno === anoFim && rowMes <= mesFim);
    if (!aposInicio || !antesOuIgualFim) continue;

    const mesAno = `${rowAnoStr}-${rowMesStr}`;
    const chave = `${mesAno}|${row.empresaSlug}`;
    const cat9Val = parseFloat(String(row.cat9 ?? "0"));
    mapa[chave] = (mapa[chave] ?? 0) + cat9Val;
  }

  return Object.entries(mapa).map(([chave, totalCat5]) => {
    const [mesAno, empresaSlug] = chave.split("|");
    return { mesAno, empresaSlug, totalCat5 };
  });
}

// ─── DPOTE SYNC LOG ──────────────────────────────────────────────────────────

export async function insertDpoteSyncLog(data: {
  tenantId: number;
  empresaSlug: string;
  mes: number;
  ano: number;
  valorAnterior: number;
  valorNovo: number;
  diasAtualizados: number;
  fonte: string;
  tipoExecucao: string;
  erro?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const variacao = data.valorNovo - data.valorAnterior;
  await db.insert(dpoteSyncLog).values({
    tenantId: data.tenantId,
    empresaSlug: data.empresaSlug,
    mes: data.mes,
    ano: data.ano,
    valorAnterior: String(data.valorAnterior.toFixed(2)),
    valorNovo: String(data.valorNovo.toFixed(2)),
    variacao: String(variacao.toFixed(2)),
    diasAtualizados: data.diasAtualizados,
    fonte: data.fonte,
    tipoExecucao: data.tipoExecucao,
    erro: data.erro ?? null,
  });
}

export async function getDpoteSyncLogs(
  tenantId: number,
  limit = 50
): Promise<Array<{
  id: number;
  empresaSlug: string;
  mes: number;
  ano: number;
  valorAnterior: string;
  valorNovo: string;
  variacao: string;
  diasAtualizados: number;
  fonte: string;
  tipoExecucao: string;
  erro: string | null;
  executadoEm: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(dpoteSyncLog)
    .where(eq(dpoteSyncLog.tenantId, tenantId))
    .orderBy(desc(dpoteSyncLog.executadoEm))
    .limit(limit);
  return rows;
}

export async function getDpoteSyncLogsByEmpresa(
  tenantId: number,
  empresaSlug: string,
  limit = 20
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dpoteSyncLog)
    .where(and(eq(dpoteSyncLog.tenantId, tenantId), eq(dpoteSyncLog.empresaSlug, empresaSlug)))
    .orderBy(desc(dpoteSyncLog.executadoEm))
    .limit(limit);
}

// ─── RECORRÊNCIA FONTE (CashBarber vs Manual) ─────────────────────────────────

/** Salva a escolha de fonte de Recorrência e (opcionalmente) o valor manual */
export async function saveRecorrenciaFonte(
  tenantId: number,
  empresaSlug: string,
  fonte: "cashbarber" | "manual",
  valorManual?: number
) {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = { recorrenciaFonte: fonte };
  if (fonte === "manual" && valorManual !== undefined) {
    set.recorrenciaValorManual = String(valorManual);
    set.recorrenciaManualAtualizadoEm = new Date();
  }
  await db
    .update(cashbarberConfig)
    .set(set)
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)));
}

/** Retorna a fonte de Recorrência e o valor manual salvo para uma empresa */
export async function getRecorrenciaFonte(tenantId: number, empresaSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      recorrenciaFonte: cashbarberConfig.recorrenciaFonte,
      recorrenciaValorManual: cashbarberConfig.recorrenciaValorManual,
      recorrenciaManualAtualizadoEm: cashbarberConfig.recorrenciaManualAtualizadoEm,
    })
    .from(cashbarberConfig)
    .where(and(eq(cashbarberConfig.tenantId, tenantId), eq(cashbarberConfig.empresaSlug, empresaSlug)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── COLABORADORES / PROFISSIONAIS ────────────────────────────────────────────

/** Lista todos os colaboradores de um tenant */
export async function listarColaboradores(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(colaboradores)
    .where(eq(colaboradores.tenantId, tenantId))
    .orderBy(colaboradores.nome);
}

/** Cria ou atualiza um colaborador */
export async function salvarColaborador(
  tenantId: number,
  data: Partial<InsertColaborador> & { id?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const now = new Date();
  if (data.id) {
    const { id, ...rest } = data;
    await db
      .update(colaboradores)
      .set({ ...rest, updatedAt: now })
      .where(and(eq(colaboradores.id, id), eq(colaboradores.tenantId, tenantId)));
    const rows = await db.select().from(colaboradores).where(eq(colaboradores.id, id)).limit(1);
    return rows[0];
  } else {
    const insertData: InsertColaborador = {
      tenantId,
      empresaSlug: data.empresaSlug ?? "barbiero-grupo",
      nome: data.nome!,
      apelido: data.apelido ?? null,
      fotoUrl: data.fotoUrl ?? null,
      cargo: data.cargo ?? "Barbeiro",
      exibirNoRanking: data.exibirNoRanking ?? 1,
      ativo: data.ativo ?? 1,
      cashbarberProfissionalId: data.cashbarberProfissionalId ?? null,
      pinAcesso: data.pinAcesso ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const [result] = await db.insert(colaboradores).values(insertData);
    const rows = await db.select().from(colaboradores).where(eq(colaboradores.id, (result as any).insertId)).limit(1);
    return rows[0];
  }
}

/** Ativa ou desativa um colaborador */
export async function toggleColaboradorAtivo(tenantId: number, id: number, ativo: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db
    .update(colaboradores)
    .set({ ativo: ativo ? 1 : 0, updatedAt: new Date() })
    .where(and(eq(colaboradores.id, id), eq(colaboradores.tenantId, tenantId)));
}

/** Remove um colaborador */
export async function deletarColaborador(tenantId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db
    .delete(colaboradores)
    .where(and(eq(colaboradores.id, id), eq(colaboradores.tenantId, tenantId)));
}

/** Retorna ranking de profissionais por faturamento num período (mês/ano) */
export async function listarRankingPorPeriodo(
  tenantId: number,
  mes: number,
  ano: number
): Promise<{
  itens: Array<{
    colaboradorId: number;
    nome: string;
    apelido: string | null;
    fotoUrl: string | null;
    empresaSlug: string;
    categoriaRanking: 'barbeiro' | 'auxiliar' | 'recepcao';
    totalServicos: number;
    totalProdutos: number;
    totalGeral: number;
    detalhesServicos: string | null;
    detalhesProdutos: string | null;
  }>;
  ultimaAtualizacao: Date | null;
}> {
  const db = await getDb();
  if (!db) return { itens: [], ultimaAtualizacao: null };
  const rows = await db
    .select({
      colaboradorId: faturamentoColaboradores.colaboradorId,
      nome: colaboradores.nome,
      apelido: colaboradores.apelido,
      fotoUrl: colaboradores.fotoUrl,
      empresaSlug: faturamentoColaboradores.empresaSlug,
      categoriaRanking: colaboradores.categoriaRanking,
      totalServicos: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalServicos}), 0)`,
      totalProdutos: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalProdutos}), 0)`,
      totalGeral: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalGeral}), 0)`,
      ultimaSyncEm: sql<Date | null>`MAX(${faturamentoColaboradores.ultimaSyncEm})`,
      // Pegar o detalhesServicos do registro mais recente (maior ultimaSyncEm)
      detalhesServicos: sql<string | null>`(
        SELECT detalhesServicos FROM faturamentoColaboradores fc2
        WHERE fc2.tenantId = ${faturamentoColaboradores.tenantId}
          AND fc2.colaboradorId = ${faturamentoColaboradores.colaboradorId}
          AND fc2.mes = ${faturamentoColaboradores.mes}
          AND fc2.ano = ${faturamentoColaboradores.ano}
        ORDER BY fc2.ultimaSyncEm DESC LIMIT 1
      )`,
      // Pegar o detalhesProdutos do registro mais recente
      detalhesProdutos: sql<string | null>`(
        SELECT detalhesProdutos FROM faturamentoColaboradores fc3
        WHERE fc3.tenantId = ${faturamentoColaboradores.tenantId}
          AND fc3.colaboradorId = ${faturamentoColaboradores.colaboradorId}
          AND fc3.mes = ${faturamentoColaboradores.mes}
          AND fc3.ano = ${faturamentoColaboradores.ano}
        ORDER BY fc3.ultimaSyncEm DESC LIMIT 1
      )`,
    })
    .from(faturamentoColaboradores)
    .innerJoin(colaboradores, eq(colaboradores.id, faturamentoColaboradores.colaboradorId))
    .where(
      and(
        eq(faturamentoColaboradores.tenantId, tenantId),
        eq(faturamentoColaboradores.mes, mes),
        eq(faturamentoColaboradores.ano, ano)
      )
    )
    .groupBy(
      faturamentoColaboradores.colaboradorId,
      colaboradores.nome,
      colaboradores.apelido,
      colaboradores.fotoUrl,
      faturamentoColaboradores.empresaSlug,
      colaboradores.categoriaRanking
    )
    .orderBy(desc(sql`SUM(${faturamentoColaboradores.totalGeral})`));
  // A última atualização é o MAX global entre todos os colaboradores do período
  const ultimaAtualizacao = rows.reduce((max: Date | null, r) => {
    if (!r.ultimaSyncEm) return max;
    const d = r.ultimaSyncEm instanceof Date ? r.ultimaSyncEm : new Date(r.ultimaSyncEm);
    return !max || d > max ? d : max;
  }, null);
  return {
    itens: rows.map((r) => ({
      colaboradorId: r.colaboradorId,
      nome: r.nome,
      apelido: r.apelido ?? null,
      fotoUrl: r.fotoUrl ?? null,
      empresaSlug: r.empresaSlug,
      categoriaRanking: (r.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
      totalServicos: Number(r.totalServicos),
      totalProdutos: Number(r.totalProdutos),
      totalGeral: Number(r.totalGeral),
      detalhesServicos: r.detalhesServicos ?? null,
      detalhesProdutos: r.detalhesProdutos ?? null,
    })),
    ultimaAtualizacao,
  };
}

/** Retorna os períodos (mês/ano) que têm dados de faturamento de colaboradores */
export async function listarPeriodosComDados(tenantId: number): Promise<Array<{ mes: number; ano: number }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({
      mes: faturamentoColaboradores.mes,
      ano: faturamentoColaboradores.ano,
    })
    .from(faturamentoColaboradores)
    .where(eq(faturamentoColaboradores.tenantId, tenantId))
    .orderBy(desc(faturamentoColaboradores.ano), desc(faturamentoColaboradores.mes));
  return rows;
}

/** Insere ou atualiza o faturamento de um colaborador para um período específico */
export async function upsertFaturamentoColaborador(input: {
  tenantId: number;
  colaboradorId: number;
  empresaSlug?: string;
  mes: number;
  ano: number;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  detalhesServicos?: string | null;
  detalhesProdutos?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select({ id: faturamentoColaboradores.id })
    .from(faturamentoColaboradores)
    .where(
      and(
        eq(faturamentoColaboradores.tenantId, input.tenantId),
        eq(faturamentoColaboradores.colaboradorId, input.colaboradorId),
        eq(faturamentoColaboradores.mes, input.mes),
        eq(faturamentoColaboradores.ano, input.ano)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(faturamentoColaboradores)
      .set({
        totalServicos: String(input.totalServicos),
        totalProdutos: String(input.totalProdutos),
        totalGeral: String(input.totalGeral),
        detalhesServicos: input.detalhesServicos ?? null,
        detalhesProdutos: input.detalhesProdutos ?? null,
        updatedAt: new Date(),
      })
      .where(eq(faturamentoColaboradores.id, existing[0].id));
  } else {
    await db.insert(faturamentoColaboradores).values({
      tenantId: input.tenantId,
      colaboradorId: input.colaboradorId,
      empresaSlug: input.empresaSlug ?? "barbiero-grupo",
      mes: input.mes,
      ano: input.ano,
      totalServicos: String(input.totalServicos),
      totalProdutos: String(input.totalProdutos),
      totalGeral: String(input.totalGeral),
      detalhesServicos: input.detalhesServicos ?? null,
      detalhesProdutos: input.detalhesProdutos ?? null,
    });
  }
}

/** Retorna o histórico mensal agregado por unidade (últimos N meses) */
export async function listarHistoricoUnidades(
  tenantId: number,
  ultimos: number = 6
): Promise<Array<{
  mes: number;
  ano: number;
  empresaSlug: string;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  profissionais: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      mes: faturamentoColaboradores.mes,
      ano: faturamentoColaboradores.ano,
      empresaSlug: faturamentoColaboradores.empresaSlug,
      totalServicos: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalServicos}), 0)`,
      totalProdutos: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalProdutos}), 0)`,
      totalGeral: sql<number>`COALESCE(SUM(${faturamentoColaboradores.totalGeral}), 0)`,
      profissionais: sql<number>`COUNT(DISTINCT ${faturamentoColaboradores.colaboradorId})`,
    })
    .from(faturamentoColaboradores)
    .where(eq(faturamentoColaboradores.tenantId, tenantId))
    .groupBy(
      faturamentoColaboradores.ano,
      faturamentoColaboradores.mes,
      faturamentoColaboradores.empresaSlug
    )
    .orderBy(
      desc(faturamentoColaboradores.ano),
      desc(faturamentoColaboradores.mes),
      faturamentoColaboradores.empresaSlug
    )
    .limit(ultimos * 3); // 3 unidades possíveis por mês
  return rows.map(r => ({
    mes: r.mes,
    ano: r.ano,
    empresaSlug: r.empresaSlug,
    totalServicos: Number(r.totalServicos),
    totalProdutos: Number(r.totalProdutos),
    totalGeral: Number(r.totalGeral),
    profissionais: Number(r.profissionais),
  }));
}

/** Retorna os últimos logs de sincronização de TODAS as empresas do tenant (para o painel de status) */
export async function listAllCashbarberSyncLogs(tenantId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cashbarberSyncLog)
    .where(eq(cashbarberSyncLog.tenantId, tenantId))
    .orderBy(desc(cashbarberSyncLog.executadoEm))
    .limit(limit);
}

/** Retorna o último log de sync de cada empresa do tenant (para o card de status rápido) */
export async function getUltimoSyncPorEmpresa(tenantId: number): Promise<
  Array<{ empresaSlug: string; status: string; executadoEm: Date; diasSincronizados: number; erros: string | null }>
> {
  const db = await getDb();
  if (!db) return [];
  const logs = await db
    .select()
    .from(cashbarberSyncLog)
    .where(eq(cashbarberSyncLog.tenantId, tenantId))
    .orderBy(desc(cashbarberSyncLog.executadoEm))
    .limit(100);

  const porEmpresa = new Map<string, typeof logs[0]>();
  for (const log of logs) {
    if (!porEmpresa.has(log.empresaSlug)) {
      porEmpresa.set(log.empresaSlug, log);
    }
  }
  return Array.from(porEmpresa.values()).map((l) => ({
    empresaSlug: l.empresaSlug,
    status: l.status,
    executadoEm: l.executadoEm,
    diasSincronizados: l.diasSincronizados,
    erros: l.erros ?? null,
  }));
}
