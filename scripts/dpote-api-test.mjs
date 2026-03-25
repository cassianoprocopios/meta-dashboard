const CB_BASE = "https://api.cashbarber.com.br";

async function login() {
  const resp = await fetch(CB_BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "barbierobarbearia@gmail.com", password: "2@Barbiero", ctx: "painel" }),
  });
  if (resp.status === 409) {
    await fetch(CB_BASE + "/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "barbierobarbearia@gmail.com", ctx: "painel" }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
    return login();
  }
  const setCookie = resp.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/access_token_painel=([^;]+)/);
  if (!m) throw new Error("Token não encontrado");
  return m[1];
}

async function run() {
  const token = await login();
  console.log("Login OK");

  const h = await fetch(CB_BASE + "/api/painel/dpote/historico", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const hId = await h.json();
  console.log("Histórico ID:", hId);

  const hData = await fetch(CB_BASE + "/api/painel/dpote/historico/" + hId, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await hData.json();
  console.log("Faturamento:", JSON.stringify(data.faturamento));
  console.log("Filiais count:", data.filiais_servicos?.length ?? 0);

  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();

  const paths = [
    "/api/painel/dpote/relatorio?mes=" + mes + "&ano=" + ano,
    "/api/painel/dpote/relatorio/" + hId,
    "/api/painel/dpote/historico/" + hId + "/relatorio",
    "/api/painel/dpote/historico/" + hId + "/calcular",
    "/api/painel/dpote/historico/" + hId + "/processar",
    "/api/painel/assinatura/relatorio?mes=" + mes + "&ano=" + ano,
    "/api/painel/dpote/historico?mes=" + mes + "&ano=" + ano,
    "/api/painel/dpote?mes=" + mes + "&ano=" + ano,
    "/api/painel/dpote/historico/" + (hId - 1),
    "/api/painel/dpote/historico/" + (hId - 2),
    "/api/painel/dpote/historico/" + (hId - 3),
  ];

  for (const path of paths) {
    const r = await fetch(CB_BASE + path, { headers: { Authorization: "Bearer " + token } });
    const text = await r.text();
    console.log(path + " -> " + r.status + " : " + text.substring(0, 200));
  }
}

run().catch(console.error);
