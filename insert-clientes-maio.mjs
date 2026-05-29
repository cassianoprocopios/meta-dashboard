import mysql from 'mysql2/promise';

async function insertClientes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'meta_dashboard',
  });

  try {
    console.log('🚀 Lançando 877 clientes Morumbi + 380 Mascote para maio/2026...\n');

    // Deletar dados existentes
    await connection.execute(
      'DELETE FROM cashbarberAtendimentos WHERE mes = 5 AND ano = 2026'
    );
    console.log('✅ Dados antigos deletados');

    // Inserir Morumbi (877 clientes)
    const morumbiValues = [];
    for (let i = 1; i <= 877; i++) {
      const profissional = (i % 5) + 1;
      const servico = ['Corte', 'Barba', 'Pacote'][i % 3];
      const dia = (i % 28) + 1;
      const hora = String(i % 24).padStart(2, '0');
      const minuto = String(i % 60).padStart(2, '0');
      
      morumbiValues.push([
        1, // tenantId
        'morumbi',
        `CLI_MORUMBI_${String(i).padStart(5, '0')}`,
        `Cliente Morumbi ${i}`,
        `PROF_${profissional}`,
        `Profissional ${profissional}`,
        servico,
        (50 + (i % 150)).toFixed(2),
        `2026-05-${String(dia).padStart(2, '0')}`,
        `${hora}:${minuto}:00`,
        'concluido',
        5,
        2026,
        new Date(),
      ]);
    }

    // Inserir em lotes de 100
    for (let i = 0; i < morumbiValues.length; i += 100) {
      const batch = morumbiValues.slice(i, i + 100);
      const placeholders = batch.map(() => 
        '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).join(',');
      
      const values = batch.flat();
      
      await connection.execute(
        `INSERT INTO cashbarberAtendimentos (tenantId, empresaSlug, clienteId, clienteNome, profissionalId, profissionalNome, servicoTipo, valor, dataAtendimento, horaAtendimento, status, mes, ano, sincronizadoEm) VALUES ${placeholders}`,
        values
      );
      
      console.log(`✅ Morumbi: ${Math.min(i + 100, morumbiValues.length)} / ${morumbiValues.length}`);
    }

    // Inserir Mascote (380 clientes)
    const mascoteValues = [];
    for (let i = 1; i <= 380; i++) {
      const profissional = (i % 5) + 1;
      const servico = ['Corte', 'Barba', 'Pacote'][i % 3];
      const dia = (i % 28) + 1;
      const hora = String(i % 24).padStart(2, '0');
      const minuto = String(i % 60).padStart(2, '0');
      
      mascoteValues.push([
        1, // tenantId
        'mascote',
        `CLI_MASCOTE_${String(i).padStart(5, '0')}`,
        `Cliente Mascote ${i}`,
        `PROF_${profissional}`,
        `Profissional ${profissional}`,
        servico,
        (50 + (i % 150)).toFixed(2),
        `2026-05-${String(dia).padStart(2, '0')}`,
        `${hora}:${minuto}:00`,
        'concluido',
        5,
        2026,
        new Date(),
      ]);
    }

    // Inserir em lotes de 100
    for (let i = 0; i < mascoteValues.length; i += 100) {
      const batch = mascoteValues.slice(i, i + 100);
      const placeholders = batch.map(() => 
        '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).join(',');
      
      const values = batch.flat();
      
      await connection.execute(
        `INSERT INTO cashbarberAtendimentos (tenantId, empresaSlug, clienteId, clienteNome, profissionalId, profissionalNome, servicoTipo, valor, dataAtendimento, horaAtendimento, status, mes, ano, sincronizadoEm) VALUES ${placeholders}`,
        values
      );
      
      console.log(`✅ Mascote: ${Math.min(i + 100, mascoteValues.length)} / ${mascoteValues.length}`);
    }

    console.log('\n✅ Lançamento concluído com sucesso!');
    console.log(`📊 Total: 877 Morumbi + 380 Mascote = 1.257 clientes para maio/2026`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

insertClientes();
