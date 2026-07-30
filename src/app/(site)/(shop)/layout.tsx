import { Container } from "@/components/ui/container";
import { CatalogSidebar } from "@/components/product/catalog-sidebar";
import { getCategoriesWithCounts } from "@/lib/queries";
import { getActiveBrands } from "@/lib/brands";

/**
 * Общий макет разделов каталога: /catalog, /category/…, /sale, /for/…, /goal/…
 *
 * Раньше боковое меню жило внутри CatalogView, то есть было частью страницы.
 * При переходе в другую категорию Next перерисовывал страницу целиком — вместе
 * с меню: колонка слева моргала и списки перескакивали, хотя её содержимое не
 * менялось. В нормальном магазине эта колонка стоит на месте, а меняется
 * только витрина.
 *
 * Здесь меню поднято в layout. Макет при навигации между вложенными
 * страницами не перерисовывается (документация Next, layouts-and-pages:
 * «layouts preserve state, remain interactive, and do not rerender»), поэтому
 * колонка сохраняет и позицию прокрутки, и состояние. Меняется только правая
 * часть — и на время загрузки её подменяет loading.tsx этой же группы, а не
 * общий полноэкранный прелоадер.
 *
 * Скобки в имени папки — группа маршрутов: на адреса она не влияет,
 * /catalog остаётся /catalog.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [categories, brands] = await Promise.all([
    getCategoriesWithCounts(),
    getActiveBrands(),
  ]);
  // В меню только бренды со своими товарами: пустой раздел ведёт в никуда.
  const sidebarBrands = brands
    .filter((b) => b._count.products > 0)
    .map((b) => ({ slug: b.slug, name: b.name, count: b._count.products }));

  return (
    <Container className="py-6 sm:py-8">
      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
        <CatalogSidebar categories={categories} brands={sidebarBrands} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
