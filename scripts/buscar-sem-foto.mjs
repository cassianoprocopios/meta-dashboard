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

// Buscar usuário ID 3
const resp3 = await fetch('https://api.cashbarber.com.br/api/painel/usuarios/3', {
  headers: { Authorization: 'Bearer ' + token },
});
console.log('Status busca ID 3:', resp3.status);
if (resp3.ok) {
  const data = await resp3.json();
  console.log('Usuário ID 3:', JSON.stringify(data, null, 2).substring(0, 500));
}

// Buscar todos os usuários (incluindo inativos)
const allResp = await fetch('https://api.cashbarber.com.br/api/painel/usuarios/simpleListBarbeiros', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

if (allResp.ok) {
  const all = await allResp.json();
  console.log('\nTotal barbeiros (incluindo inativos):', all.length);
  
  const camila = all.filter(b => b.usu_name?.toLowerCase().includes('camila'));
  console.log('\nCamilas encontradas:', JSON.stringify(camila, null, 2));
  
  const cintia = all.filter(b => 
    b.usu_name?.toLowerCase().includes('cintia') || 
    b.usu_name?.toLowerCase().includes('cíntia')
  );
  console.log('\nCintias encontradas:', JSON.stringify(cintia, null, 2));
  
  const daniela = all.filter(b => b.usu_name?.toLowerCase().includes('daniela'));
  console.log('\nDanielas encontradas:', JSON.stringify(daniela, null, 2));
} else {
  console.log('Erro ao buscar todos:', allResp.status, await allResp.text());
}
