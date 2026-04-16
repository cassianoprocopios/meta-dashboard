import { sincronizarFaturamentoCashbarber } from '../server/cashbarberSincronizador.ts';

console.log('Sincronizando CashBarber Morumbi - abril/2026...');
try {
  const resultado = await sincronizarFaturamentoCashbarber(1, 'MORUMBI', 4, 2026, 'manual');
  console.log('Resultado:', JSON.stringify(resultado, null, 2));
} catch (e) {
  console.error('Erro:', e.message);
}
