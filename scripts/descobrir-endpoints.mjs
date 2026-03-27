/**
 * Script de descoberta: testar vários endpoints do CashBarber para encontrar dados por profissional
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [configs] = await conn.execute(
  `SELECT cbEmail, cbSenha, cbFilialId FROM cashbarberConfig WHERE ativo = 1 LIMIT 1`
);
await conn.end();
const config = configs[0];

// Login
const loginResp = await fetch("https://api.cashbarber.com.br/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: config.cbEmail, password: config.cbSenha, ctx: "painel" }),
});
let token;
if (loginResp.status === 409) {
  const sc = loginResp.headers.get("set-cookie") || "";
  token = sc.match(/access_token_painel=([^;]+)/)?.[1];
  if (!token) {
    await fetch("https://api.cashbarber.com.br/api/auth/logout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.cbEmail, ctx: "painel" }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const r2 = await fetch("https://api.cashbarber.com.br/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.cbEmail, password: config.cbSenha, ctx: "painel" }),
    });
    token = (r2.headers.get("set-cookie") || "").match(/access_token_painel=([^;]+)/)?.[1];
  }
} else {
  token = (loginResp.headers.get("set-cookie") || "").match(/access_token_painel=([^;]+)/)?.[1];
}
if (!token) { console.error("Token não encontrado"); process.exit(1); }
console.log("Login OK.\n");

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
const dataInicio = `${mesStr}-01`;
const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;
const filialId = config.cbFilialId;

async function post(path, body) {
  const r = await fetch(`https://api.cashbarber.com.br${path}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const text = await r.text();
  if (text.trim().startsWith('<')) return { ok: false, status: r.status, html: true };
  try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
  catch { return { ok: false, status: r.status, raw: text.slice(0, 100) }; }
}

// Testar relatórios numerados (1-30)
console.log("=== Relatórios numerados ===");
for (let i = 1; i <= 30; i++) {
  const r = await post(`/api/painel/relatorios/${i}`, {
    data_inicial: dataInicio, data_final: dataFim,
    ...(filialId ? { filial: filialId } : {}),
  });
  if (r.ok) {
    const keys = Object.keys(r.data);
    const hasProfissional = JSON.stringify(r.data).toLowerCase().includes("profissional") ||
      JSON.stringify(r.data).toLowerCase().includes("barbeiro") ||
      JSON.stringify(r.data).toLowerCase().includes("colaborador") ||
      JSON.stringify(r.data).toLowerCase().includes("funcionario");
    console.log(`✓ Relatório ${i} → keys: [${keys.join(", ")}]${hasProfissional ? " *** TEM PROFISSIONAL ***" : ""}`);
    if (hasProfissional) {
      console.log("  DADOS:", JSON.stringify(r.data).slice(0, 600));
    }
  } else if (!r.html) {
    console.log(`✗ Relatório ${i} → ${r.status}: ${r.raw ?? JSON.stringify(r.data ?? "").slice(0, 80)}`);
  }
}

// Testar endpoints de comissão
console.log("\n=== Comissões / Profissionais ===");
const extras = [
  "/api/painel/comissoes/list",
  "/api/painel/comissoes/relatorio",
  "/api/painel/relatorios/comissao",
  "/api/painel/relatorios/comissoes",
  "/api/painel/relatorios/profissionais",
  "/api/painel/relatorios/atendimentos",
  "/api/painel/atendimentos/list",
  "/api/painel/agenda/list",
  "/api/painel/profissionais/ranking",
  "/api/painel/profissionais/faturamento",
];
for (const path of extras) {
  const r = await post(path, { data_inicial: dataInicio, data_final: dataFim, ...(filialId ? { filial: filialId } : {}) });
  if (r.ok) {
    console.log(`✓ ${path} → ${JSON.stringify(r.data).slice(0, 300)}`);
  } else if (!r.html) {
    console.log(`✗ ${path} → ${r.status}: ${r.raw ?? JSON.stringify(r.data ?? "").slice(0, 80)}`);
  } else {
    console.log(`✗ ${path} → 404 HTML`);
  }
}
