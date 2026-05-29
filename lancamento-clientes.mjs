import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc/lancamentoClientesManual.lancarClientesMes';

async function lancarClientes() {
  try {
    console.log('🚀 Lançando dados de clientes para maio/2026...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          mes: 5,
          ano: 2026,
          morumbi: 877,
          mascote: 380,
          seraphine: 0
        }
      })
    });
    
    const data = await response.json();
    
    console.log('✅ Resposta da API:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

lancarClientes();
