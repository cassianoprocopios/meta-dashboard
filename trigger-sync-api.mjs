import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function triggerSyncViaAPI() {
  const baseUrl = 'http://localhost:5173'; // Dev server
  
  console.log(`\n🔄 Disparando sincronização via API`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  try {
    // Sincronizar MASCOTE
    console.log(`\n📡 Sincronizando MASCOTE (abril 2026)...`);
    const respMascote = await fetch(`${baseUrl}/api/trpc/cashbarber.sincronizar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          empresaSlug: 'MASCOTE',
          mes: 4,
          ano: 2026,
        },
      }),
      credentials: 'include',
    });
    
    if (respMascote.ok) {
      const dataMascote = await respMascote.json();
      console.log(`✅ MASCOTE sincronizado:`, dataMascote);
    } else {
      console.error(`❌ Erro ao sincronizar MASCOTE:`, respMascote.status, respMascote.statusText);
    }
    
    // Sincronizar MORUMBI
    console.log(`\n📡 Sincronizando MORUMBI (abril 2026)...`);
    const respMorumbi = await fetch(`${baseUrl}/api/trpc/cashbarber.sincronizar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          empresaSlug: 'MORUMBI',
          mes: 4,
          ano: 2026,
        },
      }),
      credentials: 'include',
    });
    
    if (respMorumbi.ok) {
      const dataMorumbi = await respMorumbi.json();
      console.log(`✅ MORUMBI sincronizado:`, dataMorumbi);
    } else {
      console.error(`❌ Erro ao sincronizar MORUMBI:`, respMorumbi.status, respMorumbi.statusText);
    }
    
  } catch (err) {
    console.error(`❌ Erro:`, err.message);
  }
}

triggerSyncViaAPI();
