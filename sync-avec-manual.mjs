import { sincronizarFaturamentoAvec } from './server/avecSincronizador.ts';
import dotenv from 'dotenv';

dotenv.config();

async function sincronizarManual() {
  try {
    console.log(`\n📊 Disparando sincronização manual do Avec para Seraphine`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const tenantId = 1;
    const empresaSlug = 'SERAPHINE';
    const agora = new Date();
    const mes = agora.getMonth() + 1;
    const ano = agora.getFullYear();
    
    console.log(`\nSincronizando ${empresaSlug} para ${mes}/${ano}...`);
    
    const resultado = await sincronizarFaturamentoAvec(tenantId, empresaSlug, mes, ano, 'manual');
    
    console.log(`\n✅ Sincronização concluída!`);
    console.log(`  Dias sincronizados: ${resultado.diasSincronizados}`);
    console.log(`  Dias ignorados: ${resultado.diasIgnorados}`);
    console.log(`  Dias fechados: ${resultado.diasFechados}`);
    
    if (resultado.detalhes && resultado.detalhes.length > 0) {
      console.log(`\n📋 Detalhes:`);
      resultado.detalhes.forEach(d => {
        if (d.status === 'sincronizado' || d.status === 'retry_registrado' || d.status === 'retry') {
          console.log(`  ${d.data}: ${d.status} - ${d.mensagem}`);
        }
      });
    }
    
  } catch (err) {
    console.error(`\n❌ Erro:`, err.message);
  }
}

sincronizarManual().catch(console.error);
