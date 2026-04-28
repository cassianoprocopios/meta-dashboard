import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testSyncManual() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    const empresaSlug = 'MASCOTE';
    const data = '2026-04-27';
    
    console.log(`\n🔧 Testando sincronização manual para ${empresaSlug} em ${data}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 1. Buscar mapeamento
    const [mapeamento] = await connection.query(
      `SELECT tipo, cbId, cbNome, metaCategoria FROM cashbarberMapeamento 
       WHERE tenantId = ? AND empresaSlug = ?`,
      [tenantId, empresaSlug]
    );
    
    console.log(`\n1️⃣ Mapeamento encontrado: ${mapeamento.length} registros`);
    mapeamento.forEach(m => {
      console.log(`  ${m.tipo} (${m.cbId}): ${m.cbNome} → ${m.metaCategoria}`);
    });
    
    // 2. Buscar catálogo de serviços
    const [catalogoServicos] = await connection.query(
      `SELECT id, ser_id_categoria, ser_nome FROM cashbarberServicoCatalogo 
       WHERE tenantId = ? LIMIT 5`,
      [tenantId]
    );
    
    console.log(`\n2️⃣ Catálogo de serviços: ${catalogoServicos.length} registros`);
    catalogoServicos.forEach(s => {
      console.log(`  ID ${s.id}: ${s.ser_nome} (cat ${s.ser_id_categoria})`);
    });
    
    // 3. Buscar catálogo de produtos
    const [catalogoProdutos] = await connection.query(
      `SELECT id, pro_id_categoria, pro_nome FROM cashbarberProdutoCatalogo 
       WHERE tenantId = ? LIMIT 5`,
      [tenantId]
    );
    
    console.log(`\n3️⃣ Catálogo de produtos: ${catalogoProdutos.length} registros`);
    catalogoProdutos.forEach(p => {
      console.log(`  ID ${p.id}: ${p.pro_nome} (cat ${p.pro_id_categoria})`);
    });
    
    // 4. Buscar dados do faturamento atual
    const [faturamentoAtual] = await connection.query(
      `SELECT cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9 
       FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = ? AND data = ?`,
      [tenantId, empresaSlug, data]
    );
    
    console.log(`\n4️⃣ Faturamento atual em ${data}:`);
    if (faturamentoAtual.length === 0) {
      console.log(`  ⚠️ Nenhum registro encontrado`);
    } else {
      const f = faturamentoAtual[0];
      console.log(`  cat1: R$ ${f.cat1}`);
      console.log(`  cat2: R$ ${f.cat2}`);
      console.log(`  cat3: R$ ${f.cat3}`);
      console.log(`  cat4: R$ ${f.cat4}`);
      console.log(`  cat5: R$ ${f.cat5}`);
      console.log(`  cat6: R$ ${f.cat6}`);
      console.log(`  cat7: R$ ${f.cat7}`);
      console.log(`  cat8: R$ ${f.cat8}`);
      console.log(`  cat9: R$ ${f.cat9}`);
    }
    
    // 5. Verificar se há dados em dias anteriores
    console.log(`\n5️⃣ Comparando com dias anteriores:`);
    const [diasAnteriores] = await connection.query(
      `SELECT data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9 
       FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = ? AND data BETWEEN '2026-04-20' AND '2026-04-27'
       ORDER BY data`,
      [tenantId, empresaSlug]
    );
    
    diasAnteriores.forEach(d => {
      const total = parseFloat(d.cat1 || 0) + parseFloat(d.cat2 || 0) + parseFloat(d.cat3 || 0) + 
                   parseFloat(d.cat4 || 0) + parseFloat(d.cat5 || 0) + parseFloat(d.cat6 || 0) + 
                   parseFloat(d.cat7 || 0) + parseFloat(d.cat8 || 0) + parseFloat(d.cat9 || 0);
      const cat1a8 = parseFloat(d.cat1 || 0) + parseFloat(d.cat2 || 0) + parseFloat(d.cat3 || 0) + 
                    parseFloat(d.cat4 || 0) + parseFloat(d.cat5 || 0) + parseFloat(d.cat6 || 0) + 
                    parseFloat(d.cat7 || 0) + parseFloat(d.cat8 || 0);
      console.log(`  ${d.data}: cat1-8 R$ ${cat1a8.toFixed(2)}, cat9 R$ ${d.cat9}, Total R$ ${total.toFixed(2)}`);
    });
    
    console.log(`\n✅ Teste concluído!`);
    
  } finally {
    await connection.end();
  }
}

testSyncManual().catch(console.error);
