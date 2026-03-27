/**
 * Inspecionar o Relatório 13 do CashBarber (dados por barbeiro)
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [configs] = await conn.execute(
  `SELECT cbEmail, cbSenha, cbFilialId, dpoteFilialNome FROM cashbarberConfig WHERE ativo = 1 LIMIT 2`
);
await conn.end();

for (const config of configs) {
  console.log(`\n====== EMPRESA: ${config.dpoteFilialNome} (filialId: ${config.cbFilialId}) ======`);

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
  if (!token) { console.error("Token não encontrado"); continue; }

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const mesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const dataInicio = `${mesStr}-01`;
  const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;
  const filialId = config.cbFilialId;

  // Buscar relatório 13 (comissões por barbeiro)
  const body = { data_inicial: dataInicio, data_final: dataFim, ...(filialId ? { filial: filialId } : {}) };
  const r = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/13", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data = await r.json();

  console.log(`Relatório 13 → ${r.status} | ${Array.isArray(data) ? data.length : "?"} barbeiros`);

  if (Array.isArray(data)) {
    for (const barbeiro of data.slice(0, 3)) {
      console.log("\n--- Barbeiro:", barbeiro.barbeiro ?? barbeiro.nome ?? JSON.stringify(Object.keys(barbeiro)));
      console.log("Chaves:", Object.keys(barbeiro).join(", "));
      // Mostrar campos de faturamento
      const campos = ["barbeiro", "nome", "id", "total", "total_servicos", "total_produtos",
        "faturamento", "valor_total", "comissao", "atendimentos", "servicos_comissoes", "produtos_comissoes"];
      for (const campo of campos) {
        if (barbeiro[campo] !== undefined) {
          const val = typeof barbeiro[campo] === "object"
            ? JSON.stringify(barbeiro[campo]).slice(0, 200)
            : barbeiro[campo];
          console.log(`  ${campo}: ${val}`);
        }
      }
    }

    // Verificar se há campo de faturamento total por barbeiro
    console.log("\n=== Estrutura completa do 1º barbeiro ===");
    console.log(JSON.stringify(data[0], null, 2).slice(0, 1500));
  }

  // Também testar relatório 12 (outro que retornou OK)
  const r12 = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/12", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data12 = await r12.json();
  console.log(`\nRelatório 12 → ${r12.status}`);
  console.log("Estrutura:", JSON.stringify(data12).slice(0, 600));
}
