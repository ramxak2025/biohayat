import Link from "next/link";
import { SmartImage } from "@/components/ui/smart-image";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatMoney, discountPercent } from "@/lib/utils";
import type { ProductCardData } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductCardData }) {
  const discount = discountPercent(product.priceKopecks, product.oldPriceKopecks);
  const image = product.images[0]?.url;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="relative block">
        <SmartImage
          src={image}
          alt={product.name}
          ratio="1/1"
          rounded="rounded-none"
          label={product.name}
          spec="1000×1000"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {discount ? <Badge tone="sale">−{discount}%</Badge> : null}
          {product.isFeatured ? <Badge tone="accent">хит</Badge> : null}
          {!product.inStock ? <Badge tone="neutral">нет в наличии</Badge> : null}
        </div>
        <div className="absolute right-2.5 top-2.5">
          <FavoriteButton productId={product.id} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <Link
          href={`/category/${product.category.slug}`}
          className="text-xs font-semibold text-brand-600 hover:underline"
        >
          {product.category.name}
        </Link>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[2.6em] text-[15px] font-semibold leading-tight text-ink hover:text-brand-700"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-3">
          <div className="mb-2.5 flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-ink">
              {formatMoney(product.priceKopecks)}
            </span>
            {product.oldPriceKopecks ? (
              <span className="text-sm font-medium text-ink-faint line-through">
                {formatMoney(product.oldPriceKopecks)}
              </span>
            ) : null}
          </div>
          <AddToCartButton
            full
            size="sm"
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
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
