/**
 * Script: processar histórico Dpote via API com endpoints de continuar/enviar
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

async function call(token, method, path, body) {
  const resp = await fetch(`${CB_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.substring(0, 300); }
  return { status: resp.status, body: parsed };
}

async function main() {
  console.log("🔐 Login...");
  const token = await login();
  console.log("✅ Token OK\n");

  const mes = new Date().getMonth() + 1;
  const ano = new Date().getFullYear();

  // Criar histórico
  console.log("📋 Criando histórico...");
  const createResp = await call(token, "POST", "/api/painel/dpote/historico", { mes, ano });
  console.log("Criar:", JSON.stringify(createResp));
  const hId = typeof createResp.body === "number" ? createResp.body : createResp.body?.id;
  if (!hId) throw new Error("Não foi possível criar histórico");
  console.log("✅ Histórico ID:", hId);

  // Verificar estado inicial
  const inicial = await call(token, "GET", `/api/painel/dpote/historico/${hId}`, null);
  console.log("\n📊 Estado inicial:", JSON.stringify(inicial.body?.faturamento));

  // Tentar endpoints de processamento com o ID
  const processEndpoints = [
    ["POST", `/api/painel/dpote/historico/${hId}/processar`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/calcular`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/continuar`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/step1`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/step2`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/step3`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/enviar`, {}],
    ["POST", `/api/painel/dpote/historico/${hId}/finalizar`, {}],
    ["PUT", `/api/painel/dpote/historico/${hId}`, { status: "processado" }],
    ["PUT", `/api/painel/dpote/historico/${hId}`, { mes, ano, processar: true }],
    ["PATCH", `/api/painel/dpote/historico/${hId}`, { status: "processado" }],
    // Sem ID
    ["POST", "/api/painel/dpote/historico/processar", { id: hId }],
    ["POST", "/api/painel/dpote/historico/continuar", { id: hId }],
    ["POST", "/api/painel/dpote/historico/enviar", { id: hId }],
    ["POST", "/api/painel/dpote/historico/calcular", { id: hId, mes, ano }],
  ];

  for (const [method, path, body] of processEndpoints) {
    const r = await call(token, method, path, body);
    if (r.status !== 404 && r.status !== 405) {
      console.log(`\n${method} ${path} → ${r.status}`);
      console.log("  Body:", JSON.stringify(r.body).substring(0, 200));
    } else {
      process.stdout.write(".");
    }
    await sleep(200);
  }
  console.log("\n");

  // Verificar estado após tentativas
  await sleep(2000);
  const final = await call(token, "GET", `/api/painel/dpote/historico/${hId}`, null);
  console.log("\n📊 Estado final:", JSON.stringify(final.body?.faturamento));
  if (final.body?.filiais_servicos?.length > 0) {
    console.log("Filiais:", final.body.filiais_servicos.map(f => ({
      nome: f.filial?.fil_bairro,
      fichas: f.servicos?.reduce((a, s) => a + (s.fichas || 0), 0)
    })));
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
