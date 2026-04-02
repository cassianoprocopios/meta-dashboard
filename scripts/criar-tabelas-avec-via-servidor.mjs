/**
 * Cria as tabelas Avec e insere dados iniciais via chamada tRPC ao servidor.
 * Usa o endpoint de admin do servidor local.
 */

const BASE_URL = "http://localhost:3000";

// Primeiro fazer login para obter cookie de sessão
async function login() {
  const res = await fetch(`${BASE_URL}/api/trpc/auth.loginComSenha?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "0": {
        json: {
          email: "cassiano@barbierogrupo.com",
          senha: "admin123"
        }
      }
    })
  });
  const data = await res.json();
  const setCookie = res.headers.get("set-cookie");
  console.log("Login response:", JSON.stringify(data[0]?.result?.data?.json || data[0]?.error, null, 2));
  return setCookie;
}

// Chamar a procedure de setup do Avec
async function setupAvec(cookie) {
  const res = await fetch(`${BASE_URL}/api/trpc/avec.setupTabelas?batch=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie || ""
    },
    body: JSON.stringify({
      "0": { json: {} }
    })
  });
  const data = await res.json();
  console.log("Setup response:", JSON.stringify(data, null, 2));
}

const cookie = await login();
if (cookie) {
  await setupAvec(cookie);
} else {
  console.log("Login falhou, tentando sem autenticação...");
  await setupAvec(null);
}
