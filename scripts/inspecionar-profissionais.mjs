/**
 * Script de inspeção: dados de profissionais/colaboradores no CashBarber
 * Usa o mesmo mecanismo de autenticação via cookie httpOnly
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [configs] = await conn.execute(
  `SELECT empresaSlug, cbEmail, cbSenha, cbFilialId, dpoteFilialNome FROM cashbarberConfig WHERE ativo = 1 LIMIT 1`
);
await conn.end();

if (!configs.length) { console.error("Sem config"); process.exit(1); }
const config = configs[0];
console.log(`Empresa: ${config.empresaSlug} | filial: ${config.dpoteFilialNome} | filialId: ${config.cbFilialId}\n`);

// Login via cookie httpOnly (igual ao servidor)
const loginResp = await fetch("https://api.cashbarber.com.br/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: config.cbEmail, password: config.cbSenha, ctx: "painel" }),
});

let token;
if (loginResp.status === 409) {
  const setCookie409 = loginResp.headers.get("set-cookie") || "";
  const m409 = setCookie409.match(/access_token_painel=([^;]+)/);
  if (m409) token = m409[1];
  else {
    // forçar logout e re-login
    await fetch("https://api.cashbarber.com.br/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.cbEmail, ctx: "painel" }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    const resp2 = await fetch("https://api.cashbarber.com.br/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.cbEmail, password: config.cbSenha, ctx: "painel" }),
    });
    const sc2 = resp2.headers.get("set-cookie") || "";
    const m2 = sc2.match(/access_token_painel=([^;]+)/);
    token = m2?.[1];
  }
} else {
  const setCookie = loginResp.headers.get("set-cookie") || "";
  const m = setCookie.match(/access_token_painel=([^;]+)/);
  token = m?.[1];
}

if (!token) { console.error("Token não encontrado"); process.exit(1); }
console.log("Login OK.\n");

const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// Data atual no Brasil (UTC-3)
const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
const dataInicio = `${mesStr}-01`;
const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;
const filialId = config.cbFilialId;

console.log(`Período: ${dataInicio} a ${dataFim} | filialId: ${filialId}\n`);

// Helper para buscar com tratamento de HTML
async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  if (text.trim().startsWith('<')) return { _status: r.status, _html: true, _preview: text.slice(0, 100) };
  try { return { _status: r.status, ...JSON.parse(text) }; } catch { return { _status: r.status, _raw: text.slice(0, 200) }; }
}

// 1. Listar profissionais (testar vários endpoints)
console.log("=== 1. Listar profissionais ===");
const profEndpoints = [
  { url: "/api/painel/profissionais/simpleList", body: filialId ? { filial: filialId } : {} },
  { url: "/api/painel/profissionais/list", body: filialId ? { filial: filialId } : {} },
  { url: "/api/painel/colaboradores/simpleList", body: {} },
  { url: "/api/painel/barbeiros/simpleList", body: {} },
  { url: "/api/painel/employees/list", body: {} },
];
let profData = [];
for (const { url, body } of profEndpoints) {
  const d = await fetchJSON(`https://api.cashbarber.com.br${url}`, { method: "POST", headers, body: JSON.stringify(body) });
  console.log(`${url} → ${d._status}: ${JSON.stringify(d).slice(0, 200)}`);
  if (d._status === 200 && !d._html && (Array.isArray(d) || Array.isArray(d.data))) {
    profData = Array.isArray(d) ? d : d.data;
    console.log(`  ✓ Encontrado! ${profData.length} profissionais`);
    break;
  }
}
console.log();

// 2. Relatório 15 com profissional
console.log("=== 2. Relatório 15 com filtro de profissional ===");
const rel15Resp = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/15", {
  method: "POST",
  headers,
  body: JSON.stringify({
    data_inicial: dataInicio,
    data_final: dataFim,
    ...(filialId ? { filial: filialId } : {}),
  }),
});
const rel15Data = await rel15Resp.json();
console.log(`Status: ${rel15Resp.status}`);
// Mostrar estrutura completa para ver se tem campo de profissional
const keys = Object.keys(rel15Data);
console.log("Chaves na resposta:", keys);
if (rel15Data.servicos?.length > 0) {
  console.log("Primeiro serviço:", JSON.stringify(rel15Data.servicos[0]));
}
console.log();

// 3. Relatório por profissional (relatório 4 ou similar)
console.log("=== 3. Outros relatórios por profissional ===");
const relEndpoints = [
  { url: "/api/painel/relatorios/4", body: { data_inicial: dataInicio, data_final: dataFim, ...(filialId ? { filial: filialId } : {}) } },
  { url: "/api/painel/relatorios/profissional", body: { data_inicial: dataInicio, data_final: dataFim } },
  { url: "/api/painel/relatorios/ranking", body: { data_inicial: dataInicio, data_final: dataFim } },
  { url: "/api/painel/relatorios/comissoes", body: { data_inicial: dataInicio, data_final: dataFim } },
];
for (const { url, body } of relEndpoints) {
  try {
    const r = await fetch(`https://api.cashbarber.com.br${url}`, {
      method: "POST", headers, body: JSON.stringify(body),
    });
    const d = await r.json();
    console.log(`${r.ok ? "✓" : "✗"} ${url} → ${r.status}`);
    if (r.ok) console.log("  ", JSON.stringify(d).slice(0, 400));
    console.log();
  } catch (e) { console.log(`✗ ${url} → ${e.message}\n`); }
}

// 4. Verificar se relatório 15 tem campo de profissional quando passado
console.log("=== 4. Relatório 15 com profissional específico (se existir) ===");
const profissionais = Array.isArray(profData) ? profData : profData?.data ?? [];
if (profissionais.length > 0) {
  const primProf = profissionais[0];
  console.log("Profissional 0:", JSON.stringify(primProf));
  const profId = primProf.id ?? primProf.pro_id ?? primProf.prf_id;
  if (profId) {
    const r = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/15", {
      method: "POST", headers,
      body: JSON.stringify({
        data_inicial: dataInicio, data_final: dataFim,
        ...(filialId ? { filial: filialId } : {}),
        profissional: profId,
      }),
    });
    const d = await r.json();
    console.log(`Relatório 15 com profissional ${profId} → ${r.status}`);
    console.log(JSON.stringify(d).slice(0, 500));
  }
}
