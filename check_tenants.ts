import { getDb } from './server/db';
import { tenants, users } from './drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('DB not available'); process.exit(1); }

  const ts = await db.select().from(tenants).orderBy(desc(tenants.id)).limit(10);
  console.log('=== TENANTS ===');
  ts.forEach((t: any) => console.log(`  ID=${t.id} | Nome=${t.nome} | Slug=${t.slug} | Plano=${t.plano} | Ativo=${t.ativo} | AdminEmail=${t.adminEmail}`));

  const us = await db.select({ id: users.id, name: users.name, email: users.email, tenantId: users.tenantId, role: users.role, perfil: users.perfil }).from(users).orderBy(desc(users.id)).limit(10);
  console.log('\n=== USERS (últimos 10) ===');
  us.forEach((u: any) => console.log(`  ID=${u.id} | TenantID=${u.tenantId} | Nome=${u.name} | Email=${u.email} | Role=${u.role} | Perfil=${u.perfil}`));

  process.exit(0);
}

main().catch(console.error);
