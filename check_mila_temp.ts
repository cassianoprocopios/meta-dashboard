import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("DB não disponível"); process.exit(1); }
  
  const result = await db.select().from(users).where(eq(users.email, "mila.nascimento76@gmail.com")).limit(1);
  if (result.length === 0) {
    console.log("Usuário NÃO encontrado no banco com esse email");
    const todos = await db.select({ id: users.id, name: users.name, email: users.email, perfil: users.perfil, ativo: users.ativo, loginMethod: users.loginMethod }).from(users);
    const parecidos = todos.filter(u => u.name?.toLowerCase().includes("mila") || u.name?.toLowerCase().includes("camila") || u.email?.toLowerCase().includes("mila"));
    console.log("Usuários parecidos:", JSON.stringify(parecidos, null, 2));
  } else {
    const u = result[0];
    console.log("Usuário encontrado:", JSON.stringify({
      id: u.id, name: u.name, email: u.email, perfil: u.perfil,
      role: u.role, ativo: u.ativo, tenantId: u.tenantId,
      loginMethod: u.loginMethod, empresaVinculada: u.empresaVinculada
    }, null, 2));
  }
  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
