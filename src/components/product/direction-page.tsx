import type { Metadata } from "next";
import { productDirection, type CatalogDirectionId } from "../../../shared/catalog-directions";
import { ListLink as Link } from "@/components/ui/list-link";
import { Container } from "@/components/ui/container";
import { VysotaPhoto } from "@/components/site/vysota-photo";
import { getDirectionCategories, getSortedProducts, parseProductSort, type ProductSort } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { CATALOG_PAGE_SIZE, pageNumber, Pagination, SORT_OPTIONS } from "./catalog-view";
import { ProductGrid } from "./product-card";

export type DirectionSearch = { category?: string; sort?: string; page?: string };

export async function directionMetadata(id: CatalogDirectionId): Promise<Metadata> {
  const direction = productDirection(id);
  return buildMetadata(
    { title: direction.label, description: direction.summary, path: direction.path },
    await getSettings(),
  );
}

export async function DirectionPage({ id, searchParams }: {
  id: CatalogDirectionId;
  searchParams: Promise<DirectionSearch>;
}) {
  const direction = productDirection(id);
  const [params, categories] = await Promise.all([searchParams, getDirectionCategories(id)]);
  const category = categories.find(({ slug }) => slug === params.category)?.slug;
  const sort = parseProductSort(params.sort);
  const page = pageNumber(params.page);
  const { items, total } = await getSortedProducts({
    direction: id,
    categorySlug: category,
    take: CATALOG_PAGE_SIZE,
    skip: (page - 1) * CATALOG_PAGE_SIZE,
  }, sort);
  const pages = Math.ceil(total / CATALOG_PAGE_SIZE);
  const href = ({ category: nextCategory, sort: nextSort = sort, page: nextPage = 1 }: { category?: string; sort?: ProductSort; page?: number }) => {
    const query = new URLSearchParams();
    if (nextCategory) query.set("category", nextCategory);
    if (nextSort !== "popular") query.set("sort", nextSort);
    if (nextPage > 1) query.set("page", String(nextPage));
    return `${direction.path}${query.size ? `?${query}` : ""}#products`;
  };

  return (
    <>
      <section className="vysota-dark vysota-hero direction-hero" data-direction={id}>
        <VysotaPhoto scene={id} primary />
        <Container className="direction-hero-inner">
          <nav className="vysota-breadcrumbs" aria-label="Хлебные крошки">
            <Link href="/">Главная</Link><span aria-hidden="true">/</span>
            <Link href="/catalog">Каталог</Link><span aria-hidden="true">/</span>
            <span aria-current="page">{direction.label}</span>
          </nav>
          <div className="direction-hero-content">
            <h1><span className="direction-dot" aria-hidden="true" />{direction.label}</h1>
            <div className="glass-dark direction-hero-panel">
              <p>{direction.summary}</p>
              <a href="#products" className="vysota-button vysota-button-light">К товарам</a>
            </div>
          </div>
        </Container>
      </section>

      <section id="products" className="lt vysota-section direction-products" data-direction={id} aria-labelledby="direction-products-heading">
        <Container>
          <div className="vysota-section-heading">
            <div>
              <h2 id="direction-products-heading" className="vysota-heading">Товары</h2>
              <p className="mt-2 text-ink-muted">Найдено: {total}</p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Сортировка">
              {SORT_OPTIONS.map((option) => (
                <Link key={option.value} href={href({ category, sort: option.value })} className="catalog-chip" aria-current={sort === option.value ? "true" : undefined}>
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <nav aria-label="Категории направления" className="mb-7 flex flex-wrap gap-2">
            <Link href={href({})} className="catalog-chip direction-chip" aria-current={!category ? "true" : undefined}>Все</Link>
            {categories.map(({ slug, name }) => (
              <Link key={slug} href={href({ category: slug })} className="catalog-chip direction-chip" aria-current={category === slug ? "true" : undefined}>{name}</Link>
            ))}
          </nav>
          {items.length ? <ProductGrid products={items} /> : (
            <div className="rounded-[var(--r-lg)] bg-white p-8">
              <p className="text-lg font-semibold">Товары не найдены</p>
              <Link href={href({})} className="vysota-button vysota-button-plain mt-4">Все товары направления</Link>
            </div>
          )}
          {pages > 1 ? <Pagination page={page} pages={pages} href={(page) => href({ category, page })} /> : null}
        </Container>
      </section>
    </>
  );
}
