"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/utils";

export function CartView() {
  const { items, setQty, remove, totalKopecks, ready } = useCart();

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-soft">
          <ShoppingBag className="h-9 w-9 text-ink-faint" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">Корзина пуста</h1>
        <p className="mt-2 text-ink-muted">Добавьте товары из каталога, чтобы оформить заказ.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/catalog">Перейти в каталог</Link>
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Корзина</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line sm:gap-4 sm:p-4"
            >
              <Link href={`/product/${i.slug}`} className="shrink-0">
                <SmartImage src={i.image} alt={i.name} ratio="1/1" className="w-20 sm:w-24" rounded="rounded-xl" />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link href={`/product/${i.slug}`} className="font-semibold leading-tight hover:text-brand-700">
                  {i.name}
                </Link>
                <span className="mt-0.5 text-sm text-ink-muted">{formatMoney(i.priceKopecks)} / шт</span>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-surface-soft p-1">
                    <button
                      onClick={() => setQty(i.id, i.qty - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-xs hover:bg-brand-50"
                      aria-label="Уменьшить"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-7 text-center font-bold">{i.qty}</span>
                    <button
                      onClick={() => setQty(i.id, i.qty + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-xs hover:bg-brand-600"
                      aria-label="Увеличить"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold">{formatMoney(i.priceKopecks * i.qty)}</span>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-ink-faint transition hover:text-danger"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Итого</h2>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="text-ink-muted">Товары ({items.reduce((s, i) => s + i.qty, 0)})</span>
            <span className="text-xl font-extrabold">{formatMoney(totalKopecks)}</span>
          </div>
          <Button asChild size="lg" className="mt-5 w-full">
            <Link href="/checkout">
              Оформить заказ <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-3 text-center text-xs text-ink-faint">
            Оплата при получении. Менеджер свяжется для подтверждения.
          </p>
        </aside>
      </div>
    </Container>
  );
}
