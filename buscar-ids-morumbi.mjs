import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');

async function cashbarberLogin(email, senha) {
  const resp = await fetch('https://api.cashbarber.com.br/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, ctx: 'painel' })
  });
  if (resp.status === 409) {
    const sc = resp.headers.get('set-cookie') || '';
    const m = sc.match(/access_token_painel=([^;]+)/);
    if (m) return m[1];
    await fetch('https://api.cashbarber.com.br/api/auth/logout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ctx: 'painel' })
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const r2 = await fetch('https://api.cashbarber.com.br/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, ctx: 'painel' })
    });
    const sc2 = r2.headers.get('set-cookie') || '';
    const m2 = sc2.match(/access_token_painel=([^;]+)/);
    if (!m2) throw new Error('Token não encontrado após re-login');
    return m2[1];
  }
  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const sc = resp.headers.get('set-cookie') || '';
  const m = sc.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error('Token não encontrado');
  return m[1];
}

async function buscarBarbeiro(token, id) {
  try {
    const resp = await fetch('https://api.cashbarber.com.br/api/painel/relatorios/13', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inicial: '2026-03-01', data_final: '2026-03-30', barbeiro: id })
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const lista = Array.isArray(data) ? data : Object.values(data);
    if (lista.length > 0) return lista[0];
    return null;
  } catch (e) { return null; }
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const [configs] = await conn.execute(
    "SELECT cbEmail, cbSenha, cbFilialId FROM cashbarberConfig WHERE empresaSlug='MORUMBI' AND tenantId=1"
  );
  const cfg = configs[0];
  console.log('Filial Morumbi ID:', cfg.cbFilialId);

  const token = await cashbarberLogin(cfg.cbEmail, cfg.cbSenha);
  console.log('Login OK\n');

  // Profissionais já encontrados
  const encontrados = new Map([
    [580, 'Fábio'],
    [585, 'Cleison'],
    [587, 'João'],
  ]);
  
  // Nomes que ainda precisamos encontrar
  const faltando = ['adailton', 'christian', 'dan', 'emerson', 'kaleb', 'samuel', 'vanilson', 'recepção morumbi'];
  
  // Varrer em saltos de 5 nas faixas não testadas
  const faixas = [
    [1, 540],
    [681, 2000],
    [2000, 10000],
    [10000, 40000],
  ];
  
  for (const [inicio, fim] of faixas) {
    const salto = inicio < 1000 ? 1 : inicio < 5000 ? 5 : 20;
    console.log(`\nTestando ${inicio}-${fim} (saltos de ${salto})...`);
    
    for (let id = inicio; id <= fim; id += salto) {
      const item = await buscarBarbeiro(token, id);
      if (item) {
        const filial = item.filial || '';
        const nome = item.barbeiro || '';
        if (filial.toLowerCase().includes('morumbi')) {
          console.log(`  ✓ ID ${id}: "${nome}" | filial: ${filial}`);
          encontrados.set(id, nome);
          
          // Refinar: testar IDs próximos se usamos salto > 1
          if (salto > 1) {
            for (let j = id - salto + 1; j < id; j++) {
              if (encontrados.has(j)) continue;
              const item2 = await buscarBarbeiro(token, j);
              if (item2 && item2.filial?.toLowerCase().includes('morumbi')) {
                console.log(`    ✓ ID ${j}: "${item2.barbeiro}" | filial: ${item2.filial}`);
                encontrados.set(j, item2.barbeiro);
              }
            }
          }
        }
      }
      if (id % 100 === 0) await new Promise(r => setTimeout(r, 100));
    }
    
    // Verificar se já encontramos todos
    const nomesFaltando = faltando.filter(n => 
      !Array.from(encontrados.values()).some(v => v.toLowerCase().includes(n) || n.includes(v.toLowerCase()))
    );
    console.log(`Faltando: ${nomesFaltando.join(', ') || 'nenhum!'}`);
    if (nomesFaltando.length === 0) break;
  }
  
  console.log('\n=== RESULTADO FINAL ===');
  console.log(`Encontrados ${encontrados.size} profissionais do Morumbi:`);
  for (const [id, nome] of encontrados) {
    console.log(` - ID: ${id} | Nome: "${nome}"`);
  }
  
  // Atualizar banco
  console.log('\n--- Atualizando banco de dados ---');
  const [colaboradores] = await conn.execute(
    "SELECT id, nome FROM colaboradores WHERE tenantId=1 AND empresaSlug='barbiero-morumbi' AND cashbarberProfissionalId IS NULL AND ativo=1"
  );
  
  for (const [id, nome] of encontrados) {
    const nomeNorm = nome.toLowerCase().trim();
    const match = colaboradores.find(r => {
      const rNome = r.nome.toLowerCase().trim();
      return rNome === nomeNorm || 
             nomeNorm.includes(rNome) || 
             rNome.includes(nomeNorm) ||
             (nomeNorm.includes('recep') && rNome.includes('recep'));
    });
    if (match) {
      await conn.execute(
        "UPDATE colaboradores SET cashbarberProfissionalId=? WHERE id=?",
        [id, match.id]
      );
      console.log(`  ✓ ${match.nome} (ID banco: ${match.id}) → cashbarberProfissionalId = ${id}`);
      // Remover da lista para não duplicar
      const idx = colaboradores.findIndex(c => c.id === match.id);
      if (idx >= 0) colaboradores.splice(idx, 1);
    } else {
      console.log(`  ? Sem match no banco para "${nome}" (ID CashBarber: ${id})`);
    }
  }

  await conn.end();
}

main().catch(console.error);
