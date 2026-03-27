import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL não definida'); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);
const [rows] = await conn.execute("SELECT id, cbFilialNome as nome, cbEmail, cbSenha FROM cashbarberConfig WHERE ativo = 1 LIMIT 1");
await conn.end();

if (!rows.length) { console.error('Nenhuma config CashBarber'); process.exit(1); }
const config = rows[0];
console.log('Empresa:', config.nome);

// Login (token vem no cookie access_token_painel)
async function cashbarberLogin(email, senha) {
  const resp = await fetch('https://api.cashbarber.com.br/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, ctx: 'painel' })
  });
  if (resp.status === 409) {
    const setCookie409 = resp.headers.get('set-cookie') || '';
    const match409 = setCookie409.match(/access_token_painel=([^;]+)/);
    if (match409) return match409[1];
    // Forçar logout e re-login
    await fetch('https://api.cashbarber.com.br/api/auth/logout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ctx: 'painel' })
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const resp2 = await fetch('https://api.cashbarber.com.br/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, ctx: 'painel' })
    });
    const setCookie2 = resp2.headers.get('set-cookie') || '';
    const match2 = setCookie2.match(/access_token_painel=([^;]+)/);
    if (!match2) throw new Error('Token não encontrado após re-login');
    return match2[1];
  }
  const setCookie = resp.headers.get('set-cookie') || '';
  const match = setCookie.match(/access_token_painel=([^;]+)/);
  if (!match) throw new Error('Token não encontrado: ' + setCookie.substring(0, 200));
  return match[1];
}

const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
console.log('Login OK, token:', token.substring(0, 30) + '...');

// Listar barbeiros
const barbeirosResp = await fetch('https://api.cashbarber.com.br/api/painel/usuarios/simpleListBarbeiro', {
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
});
console.log('Status barbeiros:', barbeirosResp.status);
const barbeirosText = await barbeirosResp.text();
console.log('Barbeiros raw (200 chars):', barbeirosText.substring(0, 200));
let barbeiros;
try { barbeiros = JSON.parse(barbeirosText); } catch(e) { console.error('Erro parse barbeiros:', e.message); process.exit(1); }
console.log('\n=== BARBEIROS (primeiros 5) ===');
console.log(JSON.stringify(barbeiros?.slice(0, 5), null, 2));
console.log('Total barbeiros:', barbeiros?.length);

// Buscar relatório 15 do mês atual para o primeiro barbeiro
const hoje = new Date();
const mesInicio = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`;
const mesFim = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;

if (barbeiros?.length > 0) {
  const primeiroBarbeiro = barbeiros[0];
  console.log(`\n=== RELATÓRIO 15 para barbeiro ID ${primeiroBarbeiro.id} (${primeiroBarbeiro.nome || primeiroBarbeiro.name}) ===`);
  
  const rel15Resp = await fetch('https://api.cashbarber.com.br/api/painel/relatorios/15', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data_inicial: mesInicio,
      data_final: mesFim,
      filial: null,
      barbeiro: primeiroBarbeiro.id,
      produtos: [],
      servicos: [],
      categorias: [],
      mostrar_inativos: false
    })
  });
  const rel15 = await rel15Resp.json();
  console.log('Status:', rel15Resp.status);
  console.log('Tipo:', Array.isArray(rel15) ? 'Array[' + rel15.length + ']' : typeof rel15);
  if (Array.isArray(rel15)) {
    console.log('Primeiro item:', JSON.stringify(rel15[0], null, 2));
    console.log('Último item:', JSON.stringify(rel15[rel15.length-1], null, 2));
    // Calcular total
    const total = rel15.reduce((sum, item) => sum + (parseFloat(item.valor || item.total || item.value || 0)), 0);
    console.log('Total calculado:', total.toFixed(2));
  } else {
    console.log('Chaves:', JSON.stringify(Object.keys(rel15 || {})));
    console.log('Dados:', JSON.stringify(rel15, null, 2).substring(0, 2000));
  }
}

// Buscar relatório 15 sem filtro para ver se tem breakdown por profissional
console.log('\n=== RELATÓRIO 15 SEM FILTRO - verificar breakdown por profissional ===');
const rel15AllResp = await fetch('https://api.cashbarber.com.br/api/painel/relatorios/15', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data_inicial: mesInicio,
    data_final: mesFim,
    filial: null,
    barbeiro: null,
    produtos: [],
    servicos: [],
    categorias: [],
    mostrar_inativos: false
  })
});
const rel15All = await rel15AllResp.json();
console.log('Tipo:', Array.isArray(rel15All) ? 'Array[' + rel15All.length + ']' : typeof rel15All);
if (Array.isArray(rel15All) && rel15All.length > 0) {
  console.log('Campos do primeiro item:', JSON.stringify(Object.keys(rel15All[0])));
  console.log('Primeiros 3 itens:', JSON.stringify(rel15All.slice(0, 3), null, 2));
  // Calcular total geral
  const totalGeral = rel15All.reduce((sum, item) => sum + (parseFloat(item.valor || item.total || item.value || 0)), 0);
  console.log('Total geral:', totalGeral.toFixed(2));
}
