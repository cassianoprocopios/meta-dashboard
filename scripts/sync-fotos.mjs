/**
 * Script para sincronizar fotos dos profissionais do CashBarber
 * Executa a mesma lógica da procedure syncFotos do servidor
 */
import { createConnection } from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL não encontrado no ambiente');
  process.exit(1);
}

const conn = await createConnection(DB_URL);

// 1. Buscar configurações do CashBarber
const [configs] = await conn.execute(
  "SELECT cbEmail, cbSenha FROM cashbarberConfig WHERE tenantId = 1 AND ativo = 1 LIMIT 1"
);

if (!configs.length) {
  console.error('Nenhuma configuração CashBarber ativa encontrada');
  await conn.end();
  process.exit(1);
}

const { cbEmail, cbSenha } = configs[0];
console.log(`Usando credenciais: ${cbEmail}`);

// 2. Login no CashBarber
console.log('Fazendo login no CashBarber...');
const loginResp = await fetch('https://api.cashbarber.com.br/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: cbEmail, password: cbSenha, ctx: 'painel' }),
});

let token;
if (loginResp.status === 409) {
  const setCookie409 = loginResp.headers.get('set-cookie') || '';
  const match409 = setCookie409.match(/access_token_painel=([^;]+)/);
  if (match409) {
    token = match409[1];
    console.log('Login com 409 (sessão ativa), token extraído do cookie');
  } else {
    // Forçar logout e re-login
    await fetch('https://api.cashbarber.com.br/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cbEmail, ctx: 'painel' }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const resp2 = await fetch('https://api.cashbarber.com.br/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cbEmail, password: cbSenha, ctx: 'painel' }),
    });
    const setCookie2 = resp2.headers.get('set-cookie') || '';
    const match2 = setCookie2.match(/access_token_painel=([^;]+)/);
    if (!match2) throw new Error('Token não encontrado após re-login');
    token = match2[1];
    console.log('Re-login realizado com sucesso');
  }
} else if (!loginResp.ok) {
  throw new Error(`Login falhou: ${loginResp.status}`);
} else {
  const setCookie = loginResp.headers.get('set-cookie') || '';
  const match = setCookie.match(/access_token_painel=([^;]+)/);
  if (!match) throw new Error('Token não encontrado na resposta de login');
  token = match[1];
  console.log('Login realizado com sucesso');
}

// 3. Buscar lista de barbeiros ativos com fotos
console.log('\nBuscando lista de barbeiros ativos do CashBarber...');
const barbeiroResp = await fetch('https://api.cashbarber.com.br/api/painel/usuarios/simpleListBarbeirosAtivos', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

if (!barbeiroResp.ok) {
  throw new Error(`simpleListBarbeirosAtivos falhou: ${barbeiroResp.status}`);
}

const barbeiros = await barbeiroResp.json();
console.log(`Total de barbeiros ativos no CashBarber: ${barbeiros.length}`);
for (const b of barbeiros) {
  console.log(`  [${b.id}] ${b.usu_name} | filial=${b.usu_id_filial}`);
}

// 4. Buscar foto de cada barbeiro em paralelo
console.log('\nBuscando fotos de cada barbeiro...');
const barbeiroComFotos = await Promise.all(
  barbeiros.map(async (b) => {
    const fotoResp = await fetch(`https://api.cashbarber.com.br/api/painel/usuarios/${b.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!fotoResp.ok) return { ...b, fotoUrl: null };
    const data = await fotoResp.json();
    const fotoUrl = data?.foto?.url ?? null;
    return { ...b, fotoUrl };
  })
);

console.log('\nFotos encontradas:');
for (const b of barbeiroComFotos) {
  console.log(`  [${b.id}] ${b.usu_name} | foto=${b.fotoUrl ? '✅ ' + b.fotoUrl.substring(0, 80) : '❌ sem foto'}`);
}

// 5. Buscar colaboradores do banco
const [colaboradores] = await conn.execute(
  'SELECT id, nome, cashbarberProfissionalId, fotoUrl FROM colaboradores WHERE tenantId = 1 AND ativo = 1'
);

console.log(`\nColaboradores ativos no banco: ${colaboradores.length}`);

// 6. Atualizar fotos no banco
let atualizados = 0;
let semFoto = 0;
let semCbId = 0;
let semMatch = 0;
let iguais = 0;

for (const col of colaboradores) {
  if (!col.cashbarberProfissionalId) {
    semCbId++;
    console.log(`  ⚠️  ${col.nome} - sem cashbarberProfissionalId`);
    continue;
  }

  const barbeiro = barbeiroComFotos.find(b => b.id === col.cashbarberProfissionalId);
  if (!barbeiro) {
    semMatch++;
    console.log(`  ❓ ${col.nome} - cbId=${col.cashbarberProfissionalId} não encontrado no CashBarber`);
    continue;
  }

  const novaFoto = barbeiro.fotoUrl ?? null;
  if (novaFoto === col.fotoUrl) {
    iguais++;
    console.log(`  ✓  ${col.nome} - foto já atualizada`);
    continue;
  }

  // Atualizar no banco
  await conn.execute(
    'UPDATE colaboradores SET fotoUrl = ?, updatedAt = NOW() WHERE id = ? AND tenantId = 1',
    [novaFoto, col.id]
  );

  if (novaFoto) {
    atualizados++;
    console.log(`  ✅ ${col.nome} - foto atualizada: ${novaFoto.substring(0, 80)}`);
  } else {
    semFoto++;
    console.log(`  ❌ ${col.nome} - sem foto no CashBarber (fotoUrl removida)`);
  }
}

console.log(`
=== RESUMO ===
Atualizados com foto: ${atualizados}
Removidos (sem foto): ${semFoto}
Já estavam corretos: ${iguais}
Sem cbId configurado: ${semCbId}
Sem match no CashBarber: ${semMatch}
`);

await conn.end();
