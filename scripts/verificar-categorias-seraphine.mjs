/**
 * Script para verificar e atualizar as categorias da Seraphine no banco de dados
 * para corresponder ao sistema Avec: Cabelo, Manicure e Pedicure, Sobrancelha, Pacote, Recorrência
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar empresas do tipo seraphine
const [empresas] = await db.execute(
  "SELECT id, nome, slug, tipoCategorias FROM empresas WHERE tipoCategorias = 'seraphine'"
);

console.log("=== Empresas Seraphine ===");
console.log(empresas);

if (empresas.length === 0) {
  console.log("Nenhuma empresa do tipo seraphine encontrada.");
  await db.end();
  process.exit(0);
}

// Para cada empresa seraphine, verificar as categorias
for (const emp of empresas) {
  const [cats] = await db.execute(
    "SELECT id, nome, ordem, ativo FROM categorias WHERE empresaSlug = ? ORDER BY ordem",
    [emp.slug]
  );
  
  console.log(`\n=== Categorias de ${emp.nome} (${emp.slug}) ===`);
  console.log(cats);
  
  // Verificar se as categorias precisam ser atualizadas
  const CATS_CORRETAS = ["Cabelo", "Manicure e Pedicure", "Sobrancelha", "Pacote", "Recorrência"];
  
  if (cats.length === 0) {
    console.log(`  → Sem categorias no banco, serão criadas automaticamente`);
    continue;
  }
  
  // Verificar se os nomes estão corretos
  const nomesAtuais = cats.map(c => c.nome);
  const precisaAtualizar = CATS_CORRETAS.some((nome, i) => nomesAtuais[i] !== nome);
  
  if (!precisaAtualizar) {
    console.log(`  → Categorias já estão corretas!`);
    continue;
  }
  
  console.log(`  → Atualizando categorias para os nomes corretos do Avec...`);
  
  // Atualizar os nomes das categorias existentes
  for (let i = 0; i < Math.min(cats.length, CATS_CORRETAS.length); i++) {
    const cat = cats[i];
    const nomeCorreto = CATS_CORRETAS[i];
    
    if (cat.nome !== nomeCorreto) {
      await db.execute(
        "UPDATE categorias SET nome = ? WHERE id = ?",
        [nomeCorreto, cat.id]
      );
      console.log(`    cat${i+1}: "${cat.nome}" → "${nomeCorreto}"`);
    } else {
      console.log(`    cat${i+1}: "${cat.nome}" (sem alteração)`);
    }
  }
  
  console.log(`  → Categorias atualizadas!`);
}

// Verificar também os faturamentos existentes para ver se há dados da Seraphine
const [faturamentos] = await db.execute(
  `SELECT f.data, f.cat1, f.cat2, f.cat3, f.cat4, f.cat5 
   FROM faturamentos f 
   JOIN empresas e ON f.empresaSlug = e.slug 
   WHERE e.tipoCategorias = 'seraphine' 
   ORDER BY f.data DESC 
   LIMIT 10`
);

console.log("\n=== Últimos faturamentos da Seraphine ===");
console.log(faturamentos);

await db.end();
console.log("\nScript concluído!");
