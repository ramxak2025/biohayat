import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";

/**
 * Структурный тип плитки: подходит и Category (главная), и
 * CategoryWithCount (хаб каталога — там добавляется счётчик товаров).
 */
export interface CategoryTileData {
  id: string;
  slug: string;
  name: string;
  image?: string | null;
  _count?: { products: number };
}

/** Русское склонение: 1 товар / 2 товара / 5 товаров. */
export function productsLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} товар`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} товара`;
  return `${n} товаров`;
}

/**
 * Плитки категорий: обложка SmartImage (без фото — фирменная заглушка с
 * листом и буквой выглядит самодостаточно) и название поверх мягкого
 * затемнения снизу. Выразительно и одинаково работает с фото и без.
 */
export function CategoryTiles({ categories }: { categories: CategoryTileData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          className="group relative overflow-hidden rounded-2xl shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
        >
          <SmartImage
            src={c.image}
            alt={c.name}
            ratio="16/11"
            rounded="rounded-none"
            label={c.name}
            spec="640×440"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* затемнение снизу — читаемый белый текст и на фото, и на заглушке */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink/65 via-ink/20 to-transparent"
          />
          <span className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
            <span className="line-clamp-2 block text-sm font-bold leading-snug text-white sm:text-[15px]">
              {c.name}
            </span>
            {c._count ? (
              <span className="tnum mt-0.5 block text-[11px] font-medium text-white/75">
                {productsLabel(c._count.products)}
              </span>
            ) : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
