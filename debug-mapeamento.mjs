import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugMapeamento() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    
    console.log(`\n📊 Verificando mapeamento de categorias do CashBarber`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar mapeamento para MASCOTE
    const [mascoteMapeamento] = await connection.query(
      `SELECT * FROM cashbarberMapeamento WHERE tenantId = ? AND empresaSlug = 'MASCOTE'`,
      [tenantId]
    );
    
    console.log(`\n🔍 Mapeamento de MASCOTE:`);
    if (mascoteMapeamento.length === 0) {
      console.log(`  ⚠️ Nenhum mapeamento configurado!`);
    } else {
      mascoteMapeamento.forEach(m => {
        console.log(`  ${m.cbCategoriaId || m.cbCategoriaNome} → ${m.metaCategoria}`);
      });
    }
    
    // Buscar mapeamento para MORUMBI
    const [morumbiMapeamento] = await connection.query(
      `SELECT * FROM cashbarberMapeamento WHERE tenantId = ? AND empresaSlug = 'MORUMBI'`,
      [tenantId]
    );
    
    console.log(`\n🔍 Mapeamento de MORUMBI:`);
    if (morumbiMapeamento.length === 0) {
      console.log(`  ⚠️ Nenhum mapeamento configurado!`);
    } else {
      morumbiMapeamento.forEach(m => {
        console.log(`  ${m.cbCategoriaId || m.cbCategoriaNome} → ${m.metaCategoria}`);
      });
    }
    
    // Buscar mapeamento para SERAPHINE
    const [seraphineMapping] = await connection.query(
      `SELECT * FROM cashbarberMapeamento WHERE tenantId = ? AND empresaSlug = 'SERAPHINE'`,
      [tenantId]
    );
    
    console.log(`\n🔍 Mapeamento de SERAPHINE:`);
    if (seraphineMapping.length === 0) {
      console.log(`  ⚠️ Nenhum mapeamento configurado!`);
    } else {
      seraphineMapping.forEach(m => {
        console.log(`  ${m.cbCategoriaId || m.cbCategoriaNome} → ${m.metaCategoria}`);
      });
    }
    
    // Verificar config do CashBarber
    console.log(`\n\n📋 Configuração do CashBarber:`);
    const [configs] = await connection.query(
      `SELECT empresaSlug, cbFilialId, cbFilialNome, sincronizacaoAutomatica FROM cashbarberConfig WHERE tenantId = ?`,
      [tenantId]
    );
    
    configs.forEach(c => {
      console.log(`  ${c.empresaSlug}: Filial ID ${c.cbFilialId} (${c.cbFilialNome}), Auto: ${c.sincronizacaoAutomatica ? 'SIM' : 'NÃO'}`);
    });
    
  } finally {
    await connection.end();
  }
}

debugMapeamento().catch(console.error);
