"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClipboardList, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { useB2BCart } from "@/components/opt/b2b-cart-provider";
import {
  pluralPositions,
  unitPriceForQty,
  type PriceItem,
} from "@/components/opt/price-math";
import { NextTierHint, PriceStepper } from "@/components/opt/price-stepper";
import { submitWholesaleRequest } from "@/app/opt/(cabinet)/actions";

/** Заявка: проверка состава, комментарий менеджеру, отправка. */
export function RequestForm({ items }: { items: PriceItem[] }) {
  const cart = useB2BCart();
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [doneNumber, setDoneNumber] = useState<number | null>(null);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  // Позиции корзины, существующие в актуальном прайсе (снятые с опта — пропадают).
  const rows = useMemo(
    () =>
      cart.items.flatMap((ci) => {
        const item = byId.get(ci.productId);
        return item ? [{ item, qty: ci.qty }] : [];
      }),
    [cart.items, byId],
  );

  const totals = useMemo(() => {
    let units = 0;
    let total = 0;
    let retailTotal = 0;
    for (const r of rows) {
      units += r.qty;
      total += unitPriceForQty(r.item.retailKopecks, r.item.tiers, r.qty) * r.qty;
      retailTotal += r.item.retailKopecks * r.qty;
    }
    const saving = retailTotal - total;
    const savingPct = retailTotal > 0 ? Math.round((saving / retailTotal) * 100) : 0;
    return { units, total, saving, savingPct };
  }, [rows]);

  const submit = () => {
    startTransition(async () => {
      const result = await submitWholesaleRequest({
        items: rows.map((r) => ({ productId: r.item.id, qty: r.qty })),
        comment: comment.trim() || undefined,
      });
      if (result.ok) {
        cart.clear();
        setDoneNumber(result.number);
      } else {
        toast.error(result.error);
      }
    });
  };

  // ── Экран успеха ──
  if (doneNumber !== null) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-line">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-9 w-9 text-brand-500" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Заявка №{doneNumber} принята</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          Менеджер свяжется с вами в рабочее время, согласует наличие и выставит счёт.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/opt/price">К прайсу</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/opt/orders">Мои заявки</Link>
          </Button>
        </div>
      </div>
    );
  }

  // До чтения localStorage не знаем состав — не мигаем «пустой» заявкой.
  if (!cart.ready) return null;

  // ── Пустая заявка ──
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-14 text-center ring-1 ring-line">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft">
          <ClipboardList className="h-8 w-8 text-ink-faint" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Заявка пуста</h1>
        <p className="mt-2 text-ink-muted">
          Выберите товары и количество в прайс-листе — мы посчитаем оптовые цены.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/opt/price">Открыть прайс</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/opt/price"
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> К прайсу
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Оптовая заявка</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Проверьте состав — цены за штуку пересчитываются по лесенке от количества.
      </p>

      {/* Позиции */}
      <div className="mt-5 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
        {rows.map(({ item, qty }) => {
          const unit = unitPriceForQty(item.retailKopecks, item.tiers, qty);
          return (
            <div key={item.id} className="flex gap-3 p-4">
              <SmartImage
                src={item.image}
                alt={item.name}
                label={item.name}
                ratio="1/1"
                rounded="rounded-lg"
                sizes="56px"
                className="w-14 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-5">{item.name}</div>
                    {item.volume ? (
                      <div className="text-xs text-ink-faint">{item.volume}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить позицию"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-soft hover:text-danger"
                    onClick={() => cart.remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <PriceStepper qty={qty} onChange={(q) => cart.setQty(item.id, q)} />
                  <div className="text-right">
                    <div className="tnum text-[11px] leading-4 text-ink-muted">
                      {formatMoney(unit)}/шт
                      <span className="ml-1.5 text-ink-faint line-through">
                        {formatMoney(item.retailKopecks)}
                      </span>
                    </div>
                    <div key={unit * qty} className="tnum animate-fade-up text-base font-extrabold">
                      {formatMoney(unit * qty)}
                    </div>
                  </div>
                </div>
                <NextTierHint
                  retailKopecks={item.retailKopecks}
                  tiers={item.tiers}
                  qty={qty}
                  className="mt-2 max-w-xs"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Итог */}
      <div className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>{pluralPositions(rows.length)} · {totals.units} шт</span>
          <span className="tnum">{formatMoney(totals.total)}</span>
        </div>
        {totals.saving > 0 ? (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-muted">Экономия против розницы</span>
            <span className="tnum font-semibold text-brand-700">
              −{formatMoney(totals.saving)} (−{totals.savingPct}%)
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="font-bold">Итого</span>
          <span className="tnum text-xl font-extrabold">{formatMoney(totals.total)}</span>
        </div>
      </div>

      {/* Комментарий менеджеру */}
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold">Комментарий менеджеру</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Объёмы и регулярность закупок, регион доставки, удобное время для звонка…"
          className="w-full resize-y rounded-xl bg-surface p-3.5 text-sm ring-1 ring-line outline-none transition placeholder:text-ink-faint focus:ring-2 focus:ring-brand-400"
        />
      </label>

      <Button size="lg" className="mt-4 w-full sm:w-auto" disabled={pending} onClick={submit}>
        <Send className="h-4 w-4" />
        {pending ? "Отправляем…" : "Отправить заявку менеджеру"}
      </Button>
      <p className="mt-2 text-xs text-ink-faint">
        Заявка ни к чему не обязывает: менеджер уточнит наличие, доставку и выставит счёт.
      </p>
    </div>
  );
}
