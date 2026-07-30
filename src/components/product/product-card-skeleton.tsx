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
 * Скелетон витрины каталога: заголовок, чипсы на мобильном и сетка карточек.
 * withSort — добавляет ряд под панель сортировки (страница категории).
 *
 * Ни контейнера, ни бокового меню здесь нет: и то и другое живёт в макете
 * группы каталога и при переходах не перерисовывается. Пока меню рисовалось
 * ещё и в скелетоне, во время загрузки на экране оказывались два меню и
 * двойные поля.
 */
export function CatalogPageSkeleton({ withSort = false }: { withSort?: boolean } = {}) {
  return (
    <div>
        <div className="min-w-0">
          <CatalogHeaderSkeleton className="mb-5" />

          {/* чипсы-фильтры (мобайл) */}
          <div
            className={cn(
              "no-scrollbar -mx-4 flex animate-pulse gap-2 overflow-x-auto px-4 py-1 lg:hidden",
              withSort ? "mb-3" : "mb-6",
            )}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-24 shrink-0 rounded-full bg-surface-sunken" />
            ))}
          </div>

          {/* панель сортировки */}
          {withSort ? (
            <div className="no-scrollbar -mx-4 mb-6 flex animate-pulse gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-surface-sunken" />
              ))}
            </div>
          ) : null}

          <ProductGridSkeleton count={10} />
        </div>
    </div>
  );
}

/**
 * Скелетон мобильного хаба каталога (повторяет раскладку CatalogHub):
 * чипсы целей → карточки «Кому» → плитки категорий → лента хитов.
 */
export function CatalogHubSkeleton() {
  return (
    <div className="animate-pulse space-y-7">
      <div>
        <div className="h-7 w-36 rounded-full bg-surface-sunken" />
        <div className="mt-2 h-4 w-64 max-w-full rounded-full bg-surface-sunken" />
      </div>

      {/* чипсы «Зачем» */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-hidden px-4 py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-32 shrink-0 rounded-full bg-surface-sunken" />
        ))}
      </div>

      {/* «Кому» — 3 карточки */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[104px] rounded-2xl bg-surface-sunken" />
        ))}
      </div>

      {/* плитки категорий 2 колонки */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-line">
            <div className="aspect-[16/10] bg-surface-sunken" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-3/4 rounded-full bg-surface-sunken" />
              <div className="h-3 w-1/2 rounded-full bg-surface-sunken" />
            </div>
          </div>
        ))}
      </div>

      {/* лента хитов */}
      <div className="-mx-4 flex gap-3 overflow-x-hidden px-4 py-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-40 shrink-0 sm:w-44">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
