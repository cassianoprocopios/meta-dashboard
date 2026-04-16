/**
 * Script para sincronizar manualmente os lançamentos do Avec de abril/2026
 * para a Seraphine.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Verificar quais dias de abril/2026 já têm faturamento lançado
  const [existentes] = await conn.execute(
    `SELECT dia, cabelo, manicurePedicure, sobrancelha, pacote, recorrencia, outros, totalFaturamento
     FROM faturamentoDiario
     WHERE tenantId = 1 AND empresaSlug = 'SERAPHINE' AND mes = 4 AND ano = 2026
     ORDER BY dia`
  );
  
  console.log(`\nDias com faturamento lançado para SERAPHINE (abril/2026):`);
  const diasComFaturamento = new Set();
  for (const r of existentes) {
    diasComFaturamento.add(r.dia);
    console.log(` - Dia ${String(r.dia).padStart(2,'0')}: R$ ${r.totalFaturamento} (cabelo=${r.cabelo}, manicure=${r.manicurePedicure}, sobrancelha=${r.sobrancelha})`);
  }
  
  // Verificar dias sem faturamento (dias 1-15 de abril)
  const hoje = new Date();
  const diaLimite = hoje.getMonth() === 3 && hoje.getFullYear() === 2026 ? hoje.getDate() - 1 : 15;
  const diasSemFaturamento = [];
  for (let d = 1; d <= diaLimite; d++) {
    if (!diasComFaturamento.has(d)) {
      diasSemFaturamento.push(d);
    }
  }
  
  console.log(`\nDias SEM faturamento (precisam sincronizar): ${diasSemFaturamento.join(', ') || 'nenhum'}`);
  console.log(`Total: ${diasComFaturamento.size} dias com faturamento, ${diasSemFaturamento.length} dias faltando`);
  
  await conn.end();
}

main().catch(console.error);
