import { ListLink as Link } from "@/components/ui/list-link";
import { SmartImage } from "@/components/ui/smart-image";
import type { Brand } from "@prisma/client";

/** «N товаров» с корректным склонением. */
function pluralProducts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
}

type BrandStripItem = Pick<Brand, "id" | "slug" | "name" | "logo"> & {
  _count?: { products: number };
};

/**
 * Витрина брендов: горизонтальная snap-лента карточек (логотип на белой плитке
 * + название + «N товаров»). Каждая карточка ведёт на /brand/<slug>.
 * Единый визуальный язык с витриной: rounded-2xl, ring-line, тач ≥44px.
 */
export function BrandStrip({ brands }: { brands: BrandStripItem[] }) {
  if (brands.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
      {brands.map((b) => {
        const count = b._count?.products;
        return (
          <Link
            key={b.id}
            href={`/brand/${b.slug}`}
            className="group flex w-32 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:w-36"
          >
            <div className="flex h-20 w-full items-center justify-center rounded-2xl bg-white p-2.5 ring-1 ring-line">
              <SmartImage
                src={b.logo}
                alt={b.name}
                ratio="1/1"
                rounded="rounded-lg"
                label={b.name}
                spec="600×600"
                sizes="120px"
                className="w-14"
              />
            </div>
            <span className="line-clamp-1 w-full text-[13px] font-bold leading-tight text-ink group-hover:text-brand-700">
              {b.name}
            </span>
            {typeof count === "number" ? (
              <span className="text-xs text-ink-faint">
                {count} {pluralProducts(count)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
