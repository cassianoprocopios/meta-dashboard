import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarMetasMaio() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const mes = 5; // Maio
    const ano = 2026;
    
    console.log(`\n📊 Verificando metas configuradas para Maio 2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar metas
    const [metas] = await connection.query(
      `SELECT empresaSlug, metaQuinzenal, metaMensal FROM metas WHERE tenantId = ? AND mes = ? AND ano = ? ORDER BY empresaSlug`,
      [tenantId, mes, ano]
    );
    
    if (metas.length === 0) {
      console.log(`\n⚠️ Nenhuma meta configurada para maio de 2026!`);
      console.log(`\nPreciso copiar as metas de abril para maio...`);
      
      // Buscar metas de abril
      const [metasAbril] = await connection.query(
        `SELECT empresaSlug, metaQuinzenal, metaMensal FROM metas WHERE tenantId = ? AND mes = 4 AND ano = ? ORDER BY empresaSlug`,
        [tenantId, ano]
      );
      
      console.log(`\nMetas de Abril 2026:`);
      metasAbril.forEach(m => {
        console.log(`  ${m.empresaSlug}: Quinzenal R$ ${m.metaQuinzenal}, Mensal R$ ${m.metaMensal}`);
      });
      
    } else {
      console.log(`\n✅ Metas encontradas para maio:`);
      metas.forEach(m => {
        console.log(`  ${m.empresaSlug}: Quinzenal R$ ${m.metaQuinzenal}, Mensal R$ ${m.metaMensal}`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

verificarMetasMaio().catch(console.error);
