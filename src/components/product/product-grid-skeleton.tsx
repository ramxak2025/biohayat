/** Скелетон сетки товаров — мягкое ожидание вместо «прыжка» контента. */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          <div className="aspect-square animate-pulse bg-surface-sunken" />
          <div className="space-y-2.5 p-3.5">
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface-sunken" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-sunken" />
            <div className="mt-1 h-9 w-full animate-pulse rounded-full bg-surface-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}
