import Image from "next/image";
import { Package, Star } from "lucide-react";
import { productDirection } from "../../../shared/catalog-directions";
import { ListLink as Link } from "@/components/ui/list-link";
import { Badge } from "@/components/ui/badge";
import { DirectionMark } from "@/components/site/direction-mark";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatMoney, discountPercent } from "@/lib/utils";
import type { ProductCardData } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductCardData }) {
  const direction = productDirection(product.direction);
  const discount = discountPercent(product.priceKopecks, product.oldPriceKopecks);
  const image = product.images[0]?.url;
  const soldOut = !product.inStock || product.stockQty === 0;
  const lowStock = !soldOut && product.stockQty !== null && product.stockQty >= 1 && product.stockQty <= 5;

  return (
    <article className="product-card" data-direction={direction.id}>
      <div className="product-card-photo">
        <Link href={`/product/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          {image ? (
            <Image src={image} alt="" fill sizes="(max-width: 639px) 104px, (max-width: 1100px) 33vw, 300px" className="object-contain" />
          ) : (
            <Package aria-hidden="true" strokeWidth={1.5} className="absolute inset-0 m-auto size-12 text-ink-muted" />
          )}
        </Link>
        {product.isFeatured ? <Badge className="product-card-featured bg-ink text-mist">Хит</Badge> : null}
        <FavoriteButton productId={product.id} className="product-card-favorite" />
      </div>
      <div className="product-card-content">
        <Link href={direction.path} className="w-fit text-[13px] hover:underline">
          <DirectionMark direction={direction} />
        </Link>
        <h3 className="product-card-title">
          <Link href={`/product/${product.slug}`} className="hover:underline">{product.name}</Link>
        </h3>
        <p className="product-card-meta">
          <Link href={`/category/${product.category.slug}`} className="hover:underline">{product.category.name}</Link>
          {product.volume ? ` · ${product.volume}` : ""}
          {product.brand && !product.brand.isOwn ? ` · ${product.brand.name}` : ""}
        </p>
        {product.reviewStats && product.reviewStats.count > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted" aria-label={`Рейтинг ${product.reviewStats.avg} из 5, отзывов: ${product.reviewStats.count}`}>
            <Star className="size-3.5 fill-grass text-ink-muted" aria-hidden="true" />
            {product.reviewStats.avg.toLocaleString("ru-RU")} ({product.reviewStats.count})
          </span>
        ) : null}
        {lowStock ? <p className="text-xs text-ink-muted">Осталось {product.stockQty} шт.</p> : null}
        <div className="product-card-buy">
          <div className="tnum flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl font-semibold">{formatMoney(product.priceKopecks)}</span>
            {product.oldPriceKopecks ? <del className="text-sm text-ink-muted">{formatMoney(product.oldPriceKopecks)}</del> : null}
            {discount ? <Badge tone="sale-soft">−{discount}%</Badge> : null}
          </div>
          <AddToCartButton
            full
            compact
            size="sm"
            inStock={!soldOut}
            maxQty={product.stockQty ?? 99}
            item={{ id: product.id, slug: product.slug, name: product.name, priceKopecks: product.priceKopecks, image }}
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="vysota-product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
