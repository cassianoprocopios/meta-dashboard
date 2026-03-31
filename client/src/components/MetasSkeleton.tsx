/**
 * Skeleton animado para a aba de Metas.
 * Imita a estrutura real: cabeçalho + grid de 3 cards de empresa,
 * cada um com campos de meta mensal, quinzenal, super meta e dias úteis.
 */
export default function MetasSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 rounded-lg bg-muted/70" />
          <div className="h-3.5 w-72 rounded bg-muted/50" />
        </div>
        <div className="h-7 w-28 rounded-lg bg-muted/50" />
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <MetaCardSkeleton key={i} />
        ))}
      </div>

      {/* Rodapé: totais + botão salvar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-6">
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-4 w-28 rounded bg-muted/60" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-4 w-28 rounded bg-muted/60" />
          </div>
        </div>
        <div className="h-9 w-32 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}

function MetaCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
      {/* Cabeçalho do card: cor + nome empresa */}
      <div className="px-5 pt-5 pb-4 border-b border-border/40 flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-muted/80" />
        <div className="h-4 w-24 rounded bg-muted/70" />
        {/* Badge de atingimento */}
        <div className="ml-auto h-5 w-16 rounded-full bg-muted/50" />
      </div>

      <div className="p-5 space-y-4">
        {/* Barra de progresso */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-3 w-12 rounded bg-muted/50" />
          </div>
          <div className="h-2 w-full rounded-full bg-muted/60" />
        </div>

        {/* Campo: Meta Mensal */}
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-muted/50" />
          <div className="h-9 w-full rounded-xl bg-muted/40" />
        </div>

        {/* Campo: Meta Quinzenal */}
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded bg-muted/50" />
          <div className="h-9 w-full rounded-xl bg-muted/40" />
        </div>

        {/* Campo: Super Meta */}
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-muted/50" />
          <div className="h-9 w-full rounded-xl bg-muted/40" />
        </div>

        {/* Dias úteis (2 colunas) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-9 w-full rounded-xl bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-9 w-full rounded-xl bg-muted/40" />
          </div>
        </div>

        {/* Linha de meta diária */}
        <div className="flex justify-between pt-1">
          <div className="h-3 w-24 rounded bg-muted/40" />
          <div className="h-3 w-20 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
