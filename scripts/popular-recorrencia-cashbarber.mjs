/**
 * Script para popular recorrenciaValorCashbarber no banco
 * usando os valores calculados diretamente da API do CashBarber.
 * 
 * Executa a mesma lógica do sincronizador: busca o histórico Dpote,
 * calcula a distribuição proporcional por fichas e salva no banco.
 */
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

async function buscarHistorico(token, historicoId) {
  const resp = await fetch(
    `https://api.cashbarber.com.br/api/painel/dpote/historico/${historicoId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`Buscar histórico falhou: ${resp.status}`);
  return resp.json();
}

function calcularValorPorFilial(historico, dpoteFilialNome) {
  const { valor_ganho_assinaturas } = historico.faturamento;
  const nomeBusca = dpoteFilialNome.trim().toLowerCase();

  let totalFichas = 0;
  let fichasFilial = 0;

  for (const f of historico.filiais_servicos) {
    const fichas = f.servicos.reduce((acc, s) => acc + (s.fichas || 0), 0);
    totalFichas += fichas;
    if (f.filial.fil_bairro && f.filial.fil_bairro.toLowerCase().includes(nomeBusca)) {
      fichasFilial = fichas;
    }
  }

  if (totalFichas === 0 || fichasFilial === 0) return 0;
  return Math.round(valor_ganho_assinaturas * (fichasFilial / totalFichas));
}

async function main() {
  const conn = await mysql2.createConnection(DATABASE_URL);
  const [configs] = await conn.execute(
    'SELECT empresaSlug, cbEmail, cbSenha, dpoteHistoricoId, dpoteFilialNome FROM cashbarberConfig WHERE ativo=1 AND dpoteHistoricoId IS NOT NULL AND dpoteFilialNome IS NOT NULL'
  );

  if (configs.length === 0) {
    console.log('Nenhuma config com Dpote configurado encontrada.');
    await conn.end();
    return;
  }

  // Login uma vez (mesmas credenciais para todas as filiais)
  const { cbEmail, cbSenha, dpoteHistoricoId } = configs[0];
  const token = await cashbarberLogin(cbEmail, cbSenha);
  console.log('Login OK');

  const historico = await buscarHistorico(token, dpoteHistoricoId);
  const { valor_ganho_assinaturas } = historico.faturamento;
  const totalFichas = historico.filiais_servicos.reduce(
    (acc, f) => acc + f.servicos.reduce((a, s) => a + (s.fichas || 0), 0), 0
  );
  console.log(`\nTotal assinaturas: R$ ${valor_ganho_assinaturas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Total fichas: ${totalFichas}`);

  for (const config of configs) {
    const valor = calcularValorPorFilial(historico, config.dpoteFilialNome);
    console.log(`\n${config.empresaSlug} (filial: "${config.dpoteFilialNome}"): R$ ${valor.toLocaleString('pt-BR')}`);
    
    await conn.execute(
      'UPDATE cashbarberConfig SET recorrenciaValorCashbarber = ? WHERE empresaSlug = ?',
      [valor, config.empresaSlug]
    );
    console.log(`  → Salvo no banco: recorrenciaValorCashbarber = ${valor}`);
  }

  await conn.end();
  console.log('\nConcluído!');
}

main().catch(console.error);
