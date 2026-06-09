import Link from "next/link";
import { ArrowDownUp, PackageSearch } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { CatalogSidebar } from "@/components/product/catalog-sidebar";
import { ChipsRow } from "@/components/product/chips-row";
import { cn } from "@/lib/utils";
import type { Category } from "@prisma/client";
import type { ProductCardData, ProductSort } from "@/lib/queries";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "Популярные" },
  { value: "price-asc", label: "Цена ↑" },
  { value: "price-desc", label: "Цена ↓" },
  { value: "new", label: "Новинки" },
];

export function CatalogView({
  title,
  description,
  products,
  total,
  categories,
  activeSlug,
  basePath = "/catalog",
  sort,
  sortBase,
}: {
  title: string;
  description?: string | null;
  products: ProductCardData[];
  total: number;
  categories: Pick<Category, "slug" | "name">[];
  activeSlug?: string;
  basePath?: string;
  /** Текущая сортировка (вместе с sortBase включает панель сортировки). */
  sort?: ProductSort;
  /** Базовый путь для ссылок сортировки, напр. "/category/med" → "?sort=…". */
  sortBase?: string;
}) {
  return (
    <Container className="py-6 sm:py-8">
      <div className="lg:grid lg:grid-cols-[248px_1fr] lg:gap-8">
        {/* Десктоп: боковое меню слева */}
        <CatalogSidebar categories={categories} activeHref={basePath} />

        <div className="min-w-0">
          <div className="mb-5">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {description ? <p className="mt-1.5 max-w-2xl text-ink-muted">{description}</p> : null}
            <p className="mt-1 text-sm text-ink-faint">{total} товаров</p>
          </div>

          {/* Мобайл: чипсы соседних категорий, текущая выделена и подскроллена в центр
              (на десктопе их заменяет боковое меню) */}
          <ChipsRow
            activeKey={activeSlug ?? basePath}
            className={cn("-mx-4 px-4 py-1 lg:hidden", sortBase ? "mb-3" : "mb-6")}
          >
            <Chip href="/catalog" active={basePath === "/catalog" && !activeSlug}>
              Все
            </Chip>
            <Chip href="/sale" active={basePath === "/sale"} tone="sale">
              Распродажа
            </Chip>
            {categories.map((c) => (
              <Chip key={c.slug} href={`/category/${c.slug}`} active={activeSlug === c.slug}>
                {c.name}
              </Chip>
            ))}
          </ChipsRow>

          {/* Компактная панель сортировки (через ?sort=, ссылки кэш-дружелюбны) */}
          {sortBase ? (
            <div className="no-scrollbar -mx-4 mb-6 flex snap-x items-center gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:px-0">
              <span className="inline-flex shrink-0 items-center gap-1 pr-1 text-xs font-semibold text-ink-faint">
                <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                Сортировка
              </span>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  href={o.value === "popular" ? sortBase : `${sortBase}?sort=${o.value}`}
                  active={(sort ?? "popular") === o.value}
                  size="sm"
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          ) : null}

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="flex flex-col items-center rounded-2xl bg-surface-soft px-6 py-16 text-center">
              <PackageSearch className="h-12 w-12 text-brand-300" aria-hidden />
              <p className="mt-4 text-lg font-bold">Ничего не найдено</p>
              <p className="mt-1 max-w-sm text-ink-muted">
                Попробуйте изменить запрос или категорию — а в каталоге точно найдётся
                что-то полезное.
              </p>
              <Button asChild className="mt-5">
                <Link href="/catalog">В каталог</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

function Chip({
  href,
  active,
  tone,
  size,
  children,
}: {
  href: string;
  active?: boolean;
  tone?: "sale";
  size?: "sm";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      className={cn(
        // min-h-10 (40px) — комфортная тач-цель; snap-start для скролл-снапа ленты
        "inline-flex min-h-10 shrink-0 snap-start items-center whitespace-nowrap rounded-full font-semibold ring-1 transition",
        size === "sm" ? "px-3.5 text-[13px]" : "px-4 text-sm",
        active
          ? tone === "sale"
            ? "bg-sale text-white ring-sale"
            : "bg-brand-500 text-white ring-brand-500"
          : tone === "sale"
            ? "bg-sale/10 text-sale ring-sale/20 hover:bg-sale/15"
            : "bg-surface text-ink-muted ring-line hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
