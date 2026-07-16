/**
 * Script para buscar a profissional Wal no CashBarber e cadastrá-la no sistema
 */

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";

async function cashbarberLogin(email, senha) {
  const resp = await fetch("https://api.cashbarber.com.br/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha, ctx: "painel" }),
  });
  
  // Extrair token do cookie
  const setCookie = resp.headers.get("set-cookie") || "";
  const tokenMatch = setCookie.match(/access_token_painel=([^;]+)/);
  if (tokenMatch) return tokenMatch[1];
  
  if (!resp.ok && resp.status !== 409) {
    console.error("Login falhou:", resp.status, await resp.text());
    return null;
  }
  
  // Tentar do body
  try {
    const data = await resp.json();
    return data.token || data.access_token || null;
  } catch {
    return null;
  }
}

async function listarBarbeiros(token) {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/usuarios/simpleListBarbeirosAtivos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    console.error("Listar barbeiros falhou:", resp.status);
    return null;
  }
  return await resp.json();
}

async function buscarFoto(token, profissionalId) {
  try {
    const resp = await fetch(`https://api.cashbarber.com.br/api/painel/usuarios/${profissionalId}/foto`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.url || data.foto || data.fotoUrl || null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Fazendo login no CashBarber...");
  const token = await cashbarberLogin(CB_EMAIL, CB_SENHA);
  if (!token) {
    console.error("Falha no login");
    process.exit(1);
  }
  console.log("Login OK. Token:", typeof token === 'string' ? token.substring(0, 20) + '...' : JSON.stringify(token).substring(0, 50));

  console.log("\nBuscando lista de profissionais...");
  const barbeiros = await listarBarbeiros(typeof token === 'string' ? token : token.token || token.access_token);
  if (!barbeiros) {
    console.error("Falha ao listar barbeiros");
    process.exit(1);
  }

  console.log(`\nTotal de profissionais: ${barbeiros.length}`);
  
  // Procurar Wal
  const wal = barbeiros.filter(b => 
    b.usu_name && (
      b.usu_name.toLowerCase().includes('wal') ||
      b.usu_name.toLowerCase().includes('wal')
    )
  );
  
  if (wal.length > 0) {
    console.log("\n=== ENCONTRADA(S) ===");
    wal.forEach(w => console.log(JSON.stringify(w, null, 2)));
  } else {
    console.log("\nNão encontrou 'Wal'. Listando todos para referência:");
    barbeiros.forEach(b => console.log(`  ID: ${b.id} | Nome: ${b.usu_name} | Filial: ${b.usu_id_filial}`));
  }
}

main().catch(console.error);
