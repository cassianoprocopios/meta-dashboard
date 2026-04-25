import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function copiarMetasProximosMeses() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const anoAbril = 2026;
    const mesAbril = 4;
    
    console.log(`\n📋 Copiando metas de Abril para próximos meses`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar metas de abril
    const [metasAbril] = await connection.query(
      `SELECT empresaSlug, metaQuinzenal, metaMensal, diasUteis, diasUteisQuinzenal 
       FROM metas WHERE tenantId = ? AND mes = ? AND ano = ?`,
      [tenantId, mesAbril, anoAbril]
    );
    
    console.log(`\nMetas de Abril encontradas: ${metasAbril.length}`);
    
    // Copiar para os próximos 12 meses (maio a abril do próximo ano)
    for (let i = 1; i <= 12; i++) {
      let mes = mesAbril + i;
      let ano = anoAbril;
      
      if (mes > 12) {
        mes = mes - 12;
        ano = ano + 1;
      }
      
      console.log(`\n📅 Copiando para ${String(mes).padStart(2, '0')}/${ano}...`);
      
      for (const meta of metasAbril) {
        // Verificar se já existe
        const [existing] = await connection.query(
          `SELECT id FROM metas WHERE tenantId = ? AND empresaSlug = ? AND mes = ? AND ano = ?`,
          [tenantId, meta.empresaSlug, mes, ano]
        );
        
        if (existing.length === 0) {
          // Inserir nova meta
          await connection.query(
            `INSERT INTO metas (tenantId, empresaSlug, mes, ano, metaQuinzenal, metaMensal, diasUteis, diasUteisQuinzenal) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              tenantId,
              meta.empresaSlug,
              mes,
              ano,
              meta.metaQuinzenal,
              meta.metaMensal,
              meta.diasUteis,
              meta.diasUteisQuinzenal
            ]
          );
          console.log(`  ✅ ${meta.empresaSlug}: R$ ${meta.metaQuinzenal} (quinzenal) / R$ ${meta.metaMensal} (mensal)`);
        } else {
          console.log(`  ⏭️  ${meta.empresaSlug}: Já existe`);
        }
      }
    }
    
    console.log(`\n\n✅ Cópia concluída!`);
    
  } finally {
    await connection.end();
  }
}

copiarMetasProximosMeses().catch(console.error);
