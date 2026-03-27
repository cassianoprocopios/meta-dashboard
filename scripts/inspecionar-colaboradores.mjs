/**
 * Script de inspeção: dados de colaboradores/barbeiros disponíveis no CashBarber
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Buscar credenciais do CashBarber
const [configs] = await conn.execute(
  `SELECT empresaSlug, cbEmail, cbSenha, cbFilialId, dpoteFilialNome FROM cashbarberConfig WHERE ativo = 1 LIMIT 1`
);
await conn.end();

if (!configs.length) {
  console.error("Nenhuma config CashBarber encontrada");
  process.exit(1);
}

const config = configs[0];
console.log(`Usando empresa: ${config.empresaSlug} | filial: ${config.dpoteFilialNome}`);

// Login
const loginResp = await fetch("https://api.cashbarber.com.br/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: config.cbEmail, password: config.cbSenha }),
});
const loginData = await loginResp.json();
const token = loginData?.data?.token ?? loginData?.token ?? loginData?.access_token;
if (!token) {
  console.error("Login falhou:", JSON.stringify(loginData));
  process.exit(1);
}
console.log("Login OK. Token obtido.\n");

// Testar endpoint de colaboradores/profissionais
const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
const dataInicio = `${mesStr}-01`;
const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;

console.log(`=== Testando endpoints de colaboradores (${dataInicio} a ${dataFim}) ===\n`);

// 1. Listar profissionais
const endpoints = [
  `/v1/professionals`,
  `/v1/professionals?page=1&per_page=50`,
  `/v1/employees`,
  `/v1/barbers`,
  `/v1/users`,
];

for (const ep of endpoints) {
  try {
    const resp = await fetch(`https://api.cashbarber.com.br${ep}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (resp.ok && data) {
      console.log(`✓ ${ep} → status ${resp.status}`);
      const items = Array.isArray(data) ? data : data.data ?? data.professionals ?? data.employees ?? [];
      if (items.length > 0) {
        console.log(`  ${items.length} item(s). Primeiro:`, JSON.stringify(items[0]).slice(0, 200));
      } else {
        console.log(`  Resposta:`, JSON.stringify(data).slice(0, 300));
      }
    } else {
      console.log(`✗ ${ep} → status ${resp.status}: ${JSON.stringify(data).slice(0, 150)}`);
    }
  } catch (e) {
    console.log(`✗ ${ep} → erro: ${e.message}`);
  }
  console.log();
}

// 2. Testar relatório 15 com agrupamento por profissional
console.log("=== Testando relatório 15 com agrupamento por profissional ===\n");
try {
  const filialId = config.cbFilialId;
  const url = filialId
    ? `https://api.cashbarber.com.br/v1/reports/15?start_date=${dataInicio}&end_date=${dataFim}&branch_id=${filialId}&group_by=professional`
    : `https://api.cashbarber.com.br/v1/reports/15?start_date=${dataInicio}&end_date=${dataFim}&group_by=professional`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  console.log(`Relatório 15 group_by=professional → status ${resp.status}`);
  console.log(JSON.stringify(data).slice(0, 500));
} catch (e) {
  console.log("Erro:", e.message);
}

console.log("\n=== Testando relatório de ranking/performance ===\n");
const rankingEndpoints = [
  `/v1/reports/ranking?start_date=${dataInicio}&end_date=${dataFim}`,
  `/v1/reports/performance?start_date=${dataInicio}&end_date=${dataFim}`,
  `/v1/reports/professionals?start_date=${dataInicio}&end_date=${dataFim}`,
  `/v1/professionals/ranking?start_date=${dataInicio}&end_date=${dataFim}`,
];
for (const ep of rankingEndpoints) {
  try {
    const resp = await fetch(`https://api.cashbarber.com.br${ep}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    console.log(`${resp.ok ? "✓" : "✗"} ${ep} → status ${resp.status}`);
    if (resp.ok) console.log(`  ${JSON.stringify(data).slice(0, 300)}`);
    console.log();
  } catch (e) {
    console.log(`✗ ${ep} → ${e.message}\n`);
  }
}
