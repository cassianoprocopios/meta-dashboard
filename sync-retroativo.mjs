import { db } from './server/db.ts';
import { sincronizarFaturamentoAvecPorData } from './server/avecSincronizador.ts';

async function syncRetroativo() {
  console.log('[Sync Retroativo] Iniciando sincronização dos dias 13-20 de abril/2026...');
  
  const dataInicio = new Date('2026-04-13');
  const dataFim = new Date('2026-04-20');
  
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(
      dataInicio,
      dataFim,
      1, // tenantId
      'SERAPHINE'
    );
    
    console.log('[Sync Retroativo] Resultado:', resultado);
    console.log('[Sync Retroativo] Sincronização concluída com sucesso!');
    process.exit(0);
  } catch (erro) {
    console.error('[Sync Retroativo] Erro:', erro);
    process.exit(1);
  }
}

syncRetroativo();
