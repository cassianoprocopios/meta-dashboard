/**
 * Skeleton animado exibido enquanto os dados do dashboard carregam.
 * Imita a estrutura real: banner + 4 KPIs + barra de progresso + gráfico.
 */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Banner topo */}
      <div className="h-16 rounded-2xl bg-muted/60" />

      {/* Grid de 4 KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {/* Card hero — ocupa 2 colunas */}
        <div className="col-span-2 rounded-2xl bg-muted/60 p-5 space-y-3">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
          <div className="flex gap-4 pt-1">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
        {/* KPI 2 */}
        <div className="rounded-2xl bg-muted/60 p-4 space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
        </div>
        {/* KPI 3 */}
        <div className="rounded-2xl bg-muted/60 p-4 space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-2 w-full rounded-full bg-muted" />
        </div>
      </div>

      {/* Card de progresso da meta */}
      <div className="rounded-2xl bg-muted/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-muted" />
              <div className="h-2.5 w-24 rounded bg-muted" />
            </div>
          </div>
          <div className="h-6 w-20 rounded bg-muted" />
        </div>
        <div className="h-3 rounded-full bg-muted" />
        {/* Barras por unidade */}
        <div className="space-y-3 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-2.5 w-20 rounded bg-muted" />
                <div className="h-2.5 w-12 rounded bg-muted" />
              </div>
              <div className="h-2 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Card de gráfico */}
      <div className="rounded-2xl bg-muted/60 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-2.5 w-28 rounded bg-muted" />
          </div>
        </div>
        <div className="h-[180px] sm:h-[200px] rounded-xl bg-muted/80" />
      </div>
    </div>
  );
}
