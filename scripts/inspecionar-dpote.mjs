import mysql2 from 'mysql2/promise';
const DATABASE_URL = process.env.DATABASE_URL;

async function cashbarberLogin(email, senha) {
  const resp = await fetch('https://api.cashbarber.com.br/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha, ctx: 'painel' }),
  });
  if (resp.status === 409) {
    const setCookie = resp.headers.get('set-cookie') || '';
    const m = setCookie.match(/access_token_painel=([^;]+)/);
    if (m) return m[1];
    throw new Error('Login 409 sem token');
  }
  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const setCookie = resp.headers.get('set-cookie') || '';
  const m = setCookie.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error('Token nao encontrado no cookie');
  return m[1];
}

async function main() {
  const conn = await mysql2.createConnection(DATABASE_URL);
  const [rowsResult] = await conn.execute(
    'SELECT cbEmail, cbSenha, dpoteHistoricoId, empresaSlug FROM cashbarberConfig WHERE empresaSlug="MORUMBI" LIMIT 1'
  );
  await conn.end();
  const rows = rowsResult;

  const { cbEmail, cbSenha, dpoteHistoricoId } = rows[0];
  console.log('Histórico ID:', dpoteHistoricoId);

  const token = await cashbarberLogin(cbEmail, cbSenha);
  console.log('Login OK');

  const resp = await fetch(
    `https://api.cashbarber.com.br/api/painel/dpote/historico/${dpoteHistoricoId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`Buscar histórico falhou: ${resp.status}`);
  const historico = await resp.json();

  console.log('\n=== FATURAMENTO ===');
  console.log(JSON.stringify(historico.faturamento, null, 2));

  console.log('\n=== FILIAIS_SERVICOS ===');
  for (const f of historico.filiais_servicos) {
    const totalFichas = f.servicos.reduce((acc, s) => acc + (s.fichas || 0), 0);
    const camposExtras = Object.keys(f).filter(k => k !== 'filial' && k !== 'servicos');
    console.log(`Filial: ${f.filial.fil_bairro} (id: ${f.filial.id})`);
    console.log(`  fichas: ${totalFichas}`);
    console.log(`  campos extras no objeto filial_servico: ${JSON.stringify(camposExtras)}`);
    // Mostrar campos extras do objeto filial
    const camposFilial = Object.keys(f.filial).filter(k => k !== 'id' && k !== 'fil_bairro');
    console.log(`  campos extras no objeto filial: ${JSON.stringify(camposFilial)}`);
    if (camposExtras.length > 0) {
      for (const c of camposExtras) {
        console.log(`  ${c}: ${JSON.stringify(f[c])}`);
      }
    }
  }

  // Verificar se há campo de valor por filial diretamente
  console.log('\n=== TODOS OS CAMPOS DO HISTÓRICO ===');
  console.log(Object.keys(historico));
}

main().catch(console.error);
