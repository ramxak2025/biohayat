import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-card";
import { cn } from "@/lib/utils";
import type { Category } from "@prisma/client";
import type { ProductCardData } from "@/lib/queries";

export function CatalogView({
  title,
  description,
  products,
  total,
  categories,
  activeSlug,
  basePath = "/catalog",
}: {
  title: string;
  description?: string | null;
  products: ProductCardData[];
  total: number;
  categories: Pick<Category, "slug" | "name">[];
  activeSlug?: string;
  basePath?: string;
}) {
  return (
    <Container className="py-6 sm:py-8">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-ink-muted">{description}</p> : null}
        <p className="mt-1 text-sm text-ink-faint">{total} товаров</p>
      </div>

      {/* фильтр по категориям (чипсы) */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip href="/catalog" active={basePath === "/catalog" && !activeSlug}>
          Все
        </Chip>
        <Chip href="/sale" active={basePath === "/sale"}>
          Акции
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} href={`/category/${c.slug}`} active={activeSlug === c.slug}>
            {c.name}
          </Chip>
        ))}
      </div>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="rounded-2xl bg-surface-soft py-16 text-center text-ink-muted">
          Ничего не найдено. Попробуйте изменить запрос или категорию.
        </div>
      )}
    </Container>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
        active
          ? "bg-brand-500 text-white ring-brand-500"
          : "bg-surface text-ink-muted ring-line hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
