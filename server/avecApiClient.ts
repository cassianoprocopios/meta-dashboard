/**
 * Cliente da API oficial do Avec (api.avec.beauty)
 * Usa autenticação por Bearer token, que tem prioridade sobre o cookie de sessão manual.
 *
 * Documentação: https://doc.api.avec.beauty
 *
 * O token é gerado no painel do Avec em:
 *   Configurações → Integrações → API
 *
 * Endpoint principal usado:
 *   GET /reports/0184?page=1&limit=250&inicio=DD/MM/YYYY&fim=DD/MM/YYYY
 *   Authorization: Bearer <token>
 *
 * Resposta do relatório 0184 (Faturamento por Tipos de Venda):
 *   {
 *     "data": [
 *       {
 *         "data": "20/03/2026",
 *         "tipo_venda": "Serviço",
 *         "quantidade": 12,
 *         "valor_total": 1500.00
 *       },
 *       ...
 *     ],
 *     "meta": { "total": 100, "page": 1, "limit": 250 }
 *   }
 */

const AVEC_API_BASE = "https://api.avec.beauty";

export interface AvecApiRelatorio0184Item {
  data: string;           // "DD/MM/YYYY"
  tipo_venda: string;     // "Serviço", "Produto", "Pacote", etc.
  quantidade: number;
  valor_total: number;
}

export interface AvecApiRelatorio0184Response {
  data: AvecApiRelatorio0184Item[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * Testa se o token Bearer é válido fazendo uma requisição mínima à API.
 * Retorna true se o token funcionar, false caso contrário.
 */
export async function avecApiTestarToken(token: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, "0");
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const yyyy = hoje.getFullYear();
    const dataStr = `${dd}/${mm}/${yyyy}`;

    const resp = await fetch(
      `${AVEC_API_BASE}/reports/0184?page=1&limit=1&inicio=${dataStr}&fim=${dataStr}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "MetaDashboard/1.0",
        },
      }
    );

    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, erro: `Token inválido ou sem permissão (HTTP ${resp.status})` };
    }

    if (!resp.ok) {
      return { ok: false, erro: `Erro HTTP ${resp.status}: ${resp.statusText}` };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, erro: `Erro de conexão: ${msg}` };
  }
}

/**
 * Busca os dados do relatório 0184 (Faturamento por Tipos de Venda) para um período.
 * Retorna todos os itens paginando automaticamente.
 */
export async function avecApiBuscarRelatorio0184(
  token: string,
  inicio: Date,
  fim: Date
): Promise<AvecApiRelatorio0184Item[]> {
  const formatData = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const inicioStr = formatData(inicio);
  const fimStr = formatData(fim);

  const todos: AvecApiRelatorio0184Item[] = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `${AVEC_API_BASE}/reports/0184?page=${page}&limit=${limit}&inicio=${inicioStr}&fim=${fimStr}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "MetaDashboard/1.0",
      },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Avec API erro HTTP ${resp.status}: ${body.slice(0, 200)}`);
    }

    const json = (await resp.json()) as AvecApiRelatorio0184Response;
    const items = json.data ?? [];
    todos.push(...items);

    // Se retornou menos que o limite, não há mais páginas
    if (items.length < limit) break;

    // Se tiver meta.total, verificar se já buscamos tudo
    if (json.meta?.total && todos.length >= json.meta.total) break;

    page++;

    // Limite de segurança: máximo 20 páginas (5000 registros)
    if (page > 20) break;
  }

  return todos;
}

/**
 * Mapeamento padrão dos tipos de venda do Avec para as categorias do sistema.
 * O usuário pode personalizar esse mapeamento no painel.
 *
 * Categorias do sistema Seraphine:
 *   cat1 = Cabelo
 *   cat2 = Unha
 *   cat3 = Outros
 *   cat4 = Produtos
 *   cat5 = Recorrência (assinaturas)
 */
export const AVEC_TIPO_VENDA_PADRAO: Record<string, string> = {
  "Serviço": "cat1",
  "Serviços": "cat1",
  "Produto": "cat4",
  "Produtos": "cat4",
  "Pacote": "cat1",
  "Assinatura": "cat5",
  "Assinaturas": "cat5",
  "Recorrência": "cat5",
  "Voucher": "cat3",
  "Outros": "cat3",
};

/**
 * Agrega os itens do relatório 0184 por data e categoria do sistema.
 * Retorna um mapa: { "YYYY-MM-DD": { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 } }
 */
export function avecAgregarPorDataECategoria(
  items: AvecApiRelatorio0184Item[],
  mapeamento: Record<string, string> = AVEC_TIPO_VENDA_PADRAO
): Record<string, { cat1: number; cat2: number; cat3: number; cat4: number; cat5: number }> {
  const resultado: Record<string, { cat1: number; cat2: number; cat3: number; cat4: number; cat5: number }> = {};

  for (const item of items) {
    // Converter data de "DD/MM/YYYY" para "YYYY-MM-DD"
    const partes = item.data.split("/");
    if (partes.length !== 3) continue;
    const dataISO = `${partes[2]}-${partes[1]}-${partes[0]}`;

    if (!resultado[dataISO]) {
      resultado[dataISO] = { cat1: 0, cat2: 0, cat3: 0, cat4: 0, cat5: 0 };
    }

    const catKey = mapeamento[item.tipo_venda] ?? "cat3"; // fallback para "Outros"
    const cat = catKey as keyof typeof resultado[typeof dataISO];
    resultado[dataISO][cat] = (resultado[dataISO][cat] ?? 0) + (item.valor_total ?? 0);
  }

  return resultado;
}
