import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Excluir do ranking: Corte de Cabelo, Barba e Corte Kids
// Todos os demais serviços + produtos são contabilizados
const CATEGORIAS_EXCLUIDAS = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba)/i;
const CB_BASE = "https://api.cashbarber.com.br";

async function cashbarberLogin(email, senha) {
  const res = await fetch(`${CB_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha, ctx: "painel" }),
  });

  // 409 = sessão já ativa — extrair token do cookie ou forçar logout e re-login
  if (res.status === 409) {
    const setCookie409 = res.headers.get("set-cookie") ?? "";
    const match409 = setCookie409.match(/access_token_painel=([^;]+)/);
    if (match409) return match409[1];
    // Forçar logout
    await fetch(`${CB_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ctx: "painel" }),
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    const res2 = await fetch(`${CB_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, ctx: "painel" }),
    });
    if (!res2.ok) throw new Error(`Re-login falhou: ${res2.status}`);
    const setCookie2 = res2.headers.get("set-cookie") ?? "";
    const match2 = setCookie2.match(/access_token_painel=([^;]+)/);
    if (!match2) throw new Error("Token não encontrado após re-login");
    return match2[1];
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Login CashBarber falhou: ${res.status} — ${txt.slice(0, 200)}`);
  }

  // Token vem no cookie httpOnly
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/access_token_painel=([^;]+)/);
  if (!match) throw new Error("Token não encontrado na resposta de login");
  return match[1];
}

async function cashbarberRelatorio15(token, dataInicial, dataFinal, barbeiroId) {
  const body = { data_inicial: dataInicial, data_final: dataFinal };
  if (barbeiroId) body.barbeiro = barbeiroId;
  const res = await fetch(`${CB_BASE}/api/painel/relatorios/15`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Relatório 15 falhou: ${res.status} — ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  console.log(`\n🔄 Recalculando ranking — ${meses[mes - 1]}/${ano}`);
  console.log("─".repeat(60));

  // Buscar configuração do CashBarber
  const [configs] = await conn.query(
    "SELECT cbEmail, cbSenha, empresaSlug FROM cashbarberConfig WHERE tenantId = 1 LIMIT 1"
  );
  if (!configs.length || !configs[0].cbEmail) {
    console.error("❌ Configuração do CashBarber não encontrada.");
    await conn.end();
    return;
  }

  // Buscar profissionais com ID do CashBarber
  const [colaboradores] = await conn.query(
    "SELECT id, nome, apelido, cashbarberProfissionalId, empresaSlug FROM colaboradores WHERE tenantId = 1 AND cashbarberProfissionalId IS NOT NULL AND ativo = 1"
  );
  console.log(`👥 ${colaboradores.length} profissional(is) com ID CashBarber encontrado(s)`);

  if (!colaboradores.length) {
    console.log("⚠️  Nenhum profissional para recalcular.");
    await conn.end();
    return;
  }

  // Login no CashBarber
  console.log("🔐 Autenticando no CashBarber...");
  const token = await cashbarberLogin(configs[0].cbEmail, configs[0].cbSenha);
  console.log("✅ Autenticado com sucesso\n");

  const dataInicial = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFinal = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  console.log(`📅 Período: ${dataInicial} → ${dataFinal}`);
  console.log(`🚫 Excluindo categorias: Avulso, Clube, Caixinha, Bar\n`);

  let sincronizados = 0;
  let erros = 0;

  for (const col of colaboradores) {
    try {
      const relatorio = await cashbarberRelatorio15(token, dataInicial, dataFinal, col.cashbarberProfissionalId);
      const servicosRanking = (relatorio.servicos ?? []).filter(s => !CATEGORIAS_EXCLUIDAS.test(s.ser_nome ?? ""));
      const totalServicos = servicosRanking.reduce((acc, s) => acc + (Number(s.sum) || 0), 0);
      const totalProdutos = (relatorio.produtos ?? []).reduce((acc, p) => acc + (Number(p.total) || 0), 0);
      const totalGeral = totalServicos + totalProdutos;

      // Upsert no banco
      const [existing] = await conn.query(
        "SELECT id FROM faturamentoColaboradores WHERE tenantId = 1 AND colaboradorId = ? AND mes = ? AND ano = ?",
        [col.id, mes, ano]
      );

      const now = new Date();
      if (existing.length > 0) {
        await conn.query(
          `UPDATE faturamentoColaboradores 
           SET totalServicos = ?, totalProdutos = ?, totalGeral = ?, 
               detalhesServicos = ?, ultimaSyncEm = ?, updatedAt = ? 
           WHERE tenantId = 1 AND colaboradorId = ? AND mes = ? AND ano = ?`,
          [
            totalServicos.toFixed(2), totalProdutos.toFixed(2), totalGeral.toFixed(2),
            JSON.stringify(servicosRanking.slice(0, 20)), now, now,
            col.id, mes, ano
          ]
        );
      } else {
        await conn.query(
          `INSERT INTO faturamentoColaboradores 
           (tenantId, colaboradorId, empresaSlug, mes, ano, totalServicos, totalProdutos, totalGeral, detalhesServicos, ultimaSyncEm, createdAt, updatedAt) 
           VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            col.id, col.empresaSlug ?? "barbiero-grupo", mes, ano,
            totalServicos.toFixed(2), totalProdutos.toFixed(2), totalGeral.toFixed(2),
            JSON.stringify(servicosRanking.slice(0, 20)), now, now, now
          ]
        );
      }

      const nome = (col.apelido ?? col.nome).padEnd(22);
      console.log(`  ✅ ${nome} | Serv: R$ ${totalServicos.toFixed(2).padStart(10)} | Prod: R$ ${totalProdutos.toFixed(2).padStart(8)} | Total: R$ ${totalGeral.toFixed(2).padStart(10)}`);
      sincronizados++;
    } catch (e) {
      console.error(`  ❌ Erro ao recalcular ${col.nome}: ${e.message}`);
      erros++;
    }
  }

  await conn.end();

  console.log("\n" + "─".repeat(60));
  console.log(`✅ Recálculo concluído: ${sincronizados} profissional(is) atualizado(s)${erros > 0 ? `, ${erros} erro(s)` : ""}.`);
  console.log(`📊 Ranking de ${meses[mes - 1]}/${ano} atualizado com sucesso!\n`);
}

main().catch(e => {
  console.error("Erro fatal:", e.message);
  process.exit(1);
});
