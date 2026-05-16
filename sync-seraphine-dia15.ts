/**
 * Sincroniza o dia 15/05/2026 da Seraphine via Avec (Relatório 0184)
 */
import { sincronizarFaturamentoAvec } from './server/avecSincronizador';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Iniciando sincronização do mês 5/2026 da Seraphine...');
console.log('(O sincronizador vai processar todos os dias, incluindo o 15)');

const resultado = await sincronizarFaturamentoAvec(
  1,                    // tenantId
  'barbiero-seraphine', // empresaSlug
  5,                    // mes
  2026,                 // ano
  'manual'              // origem
);

console.log('\n=== RESULTADO ===');
console.log(`Sincronizados: ${resultado.diasSincronizados}`);
console.log(`Ignorados: ${resultado.diasIgnorados}`);
console.log(`Fechados: ${resultado.diasFechados}`);
console.log('\nDetalhes:');
resultado.detalhes.forEach(d => {
  if (d.status !== 'ignorado') {
    console.log(`  ${d.data}: ${d.status} | total=${d.totalGeral ?? '-'} | ${d.mensagem ?? ''}`);
  }
});

process.exit(0);
