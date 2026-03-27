/**
 * Script para redistribuir o valor Dpote (cat9) nos lançamentos diários
 * do dia 1 até o dia vigente do mês atual.
 *
 * Nova lógica: valorDiario = recorrenciaValorCashbarber / diasDecorridos
 * Isso garante que a soma dos dias lançados = valor total do CashBarber.
 */
import mysql2 from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const conn = await mysql2.createConnection(DATABASE_URL);

  // Buscar configs com recorrenciaValorCashbarber preenchido
  const [configs] = await conn.execute(
    'SELECT empresaSlug, recorrenciaValorCashbarber, tenantId FROM cashbarberConfig WHERE ativo=1 AND recorrenciaValorCashbarber IS NOT NULL AND recorrenciaFonte = "cashbarber"'
  );

  if (configs.length === 0) {
    console.log('Nenhuma config com recorrenciaValorCashbarber encontrada.');
    await conn.end();
    return;
  }

  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();
  const diaHoje = hoje.getDate();
  const totalDiasMes = new Date(ano, mes, 0).getDate();

  console.log(`Data atual: ${ano}-${String(mes).padStart(2,'0')}-${String(diaHoje).padStart(2,'0')}`);
  console.log(`Dias decorridos: ${diaHoje} | Total do mês: ${totalDiasMes}\n`);

  for (const config of configs) {
    const { empresaSlug, recorrenciaValorCashbarber, tenantId } = config;
    const valorTotal = parseFloat(recorrenciaValorCashbarber);
    const valorDiario = Math.round((valorTotal / diaHoje) * 100) / 100;

    console.log(`${empresaSlug}:`);
    console.log(`  Valor total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`  Valor diário (÷ ${diaHoje} dias): R$ ${valorDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`  Soma esperada (${diaHoje} × R$ ${valorDiario}): R$ ${(valorDiario * diaHoje).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    let atualizados = 0;
    let zerados = 0;

    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const cat9 = dia <= diaHoje ? String(valorDiario) : '0';

      // Verificar se existe registro para este dia
      const [existing] = await conn.execute(
        'SELECT id FROM faturamentos WHERE data = ? AND empresaSlug = ? AND tenantId = ?',
        [dataStr, empresaSlug, tenantId]
      );

      if (existing.length > 0) {
        await conn.execute(
          'UPDATE faturamentos SET cat9 = ? WHERE data = ? AND empresaSlug = ? AND tenantId = ?',
          [cat9, dataStr, empresaSlug, tenantId]
        );
        if (dia <= diaHoje) atualizados++;
        else zerados++;
      }
    }

    console.log(`  → ${atualizados} dias atualizados (cat9 = R$ ${valorDiario}), ${zerados} dias zerados\n`);
  }

  // Verificar soma final
  console.log('=== VERIFICAÇÃO FINAL ===');
  for (const config of configs) {
    const { empresaSlug, tenantId } = config;
    const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
    const [rows] = await conn.execute(
      'SELECT SUM(CAST(cat9 AS DECIMAL(15,2))) as total FROM faturamentos WHERE empresaSlug = ? AND tenantId = ? AND data LIKE ?',
      [empresaSlug, tenantId, `${mesStr}%`]
    );
    console.log(`${empresaSlug}: soma cat9 no mês = R$ ${parseFloat(rows[0].total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  await conn.end();
  console.log('\nConcluído!');
}

main().catch(console.error);
