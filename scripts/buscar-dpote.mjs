/**
 * Script de diagnóstico: explora os endpoints Dpote do CashBarber
 * para descobrir como processar o histórico e obter os valores por filial.
 */

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_BASE = "https://api.cashbarber.com.br";

async function login(email, senha) {
  const resp = await fetch(`${CB_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha, ctx: "painel" }),
  });
  if (resp.status === 409) {
    const sc = resp.headers.get("set-cookie") ?? "";
    const m = sc.match(/access_token_painel=([^;]+)/);
    if (m) return m[1];
    await fetch(`${CB_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ctx: "painel" }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    const r2 = await fetch(`${CB_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, ctx: "painel" }),
    });
    const sc2 = r2.headers.get("set-cookie") ?? "";
    const m2 = sc2.match(/access_token_painel=([^;]+)/);
    if (!m2) throw new Error("Token não encontrado após re-login");
    return m2[1];
  }
  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const sc = resp.headers.get("set-cookie") ?? "";
  const m = sc.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error("Token não encontrado");
  return m[1];
}

async function apiGet(token, path) {
  const resp = await fetch(`${CB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  console.log(`GET ${path} → ${resp.status}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function apiPost(token, path, body = {}) {
  const resp = await fetch(`${CB_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  console.log(`POST ${path} → ${resp.status}: ${text.substring(0, 200)}`);
  try { return { status: resp.status, data: JSON.parse(text) }; } catch { return { status: resp.status, data: text }; }
}

async function main() {
  console.log("🔐 Login...");
  const token = await login(CB_EMAIL, CB_SENHA);
  console.log("✅ OK\n");

  // Listar históricos existentes
  console.log("📋 Listando históricos Dpote existentes...");
  const lista = await apiGet(token, "/api/painel/dpote/historico");
  console.log("Lista:", JSON.stringify(lista).substring(0, 500));
  console.log("");

  // Tentar buscar histórico mais recente
  const historicoId = 68324; // último criado
  console.log(`\n📥 Buscando histórico ID ${historicoId}...`);
  const hist = await apiGet(token, `/api/painel/dpote/historico/${historicoId}`);
  console.log("Histórico:", JSON.stringify(hist).substring(0, 500));

  // Tentar endpoints de processamento
  console.log("\n🔄 Tentando processar histórico (step 1 - calcular)...");
  await apiPost(token, `/api/painel/dpote/historico/${historicoId}/calcular`);

  console.log("\n🔄 Tentando step 2 - processar...");
  await apiPost(token, `/api/painel/dpote/historico/${historicoId}/processar`);

  console.log("\n🔄 Tentando step 3 - confirmar...");
  await apiPost(token, `/api/painel/dpote/historico/${historicoId}/confirmar`);

  console.log("\n🔄 Tentando step - gerar...");
  await apiPost(token, `/api/painel/dpote/historico/${historicoId}/gerar`);

  console.log("\n🔄 Tentando step - finalizar...");
  await apiPost(token, `/api/painel/dpote/historico/${historicoId}/finalizar`);

  // Buscar novamente após tentativas
  console.log(`\n📥 Buscando histórico ID ${historicoId} após processamento...`);
  const hist2 = await apiGet(token, `/api/painel/dpote/historico/${historicoId}`);
  console.log("faturamento:", JSON.stringify(hist2.faturamento));
  console.log("filiais_servicos count:", hist2.filiais_servicos?.length ?? 0);
  if (hist2.filiais_servicos?.length > 0) {
    for (const f of hist2.filiais_servicos) {
      const fichas = f.servicos?.reduce((a, s) => a + (s.fichas || 0), 0) ?? 0;
      console.log(`  - ${f.filial?.fil_bairro}: ${fichas} fichas`);
    }
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
