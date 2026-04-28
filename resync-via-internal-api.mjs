import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Importar as funções de sincronização
import { sincronizarFaturamentoCashbarber } from './server/cashbarberSincronizador.ts';
import { getCashbarberConfig, listCashbarberMapeamento } from './server/db.ts';
import { cashbarberLogin, cashbarberListarServicos, cashbarberListarProdutos } from './server/cashbarber.ts';

async function resyncViaInternalAPI() {
  console.log(`\n🔄 Resincronizando dados de 27/4 em diante`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const tenantId = 1;
  const empresas = ['MASCOTE', 'MORUMBI'];
  const mes = 4;
  const ano = 2026;
  
  try {
    for (const empresa of empresas) {
      console.log(`\n📡 Sincronizando ${empresa} (${mes}/${ano})...`);
      
      try {
        // Chamar função de sincronização
        const resultado = await sincronizarFaturamentoCashbarber(
          tenantId,
          empresa,
          mes,
          ano
        );
        
        console.log(`✅ ${empresa} sincronizado:`);
        console.log(`   Dias sincronizados: ${resultado.diasSincronizados}`);
        console.log(`   Dias ignorados: ${resultado.diasIgnorados}`);
        if (resultado.recorrenciaAtualizada) {
          console.log(`   Recorrência atualizada: R$ ${resultado.recorrenciaValor?.toFixed(2)}`);
        }
        
      } catch (err) {
        console.error(`❌ Erro ao sincronizar ${empresa}:`, err.message);
      }
    }
    
    console.log(`\n✅ Resincronização concluída!`);
    
  } catch (err) {
    console.error(`❌ Erro geral:`, err.message);
  }
}

resyncViaInternalAPI();
