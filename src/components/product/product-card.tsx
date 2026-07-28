import Link from "next/link";
import { Star } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatMoney, discountPercent } from "@/lib/utils";
import type { ProductCardData } from "@/lib/queries";
import { Stagger } from "@/components/motion/reveal";

export function ProductCard({ product }: { product: ProductCardData }) {
  const discount = discountPercent(product.priceKopecks, product.oldPriceKopecks);
  const image = product.images[0]?.url;
  // stockQty === null — учёт остатков выключен, продаём как раньше.
  const soldOut = !product.inStock || product.stockQty === 0;
  const lowStock =
    !soldOut && product.stockQty !== null && product.stockQty >= 1 && product.stockQty <= 5;

  return (
    <div className="group flex flex-col rounded-2xl bg-surface p-2 shadow-xs ring-1 ring-line transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/product/${product.slug}`}
        aria-label={`${product.name}, ${formatMoney(product.priceKopecks)}`}
        className="relative block"
      >
        <SmartImage
          src={image}
          alt={product.name}
          ratio="1/1"
          rounded="rounded-xl"
          label={product.name}
          spec="1000×1000"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {product.isFeatured ? <Badge tone="accent">хит</Badge> : null}
          {soldOut ? <Badge tone="neutral">нет в наличии</Badge> : null}
          {lowStock ? <Badge tone="sale-soft">Осталось {product.stockQty} шт</Badge> : null}
        </div>
        <div className="absolute right-2 top-2">
          <FavoriteButton productId={product.id} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 px-1.5 pb-1.5 pt-2.5">
        {/* Название товара идёт первым: карточка в сетке продаёт названием и
            ценой, а не таксономией. Категория ушла вниз, набором обычным, а не
            капсом — она подсказка «что это вообще», а не заголовок. */}
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-snug text-ink hover:text-brand-700"
        >
          {product.name}
        </Link>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
          <Link
            href={`/category/${product.category.slug}`}
            className="truncate font-medium text-brand-700 hover:underline"
          >
            {product.category.name}
          </Link>
          {product.brand && !product.brand.isOwn ? (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{product.brand.name}</span>
            </>
          ) : null}
        </span>

        {product.reviewStats && product.reviewStats.count > 0 ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted"
            aria-label={`Рейтинг ${product.reviewStats.avg} из 5, отзывов: ${product.reviewStats.count}`}
          >
            <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" aria-hidden />
            {product.reviewStats.avg.toLocaleString("ru-RU")}
            <span className="font-normal text-ink-faint">({product.reviewStats.count})</span>
          </span>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
          <span className="tnum text-xl font-extrabold leading-none text-ink">
            {formatMoney(product.priceKopecks)}
          </span>
          {product.oldPriceKopecks ? (
            <span className="tnum text-sm font-medium text-ink-faint line-through">
              {formatMoney(product.oldPriceKopecks)}
            </span>
          ) : null}
          {discount ? (
            <Badge tone="sale-soft" className="tnum">
              −{discount}%
            </Badge>
          ) : null}
        </div>

        <AddToCartButton
          full
          size="sm"
          inStock={!soldOut}
          maxQty={product.stockQty ?? 99}
          item={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            priceKopecks: product.priceKopecks,
            image,
          }}
        />
      </div>
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5" step={0.06} y={20}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </Stagger>
  );
}
