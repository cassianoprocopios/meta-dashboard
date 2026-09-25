import { useMemo, useState } from "react";
import { BarChart3, Package, Scissors } from "lucide-react";

type ServicoDetalhe = { ser_nome: string; sum: number; count?: number };
type ProdutoDetalhe = { pro_nome: string; sum: number; count?: number };
type Filtro = "todos" | "servicos" | "produtos";

function parseLista<T extends object>(json: string | null | undefined, nomeKey: keyof T): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item[nomeKey] === "string" && typeof item.sum === "number");
  } catch {
    return [];
  }
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export default function RecordeDetalhes({
  detalhesServicos,
  detalhesProdutos,
  modo = "claro",
}: {
  detalhesServicos?: string | null;
  detalhesProdutos?: string | null;
  modo?: "claro" | "escuro";
}) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const servicos = useMemo(() => parseLista<ServicoDetalhe>(detalhesServicos, "ser_nome"), [detalhesServicos]);
  const produtos = useMemo(() => parseLista<ProdutoDetalhe>(detalhesProdutos, "pro_nome"), [detalhesProdutos]);
  const totalServicos = servicos.reduce((total, item) => total + item.sum, 0);
  const totalProdutos = produtos.reduce((total, item) => total + item.sum, 0);
  const total = totalServicos + totalProdutos;
  const percentualServicos = total > 0 ? Math.round((totalServicos / total) * 100) : 0;
  const percentualProdutos = total > 0 ? 100 - percentualServicos : 0;
  const itens = filtro === "servicos"
    ? servicos.map((item) => ({ nome: item.ser_nome, valor: item.sum, quantidade: item.count, tipo: "servico" as const }))
    : filtro === "produtos"
      ? produtos.map((item) => ({ nome: item.pro_nome, valor: item.sum, quantidade: item.count, tipo: "produto" as const }))
      : [
          ...servicos.map((item) => ({ nome: item.ser_nome, valor: item.sum, quantidade: item.count, tipo: "servico" as const })),
          ...produtos.map((item) => ({ nome: item.pro_nome, valor: item.sum, quantidade: item.count, tipo: "produto" as const })),
        ];
  const escuro = modo === "escuro";
  const titulo = escuro ? "text-white/55" : "text-slate-500";
  const texto = escuro ? "text-white/75" : "text-slate-700";
  const fundo = escuro ? "bg-black/15" : "bg-white/70";
  const borda = escuro ? "border-white/10" : "border-slate-200/70";

  if (servicos.length === 0 && produtos.length === 0) return null;

  return (
    <div className={`mt-3 border-t pt-3 ${escuro ? "border-white/10" : "border-slate-200/70"}`}>
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 className={`h-4 w-4 ${escuro ? "text-blue-300" : "text-blue-600"}`} />
        <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${titulo}`}>Composição do mês recorde</p>
      </div>
      <div className={`mb-3 rounded-lg border p-2.5 ${fundo} ${borda}`}>
        <div className="mb-2 flex h-3 overflow-hidden rounded-full bg-slate-200/60" role="img" aria-label={`Serviços representam ${percentualServicos}% e produtos ${percentualProdutos}% do mês recorde`}>
          {percentualServicos > 0 && <div className="bg-blue-500 transition-[width]" style={{ width: `${percentualServicos}%` }} />}
          {percentualProdutos > 0 && <div className="bg-emerald-500 transition-[width]" style={{ width: `${percentualProdutos}%` }} />}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 font-semibold ${escuro ? "text-blue-200" : "text-blue-700"}`}><Scissors className="h-3 w-3" /> Serviços</span>
            <span className={`font-black ${escuro ? "text-white" : "text-slate-800"}`}>{percentualServicos}% · {moeda(totalServicos)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 font-semibold ${escuro ? "text-emerald-200" : "text-emerald-700"}`}><Package className="h-3 w-3" /> Produtos</span>
            <span className={`font-black ${escuro ? "text-white" : "text-slate-800"}`}>{percentualProdutos}% · {moeda(totalProdutos)}</span>
          </div>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar itens do mês recorde">
        {([
          ["todos", "Todos", servicos.length + produtos.length],
          ["servicos", "Serviços", servicos.length],
          ["produtos", "Produtos", produtos.length],
        ] as const).map(([valor, label, quantidade]) => (
          <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filtro === valor
              ? escuro ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
              : escuro ? "bg-white/10 text-white/60 hover:bg-white/15" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {label} ({quantidade})
          </button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {itens.length === 0 ? <li className={`rounded-lg px-2 py-2 text-[10px] ${escuro ? "bg-white/5 text-white/35" : "bg-slate-50 text-slate-400"}`}>Nenhum item nesta categoria.</li> : itens.sort((a, b) => b.valor - a.valor).map((item, index) => (
          <li key={`${item.tipo}-${item.nome}-${index}`} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${fundo} ${borda}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.tipo === "servico" ? "bg-blue-500/15 text-blue-500" : "bg-emerald-500/15 text-emerald-500"}`}>
              {item.tipo === "servico" ? <Scissors className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
            </span>
            <span className={`min-w-0 flex-1 truncate text-[10px] font-semibold ${texto}`}>{item.nome} {item.quantidade ? `×${item.quantidade}` : ""}</span>
            <span className={`shrink-0 text-[10px] font-black ${escuro ? "text-white" : "text-slate-800"}`}>{moeda(item.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
