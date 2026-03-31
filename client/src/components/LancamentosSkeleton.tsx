/**
 * Skeleton animado para a aba de Lançamentos.
 * Imita a estrutura real: cabeçalho + 2 cards de empresa, cada um com
 * uma tabela de linhas de datas e categorias.
 */
export default function LancamentosSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Cabeçalho: título + botão */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-52 rounded-lg bg-muted/70" />
        <div className="h-8 w-36 rounded-xl bg-muted/60" />
      </div>

      {/* Card empresa 1 */}
      <TableCardSkeleton rows={5} cols={6} />

      {/* Card empresa 2 */}
      <TableCardSkeleton rows={4} cols={6} />
    </div>
  );
}

function TableCardSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="rounded-2xl bg-card overflow-hidden border border-border/40 shadow-sm">
      {/* Cabeçalho do card */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-muted/80" />
        <div className="h-3.5 w-28 rounded bg-muted/70" />
        <div className="ml-auto h-3 w-16 rounded bg-muted/50" />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Cabeçalho da tabela */}
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 text-left">
                <div className="h-3 w-10 rounded bg-muted/60" />
              </th>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-3 py-2.5 text-right">
                  <div className="h-3 w-14 rounded bg-muted/60 ml-auto" />
                </th>
              ))}
              <th className="px-3 py-2.5 text-right">
                <div className="h-3 w-12 rounded bg-muted/60 ml-auto" />
              </th>
            </tr>
          </thead>
          {/* Linhas */}
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-border/40">
                <td className="px-3 py-2.5">
                  <div className="h-3 w-16 rounded bg-muted/50" />
                </td>
                {Array.from({ length: cols }).map((_, j) => (
                  <td key={j} className="px-3 py-2.5 text-right">
                    <div className="h-3 w-14 rounded bg-muted/40 ml-auto" />
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right">
                  <div className="h-3 w-16 rounded bg-muted/50 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rodapé totais */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-muted/60" />
        <div className="h-4 w-24 rounded bg-muted/70" />
      </div>
    </div>
  );
}
