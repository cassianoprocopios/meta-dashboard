/**
 * Script para verificar quais dias de março/2026 da Seraphine já estão no banco
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const db = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await db.execute(
  `SELECT data, cat1, cat2, cat3, cat4, cat5, cat9,
          (CAST(cat1 AS DECIMAL(10,2)) + CAST(cat2 AS DECIMAL(10,2)) + CAST(cat3 AS DECIMAL(10,2)) + CAST(cat4 AS DECIMAL(10,2)) + CAST(cat5 AS DECIMAL(10,2))) AS total
   FROM faturamentos
   WHERE empresaSlug = 'SERAPHINE' AND data LIKE '2026-03-%'
   ORDER BY data ASC`
);

console.log(`=== Faturamentos da Seraphine em março/2026 (${rows.length} dias) ===\n`);

// Gerar todos os dias úteis de março/2026 (excluindo domingos)
const diasMes = [];
for (let d = 1; d <= 31; d++) {
  const date = new Date(2026, 2, d); // mês 2 = março (0-indexed)
  if (date.getMonth() !== 2) break; // passou de março
  const diaSemana = date.getDay(); // 0=dom, 6=sab
  if (diaSemana !== 0) { // excluir domingos
    diasMes.push(`2026-03-${String(d).padStart(2, '0')}`);
  }
}

const datasNoDb = new Set(rows.map(r => r.data));

console.log("Dias no banco:");
rows.forEach(r => {
  const d = new Date(r.data + 'T00:00:00');
  const diaSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
  console.log(`  ${r.data} (${diaSemana}) | Cabelo: R$ ${r.cat1} | Man/Ped: R$ ${r.cat2} | Sobrancelha: R$ ${r.cat3} | Pacote: R$ ${r.cat4} | Recorr: R$ ${r.cat5} | Total: R$ ${parseFloat(r.total).toFixed(2)}`);
});

console.log("\nDias faltando no banco (excluindo domingos):");
const faltando = diasMes.filter(d => !datasNoDb.has(d));
if (faltando.length === 0) {
  console.log("  Nenhum! Todos os dias úteis de março estão no banco.");
} else {
  faltando.forEach(d => {
    const date = new Date(d + 'T00:00:00');
    const diaSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][date.getDay()];
    console.log(`  ${d} (${diaSemana})`);
  });
}

// Total acumulado
const totalMes = rows.reduce((sum, r) => sum + parseFloat(r.total), 0);
console.log(`\nTotal acumulado março/2026: R$ ${totalMes.toFixed(2)}`);
console.log(`Dias com dados: ${rows.length} | Dias faltando: ${faltando.length}`);

await db.end();
