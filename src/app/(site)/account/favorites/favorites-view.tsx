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

export function FavoritesView() {
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

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
        <Heart className="h-7 w-7 text-sale" /> Избранное
      </h1>

      {ready && !loading && products.length === 0 ? (
        <div className="rounded-2xl bg-surface-soft py-16 text-center">
          <p className="text-ink-muted">В избранном пока пусто.</p>
          <p className="mt-1 text-sm text-ink-faint">Нажимайте на сердечко на карточке товара, чтобы сохранить его сюда.</p>
          <Button asChild size="lg" className="mt-5"><Link href="/catalog">В каталог</Link></Button>
        </div>
      ) : loading ? (
        <p className="text-ink-muted">Загрузка…</p>
      ) : (
        <ProductGrid products={products} />
      )}
    </Container>
  );
}
