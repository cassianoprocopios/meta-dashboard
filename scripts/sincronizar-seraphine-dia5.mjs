#!/usr/bin/env node

/**
 * Script para sincronizar faturamento do dia 5 da Seraphine
 * Executa sincronização para os tenants 1, 2 e 3
 * 
 * Uso: node scripts/sincronizar-seraphine-dia5.mjs
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🚀 Iniciando sincronização de faturamento da Seraphine - Dia 5\n');

const tenants = [1, 2, 3];
const mes = 5; // Maio
const ano = 2026;
const empresaSlug = 'SERAPHINE';

for (const tenantId of tenants) {
  console.log(`\n📊 Sincronizando Tenant ${tenantId}...`);
  
  try {
    // Executar a sincronização via tRPC
    const command = `cd ${projectRoot} && pnpm exec tsx -e "
      import { sincronizarFaturamentoAvec } from './server/avecSincronizador.js';
      
      const resultado = await sincronizarFaturamentoAvec(
        ${tenantId},
        '${empresaSlug}',
        ${mes},
        ${ano},
        'manual'
      );
      
      console.log('Resultado:', JSON.stringify(resultado, null, 2));
    "`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✅ Tenant ${tenantId} sincronizado com sucesso!`);
  } catch (error) {
    console.error(`❌ Erro ao sincronizar Tenant ${tenantId}:`, error.message);
  }
}

console.log('\n✨ Sincronização concluída!\n');
