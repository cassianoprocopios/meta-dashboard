import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Carregar DATABASE_URL do .env
const envContent = readFileSync('/home/ubuntu/meta-dashboard/.env', 'utf8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=').slice(1).join('=').trim();

const profissionais = [
  { id: '24575', nome: 'Adailton',          cargo: 'Barbeiro',      ranking: true  },
  { id: '24784', nome: 'Dan',               cargo: 'Barbeiro',      ranking: true  },
  { id: '23173', nome: 'Emerson',           cargo: 'Barbeiro',      ranking: true  },
  { id: '23104', nome: 'Recepção Morumbi',  cargo: 'Recepcionista', ranking: false },
  { id: '27520', nome: 'Caio',              cargo: 'Barbeiro',      ranking: true  },
  { id: '22436', nome: 'Edinho',            cargo: 'Barbeiro',      ranking: true  },
  { id: '19442', nome: 'Christian',         cargo: 'Barbeiro',      ranking: true  },
  { id: '23224', nome: 'Isabella',          cargo: 'Barbeira',      ranking: true  },
  { id: '12372', nome: 'Samuel',            cargo: 'Barbeiro',      ranking: true  },
  { id: '29459', nome: 'Karen',             cargo: 'Barbeira',      ranking: true  },
  { id: '25571', nome: 'Mell',              cargo: 'Barbeira',      ranking: true  },
  { id: '585',   nome: 'Cleison',           cargo: 'Barbeiro',      ranking: true  },
  { id: '22435', nome: 'Neudo',             cargo: 'Barbeiro',      ranking: true  },
  { id: '587',   nome: 'João',              cargo: 'Barbeiro',      ranking: true  },
  { id: '2603',  nome: 'Vanilson',          cargo: 'Barbeiro',      ranking: true  },
  { id: '23105', nome: 'Recepção Mascote',  cargo: 'Recepcionista', ranking: false },
  { id: '24720', nome: 'Vinicius',          cargo: 'Barbeiro',      ranking: true  },
  { id: '580',   nome: 'Fábio',             cargo: 'Barbeiro',      ranking: true  },
  { id: '32423', nome: 'Renan',             cargo: 'Barbeiro',      ranking: true  },
  { id: '35930', nome: 'Mirela',            cargo: 'Barbeira',      ranking: true  },
  { id: '34337', nome: 'Kaleb',             cargo: 'Barbeiro',      ranking: true  },
  { id: '34288', nome: 'Felipe',            cargo: 'Barbeiro',      ranking: true  },
  { id: '34191', nome: 'Eduarda',           cargo: 'Barbeira',      ranking: true  },
];

const tenantId = 1; // Barbiero Grupo

async function main() {
  const conn = await mysql.createConnection(dbUrl);
  const now = new Date();
  let inserted = 0;
  let skipped = 0;

  for (const p of profissionais) {
    try {
      // Verificar se já existe com esse cashbarberProfissionalId
      const [existing] = await conn.execute(
        'SELECT id FROM colaboradores WHERE tenantId = ? AND cashbarberProfissionalId = ?',
        [tenantId, p.id]
      );
      if (existing.length > 0) {
        console.log('⏭  Já existe:', p.nome, '(ID CashBarber:', p.id + ')');
        skipped++;
        continue;
      }

      await conn.execute(
        `INSERT INTO colaboradores (tenantId, nome, apelido, cargo, cashbarberProfissionalId, ativo, exibirNoRanking, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [tenantId, p.nome, p.nome, p.cargo, p.id, p.ranking ? 1 : 0, now, now]
      );
      inserted++;
      console.log('✓ Inserido:', p.nome, '| Cargo:', p.cargo, '| ID CashBarber:', p.id, '| Ranking:', p.ranking ? 'Sim' : 'Não');
    } catch (err) {
      console.error('✗ Erro ao inserir', p.nome, ':', err.message);
    }
  }

  console.log('\n=== RESUMO ===');
  console.log('Inseridos:', inserted);
  console.log('Já existiam:', skipped);
  console.log('Total processado:', profissionais.length);

  // Verificar resultado final
  const [total] = await conn.execute('SELECT COUNT(*) as total FROM colaboradores WHERE tenantId = ?', [tenantId]);
  console.log('Total no banco (tenantId=1):', total[0].total);

  await conn.end();
}

main().catch(console.error);
