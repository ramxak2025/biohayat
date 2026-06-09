import { cn } from "@/lib/utils";

/** Пульсирующая заглушка по форме карточки товара. */
export function ProductCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line">
      <div className="aspect-square w-full bg-surface-sunken" />
      <div className="flex flex-1 flex-col p-3.5">
        <div className="h-3 w-1/3 rounded-full bg-surface-sunken" />
        <div className="mt-2.5 h-3.5 w-full rounded-full bg-surface-sunken" />
        <div className="mt-1.5 h-3.5 w-2/3 rounded-full bg-surface-sunken" />
        <div className="mt-auto pt-4">
          <div className="h-5 w-24 rounded-full bg-surface-sunken" />
          <div className="mt-3 h-9 w-full rounded-full bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}

/** Сетка скелетонов в том же гриде, что и ProductGrid. */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Скелетон заголовка страницы каталога/подборки. */
export function CatalogHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="h-8 w-56 rounded-full bg-surface-sunken sm:h-9 sm:w-72" />
      <div className="mt-3 h-4 w-full max-w-md rounded-full bg-surface-sunken" />
      <div className="mt-2 h-3.5 w-24 rounded-full bg-surface-sunken" />
    </div>
  );
}

/**
 * Полный скелетон страницы каталога/подборки: повторяет раскладку CatalogView
 * (боковое меню на десктопе, чипсы на мобильном, заголовок + сетка карточек).
 */
export function CatalogPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
        {/* боковое меню (десктоп) */}
        <div className="hidden animate-pulse lg:block">
          <div className="space-y-2.5 rounded-2xl bg-surface p-4 ring-1 ring-line">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-surface-sunken" />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <CatalogHeaderSkeleton className="mb-5" />

          {/* чипсы-фильтры (мобайл) */}
          <div className="no-scrollbar -mx-4 mb-6 flex animate-pulse gap-2 overflow-x-auto px-4 py-1 lg:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-surface-sunken" />
            ))}
          </div>

          <ProductGridSkeleton count={10} />
        </div>
      </div>
    </div>
  );
}
