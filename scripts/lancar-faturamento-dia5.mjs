#!/usr/bin/env node

/**
 * Script para lançar faturamento do dia 5 da Seraphine
 * 
 * Dados do dia 5:
 * - Serviços: 2.409,00
 * - Pacotes: 554,00
 * - Produtos: 6,00
 * - Caixinha: 0,00 (não informado)
 * 
 * Executa para os tenants 1, 2 e 3
 */

import { getDb } from '../server/db.js';

const TENANTS = [1, 2, 3];
const EMPRESA_SLUG = 'SERAPHINE';
const DATA = '2026-05-05';

// Dados de faturamento do dia 5
const FATURAMENTO = {
  cat1: '2409.00',  // Serviços
  cat2: '554.00',   // Pacotes
  cat3: '6.00',     // Produtos
  cat4: '0.00',     // Caixinha (não informado)
  cat5: '0.00',
  cat6: '0.00',
  cat7: '0.00',
  cat8: '0.00',
  cat9: '0.00',
};

async function lancarFaturamento() {
  console.log('🚀 Iniciando lançamento de faturamento do dia 5 da Seraphine\n');
  console.log('📊 Dados a lançar:');
  console.log(`   Data: ${DATA}`);
  console.log(`   Serviços (cat1): R$ ${FATURAMENTO.cat1}`);
  console.log(`   Pacotes (cat2): R$ ${FATURAMENTO.cat2}`);
  console.log(`   Produtos (cat3): R$ ${FATURAMENTO.cat3}`);
  console.log(`   Caixinha (cat4): R$ ${FATURAMENTO.cat4}`);
  console.log(`   Total: R$ ${(parseFloat(FATURAMENTO.cat1) + parseFloat(FATURAMENTO.cat2) + parseFloat(FATURAMENTO.cat3) + parseFloat(FATURAMENTO.cat4)).toFixed(2)}\n`);

  const db = await getDb();
  if (!db) {
    console.error('❌ Erro: Não conseguiu conectar ao banco de dados');
    process.exit(1);
  }

  const { faturamentos } = await import('../drizzle/schema.js');
  const { eq, and } = await import('drizzle-orm');

  for (const tenantId of TENANTS) {
    console.log(`\n📝 Lançando para Tenant ${tenantId}...`);

    try {
      // Verificar se já existe registro para este dia
      const existente = await db
        .select()
        .from(faturamentos)
        .where(
          and(
            eq(faturamentos.tenantId, tenantId),
            eq(faturamentos.empresaSlug, EMPRESA_SLUG),
            eq(faturamentos.data, DATA)
          )
        )
        .limit(1);

      if (existente.length > 0) {
        // Atualizar registro existente
        console.log(`   Atualizando registro existente...`);
        await db
          .update(faturamentos)
          .set({
            ...FATURAMENTO,
            lancadoPor: 'manual-dia5',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(faturamentos.tenantId, tenantId),
              eq(faturamentos.empresaSlug, EMPRESA_SLUG),
              eq(faturamentos.data, DATA)
            )
          );
      } else {
        // Inserir novo registro
        console.log(`   Inserindo novo registro...`);
        await db.insert(faturamentos).values({
          tenantId,
          empresaSlug: EMPRESA_SLUG,
          data: DATA,
          ...FATURAMENTO,
          lancadoPor: 'manual-dia5',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log(`✅ Tenant ${tenantId} lançado com sucesso!`);
    } catch (error) {
      console.error(`❌ Erro ao lançar Tenant ${tenantId}:`, error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n✨ Lançamento concluído!\n');
  process.exit(0);
}

lancarFaturamento().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
