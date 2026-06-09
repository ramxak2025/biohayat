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
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-surface-soft ring-1 ring-line">
          <ShoppingBag className="h-9 w-9 text-ink-faint" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">Корзина пуста</h1>
        <p className="mt-2 text-ink-muted">Добавьте товары из каталога, чтобы оформить заказ.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/catalog">Перейти в каталог</Link>
        </Button>
      </Container>
    );
  }

  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Container className="py-6 sm:py-8">
      <div className="mb-5 flex items-baseline gap-3 sm:mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Корзина</h1>
        <span className="tnum text-sm font-semibold text-ink-faint">
          {totalQty} {pluralItems(totalQty)}
        </span>
      </div>

      {/* На мобайле — колонка с прилипающим внизу итогом, на десктопе — две колонки */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="space-y-3">
          {items.map((i) => (
            <div
              key={i.id}
              className="flex gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line sm:p-4"
            >
              <Link href={`/product/${i.slug}`} className="shrink-0">
                <SmartImage
                  src={i.image}
                  alt={i.name}
                  ratio="1/1"
                  className="w-16 ring-1 ring-line sm:w-18"
                  rounded="rounded-xl"
                  sizes="72px"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/product/${i.slug}`}
                    className="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand-700 sm:text-[15px]"
                  >
                    {i.name}
                  </Link>
                  <button
                    onClick={() => remove(i.id)}
                    className="-m-1 shrink-0 rounded-lg p-1 text-ink-faint transition hover:text-danger"
                    aria-label={`Удалить «${i.name}»`}
                  >
                    <Trash2 className="h-4.5 w-4.5" aria-hidden />
                  </button>
                </div>
                <span className="tnum mt-0.5 text-xs text-ink-faint">
                  {formatMoney(i.priceKopecks)} / шт
                </span>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  {/* степпер количества в капсуле */}
                  <div className="inline-flex items-center rounded-full bg-surface p-0.5 ring-1 ring-line">
                    <button
                      onClick={() => setQty(i.id, i.qty - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-soft hover:text-ink"
                      aria-label="Уменьшить количество"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="tnum min-w-7 text-center text-sm font-bold">{i.qty}</span>
                    <button
                      onClick={() => setQty(i.id, i.qty + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-xs transition hover:bg-brand-600"
                      aria-label="Увеличить количество"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <span className="tnum font-extrabold">
                    {formatMoney(i.priceKopecks * i.qty)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* итог: на мобайле прилипает к низу экрана над нижним меню */}
        <aside
          className="sticky bottom-[calc(var(--spacing-mobnav)+max(10px,env(safe-area-inset-bottom))+10px)] z-10 h-fit rounded-2xl bg-surface/95 p-4 shadow-md ring-1 ring-line backdrop-blur sm:p-5 lg:bottom-auto lg:top-24 lg:bg-surface lg:shadow-none lg:backdrop-blur-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              Товары <span className="tnum">({totalQty})</span>
            </span>
            <span className="tnum text-sm font-semibold">{formatMoney(totalKopecks)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold">Сумма</span>
            <span className="tnum text-xl font-extrabold">{formatMoney(totalKopecks)}</span>
          </div>
          <Button asChild size="lg" className="mt-4 w-full">
            <Link href="/checkout">
              Оформить заказ <ArrowRight className="h-5 w-5" aria-hidden />
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

function pluralItems(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "товара";
  return "товаров";
}
