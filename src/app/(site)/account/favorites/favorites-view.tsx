"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { getFavoriteProducts } from "@/app/actions/favorites";
import type { ProductCardData } from "@/lib/queries";

export function FavoritesView({ embedded = false }: { embedded?: boolean }) {
  const { ids, ready } = useFavorites();
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    getFavoriteProducts(ids).then((p) => {
      if (!cancelled) {
        setProducts(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // обновляем при изменении набора id
  }, [ids, ready]);

  const content = (
    <>
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Избранное</h1>

      {ready && !loading && products.length === 0 ? (
        <div className="rounded-2xl bg-surface py-16 text-center ring-1 ring-line">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sale-soft">
            <Heart className="h-8 w-8 text-sale" />
          </span>
          <p className="mt-4 font-semibold text-ink">В избранном пока пусто</p>
          <p className="mx-auto mt-1 max-w-sm px-4 text-sm text-ink-muted">
            Нажимайте на сердечко на карточке товара, чтобы сохранить его сюда.
          </p>
          <Button asChild size="lg" className="mt-5"><Link href="/catalog">В каталог</Link></Button>
        </div>
      ) : loading ? (
        <p className="text-ink-muted">Загрузка…</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </>
  );

  if (embedded) return <div>{content}</div>;
  return <Container className="py-6 pb-[calc(var(--spacing-mobnav)+2.5rem)] sm:py-8 lg:pb-12">{content}</Container>;
}
