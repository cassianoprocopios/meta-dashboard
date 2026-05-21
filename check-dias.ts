import { getDb } from './server/db';
import { empresas } from './drizzle/schema';

async function main() {
  const db = await getDb();
  const res = await db.select({ slug: empresas.slug, nome: empresas.nome, diasUteis: empresas.diasUteis }).from(empresas);
  for (const e of res) {
    const diasUteisDecorridos = Math.round(e.diasUteis * (20 / 31));
    const diasRestantes = Math.max(0, e.diasUteis - diasUteisDecorridos);
    console.log(`${e.nome}: diasUteis=${e.diasUteis}, decorridos=${diasUteisDecorridos}, restantes=${diasRestantes}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
