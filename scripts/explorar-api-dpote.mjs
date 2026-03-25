/**
 * Script: explorar endpoints de assinaturas/dpote disponíveis na API CashBarber
 */

const CB_EMAIL = "barbierobarbearia@gmail.com";
const CB_SENHA = "2@Barbiero";
const CB_API = "https://api.cashbarber.com.br";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login() {
  let resp = await fetch(`${CB_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
  });

  if (resp.status === 409) {
    await fetch(`${CB_API}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, ctx: "painel" }),
    }).catch(() => {});
    await sleep(1000);
    resp = await fetch(`${CB_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CB_EMAIL, password: CB_SENHA, ctx: "painel" }),
    });
  }

  const setCookieHeader = resp.headers.get("set-cookie") || "";
  const tokenMatch = setCookieHeader.match(/access_token_painel=([^;]+)/);
  if (!tokenMatch) throw new Error("Token não encontrado");
  return tokenMatch[1];
}

async function get(token, path) {
  const resp = await fetch(`${CB_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  try { return { status: resp.status, body: JSON.parse(text) }; }
  catch { return { status: resp.status, body: text.substring(0, 200) }; }
}

async function post(token, path, body) {
  const resp = await fetch(`${CB_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  try { return { status: resp.status, body: JSON.parse(text) }; }
  catch { return { status: resp.status, body: text.substring(0, 200) }; }
}

async function main() {
  console.log("🔐 Login...");
  const token = await login();
  console.log("✅ Token OK\n");

  const mes = new Date().getMonth() + 1;
  const ano = new Date().getFullYear();
  const mesStr = String(mes).padStart(2, "0");

  // Explorar endpoints de assinaturas
  const endpoints = [
    // Assinaturas diretas
    `/api/painel/assinaturas`,
    `/api/painel/assinaturas/list`,
    `/api/painel/assinaturas/contratos`,
    `/api/painel/assinaturas/contratos/ativos`,
    `/api/painel/assinaturas/relatorio`,
    `/api/painel/assinaturas/relatorio/mes`,
    `/api/painel/assinaturas/relatorio/${ano}/${mes}`,
    `/api/painel/assinaturas/relatorio/${ano}-${mesStr}`,
    `/api/painel/assinaturas/faturamento`,
    `/api/painel/assinaturas/faturamento/${ano}/${mes}`,
    `/api/painel/assinaturas/comissao`,
    `/api/painel/assinaturas/comissao/${ano}/${mes}`,
    // Dpote específico
    `/api/painel/dpote`,
    `/api/painel/dpote/relatorio`,
    `/api/painel/dpote/relatorio/${ano}/${mes}`,
    `/api/painel/dpote/relatorio/${ano}-${mesStr}`,
    `/api/painel/dpote/faturamento`,
    `/api/painel/dpote/faturamento/${ano}/${mes}`,
    `/api/painel/dpote/comissao`,
    `/api/painel/dpote/comissao/${ano}/${mes}`,
    `/api/painel/dpote/painel`,
    `/api/painel/dpote/painel/${ano}/${mes}`,
    // Histórico com parâmetros
    `/api/painel/dpote/historico?mes=${mes}&ano=${ano}`,
    `/api/painel/dpote/historico/list?mes=${mes}&ano=${ano}`,
  ];

  for (const ep of endpoints) {
    const r = await get(token, ep);
    if (r.status !== 404 && r.status !== 401) {
      console.log(`✅ GET ${ep} → ${r.status}`);
      if (typeof r.body === "object" && r.body !== null) {
        const keys = Object.keys(r.body);
        console.log(`   Keys: ${keys.slice(0, 10).join(", ")}`);
        // Se tiver valor_ganho_assinaturas, mostrar
        if (r.body.valor_ganho_assinaturas !== undefined) {
          console.log(`   valor_ganho_assinaturas: ${r.body.valor_ganho_assinaturas}`);
        }
        if (Array.isArray(r.body) && r.body.length > 0) {
          console.log(`   Array[${r.body.length}]: primeiro item keys: ${Object.keys(r.body[0]).join(", ")}`);
        }
      } else {
        console.log(`   Body: ${String(r.body).substring(0, 100)}`);
      }
    } else {
      process.stdout.write(".");
    }
  }
  console.log("\n");

  // Tentar POST no dpote/relatorio com parâmetros de mês
  console.log("\n📤 Tentando POST em endpoints dpote...");
  const postEndpoints = [
    ["/api/painel/dpote/relatorio", { mes, ano }],
    ["/api/painel/dpote/relatorio", { mes: mesStr, ano: String(ano) }],
    ["/api/painel/dpote/faturamento", { mes, ano }],
    ["/api/painel/dpote/comissao", { mes, ano }],
    ["/api/painel/dpote/historico/processar", { mes, ano }],
    ["/api/painel/dpote/historico/calcular", { mes, ano }],
    ["/api/painel/dpote/historico/continuar", { mes, ano }],
    ["/api/painel/dpote/historico/enviar", { mes, ano }],
  ];

  for (const [ep, body] of postEndpoints) {
    const r = await post(token, ep, body);
    if (r.status !== 404 && r.status !== 401) {
      console.log(`✅ POST ${ep} → ${r.status}: ${JSON.stringify(r.body).substring(0, 150)}`);
    } else {
      process.stdout.write(".");
    }
  }
  console.log("\n");

  // Verificar o endpoint de painel (que o browser acessa)
  console.log("\n🔍 Verificando endpoint painel Dpote...");
  const painelResp = await get(token, "/api/painel/dpote/painel");
  console.log("Painel:", JSON.stringify(painelResp).substring(0, 300));
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
