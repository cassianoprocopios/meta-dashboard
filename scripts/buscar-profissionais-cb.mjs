// Script para buscar IDs dos profissionais da Mascote no CashBarber
const BASE = 'https://api.cashbarber.com.br/api';

async function login() {
  const resp = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'barbierobarbearia@gmail.com', password: '2@Barbiero', ctx: 'painel' })
  });
  const data = await resp.json();
  // Token está no cookie httpOnly da resposta
  const setCookie = resp.headers.get('set-cookie') || '';
  const tokenMatch = setCookie.match(/access_token_painel=([^;]+)/);
  if (!tokenMatch) {
    console.log('Resposta do login:', JSON.stringify(data, null, 2));
    console.log('Set-Cookie:', setCookie);
    throw new Error('Token não encontrado no cookie');
  }
  return tokenMatch[1];
}

async function listarProfissionais(token) {
  // Tentar endpoints comuns
  const endpoints = [
    '/painel/profissionais/simpleList',
    '/painel/profissionais',
    '/painel/colaboradores/simpleList',
    '/painel/colaboradores',
    '/painel/barbers/simpleList',
    '/painel/barbers',
    '/painel/users/simpleList',
  ];
  
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${BASE}${ep}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cookie': `access_token_painel=${token}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        console.log(`✅ Endpoint ${ep} retornou:`, JSON.stringify(data).substring(0, 200));
        return { endpoint: ep, data };
      } else {
        console.log(`❌ ${ep} → ${resp.status}`);
      }
    } catch (e) {
      console.log(`❌ ${ep} → erro: ${e.message}`);
    }
  }
  return null;
}

async function main() {
  console.log('Fazendo login no CashBarber...');
  const token = await login();
  console.log('Token obtido:', token.substring(0, 40) + '...\n');
  
  console.log('Buscando profissionais...');
  const result = await listarProfissionais(token);
  
  if (result) {
    console.log('\n=== DADOS COMPLETOS ===');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

main().catch(console.error);
