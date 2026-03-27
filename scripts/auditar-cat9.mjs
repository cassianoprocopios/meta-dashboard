/**
 * Script de auditoria: compara soma de cat9 no banco com recorrenciaValorCashbarber
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const hoje = new Date();
const mes = hoje.getMonth() + 1;
const ano = hoje.getFullYear();
const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
const diaHoje = hoje.getDate();

console.log(`=== AUDITORIA cat9 vs Dpote — ${mesSigla} (dia ${diaHoje}) ===\n`);

// 1. Buscar recorrenciaValorCashbarber e recorrenciaFonte por empresa
const [configs] = await conn.execute(
  `SELECT empresaSlug, recorrenciaFonte, recorrenciaValorCashbarber, recorrenciaValorManual, dpoteFilialNome
   FROM cashbarberConfig
   WHERE ativo = 1`
);

for (const config of configs) {
  const slug = config.empresaSlug;
  const fonte = config.recorrenciaFonte ?? "cashbarber";
  const valorCB = parseFloat(config.recorrenciaValorCashbarber ?? "0");
  const valorManual = parseFloat(config.recorrenciaValorManual ?? "0");
  const filial = config.dpoteFilialNome ?? slug;

  // 2. Buscar todos os lançamentos de cat9 do mês para esta empresa
  const [rows] = await conn.execute(
    `SELECT data, cat9, sincronizadoCB
     FROM faturamentos
     WHERE empresaSlug = ? AND data LIKE ?
     ORDER BY data ASC`,
    [slug, `${mesSigla}%`]
  );

  const diasComValor = rows.filter(r => parseFloat(r.cat9 ?? "0") > 0);
  const diasZerados = rows.filter(r => parseFloat(r.cat9 ?? "0") === 0);
  const somacat9 = rows.reduce((acc, r) => acc + parseFloat(r.cat9 ?? "0"), 0);
  const diasDecorridos = diaHoje;
  const valorDiarioEsperado = valorCB > 0 ? valorCB / diasDecorridos : 0;
  const somaEsperada = valorDiarioEsperado * diasDecorridos;

  console.log(`─── ${filial.toUpperCase()} (${slug}) ───`);
  console.log(`  Fonte:                  ${fonte}`);
  console.log(`  recorrenciaValorCB:     R$ ${valorCB.toFixed(2)}`);
  console.log(`  recorrenciaValorManual: R$ ${valorManual.toFixed(2)}`);
  console.log(`  Total dias no banco:    ${rows.length}`);
  console.log(`  Dias com cat9 > 0:      ${diasComValor.length}`);
  console.log(`  Dias com cat9 = 0:      ${diasZerados.length}`);
  console.log(`  Soma cat9 (banco):      R$ ${somacat9.toFixed(2)}`);
  console.log(`  Soma esperada (CB):     R$ ${somaEsperada.toFixed(2)}`);
  console.log(`  Divergência:            R$ ${(somacat9 - somaEsperada).toFixed(2)}`);

  // Mostrar primeiros e últimos dias para detectar padrão
  if (diasComValor.length > 0) {
    const primeiro = diasComValor[0];
    const ultimo = diasComValor[diasComValor.length - 1];
    const valorDiarioReal = parseFloat(primeiro.cat9);
    console.log(`  Valor diário (1º dia):  R$ ${valorDiarioReal.toFixed(2)}`);
    console.log(`  Valor diário (último):  R$ ${parseFloat(ultimo.cat9).toFixed(2)}`);
    // Verificar se todos os dias têm o mesmo valor
    const valoresUnicos = [...new Set(diasComValor.map(r => r.cat9))];
    if (valoresUnicos.length === 1) {
      console.log(`  Todos os dias iguais:   SIM (R$ ${valoresUnicos[0]})`);
    } else {
      console.log(`  Valores distintos:      ${valoresUnicos.length} (${valoresUnicos.slice(0, 5).join(", ")}...)`);
    }
    // Verificar se o divisor usado foi 31 ou 26
    const divisor31 = valorCB / 31;
    const divisor26 = valorCB / 26;
    const diff31 = Math.abs(valorDiarioReal - divisor31);
    const diff26 = Math.abs(valorDiarioReal - divisor26);
    if (diff31 < 1) {
      console.log(`  ⚠️  Divisor usado: 31 dias (ERRADO — deveria ser ${diasDecorridos})`);
    } else if (diff26 < 1) {
      console.log(`  ✓  Divisor usado: 26 dias (correto para dia ${diasDecorridos})`);
    } else {
      console.log(`  ?  Divisor desconhecido (valor/dia = ${valorDiarioReal.toFixed(4)}, ÷31=${divisor31.toFixed(4)}, ÷26=${divisor26.toFixed(4)})`);
    }
  }
  console.log();
}

await conn.end();
console.log("Auditoria concluída.");
