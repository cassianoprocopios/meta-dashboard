import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const [configs] = await conn.execute('SELECT cbEmail, cbSenha FROM cashbarberConfig WHERE tenantId = 1 AND ativo = 1 LIMIT 1');
await conn.end();

const { cbEmail, cbSenha } = configs[0];

// Login
const loginResp = await fetch('https://api.cashbarber.com.br/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: cbEmail, password: cbSenha, ctx: 'painel' }),
});

let token;
const setCookie = loginResp.headers.get('set-cookie') || '';
const match = setCookie.match(/access_token_painel=([^;]+)/);
if (match) token = match[1];

if (!token) {
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
  const sc2 = resp2.headers.get('set-cookie') || '';
  const m2 = sc2.match(/access_token_painel=([^;]+)/);
  if (m2) token = m2[1];
}

if (!token) {
  console.error('Sem token');
  process.exit(1);
}

console.log('Login OK, buscando barbeiros ativos...');

// Buscar barbeiros ativos
const barbeiroResp = await fetch('https://api.cashbarber.com.br/api/painel/usuarios/simpleListBarbeirosAtivos', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

if (!barbeiroResp.ok) {
  console.error('Erro ao buscar barbeiros:', barbeiroResp.status);
  process.exit(1);
}

const barbeiros = await barbeiroResp.json();
console.log('Total barbeiros ativos:', barbeiros.length);

// Buscar por nomes específicos
const nomesBusca = ['camila', 'cintia', 'cíntia', 'daniela'];
for (const nome of nomesBusca) {
  const encontrados = barbeiros.filter(b => b.usu_name?.toLowerCase().includes(nome));
  if (encontrados.length > 0) {
    console.log(`\n${nome.toUpperCase()} encontrado(s):`, JSON.stringify(encontrados, null, 2));
  } else {
    console.log(`\n${nome.toUpperCase()}: não encontrado nos barbeiros ativos`);
  }
}

// Mostrar todos os barbeiros para referência
console.log('\nTodos os barbeiros ativos:');
for (const b of barbeiros) {
  console.log(`  [${b.id}] ${b.usu_name} | filial=${b.usu_id_filial}`);
}
