/**
 * Заглушка на время загрузки витрины.
 *
 * Граница ожидания здесь, внутри группы каталога, а не на уровне всего сайта:
 * поэтому при переходе в другую категорию подменяется только правая колонка,
 * а боковое меню остаётся на месте. Раньше срабатывал общий loading.tsx и
 * гасил страницу целиком вместе с меню.
 *
 * Каркас повторяет сетку товаров, а не крутит спиннер: человек видит, куда
 * встанет содержимое, и переход не читается как перезагрузка.
 */
export default function ShopLoading() {
  return (
    <div aria-busy="true" aria-label="Загрузка товаров">
      <div className="mb-5">
        <div className="h-8 w-56 rounded-lg bg-surface-sunken" />
        <div className="mt-2 h-4 w-72 rounded bg-surface-soft" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface p-2 ring-1 ring-line">
            <div className="aspect-square rounded-xl bg-surface-sunken" />
            <div className="mt-2.5 h-4 w-full rounded bg-surface-soft" />
            <div className="mt-1.5 h-4 w-2/3 rounded bg-surface-soft" />
            <div className="mt-3 h-5 w-1/2 rounded bg-surface-sunken" />
            <div className="mt-2.5 h-9 rounded-full bg-surface-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}
