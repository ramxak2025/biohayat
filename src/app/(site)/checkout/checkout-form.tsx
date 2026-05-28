"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/utils";
import { submitOrder, type OrderActionState } from "@/app/actions/order";

const initial: OrderActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Отправляем…" : "Отправить заявку"}
      {!pending && <ArrowRight className="h-5 w-5" />}
    </Button>
  );
}

export function CheckoutForm() {
  const { items, totalKopecks, clear, ready } = useCart();
  const [state, formAction] = useActionState(submitOrder, initial);
  const cleared = useRef(false);

  useEffect(() => {
    if (state.ok && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [state.ok, clear]);

  if (state.ok) {
    return (
      <Container className="py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-10 w-10 text-brand-500" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Заявка №{state.orderNumber} принята!</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          Спасибо за заказ. Наш менеджер свяжется с вами в ближайшее время для подтверждения
          деталей и доставки.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/catalog">Продолжить покупки</Link>
        </Button>
      </Container>
    );
  }

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-extrabold">Корзина пуста</h1>
        <Button asChild size="lg" className="mt-6">
          <Link href="/catalog">В каталог</Link>
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Оформление заказа</h1>
      <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items.map((i) => ({
              id: i.id,
              name: i.name,
              priceKopecks: i.priceKopecks,
              qty: i.qty,
            })),
          )}
        />

        <div className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
          {state.error ? (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {state.error}
            </div>
          ) : null}

          <div>
            <Label htmlFor="customerName" required>Ваше имя</Label>
            <Input id="customerName" name="customerName" placeholder="Иван Иванов" autoComplete="name" />
            <FieldError>{state.fieldErrors?.customerName}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone" required>Телефон</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+7 (___) ___-__-__" autoComplete="tel" />
              <FieldError>{state.fieldErrors?.phone}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="email@example.com" autoComplete="email" />
              <FieldError>{state.fieldErrors?.email}</FieldError>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Адрес доставки</Label>
            <Input id="address" name="address" placeholder="Город, улица, дом, квартира" autoComplete="street-address" />
            <FieldError>{state.fieldErrors?.address}</FieldError>
          </div>

          <div>
            <Label htmlFor="comment">Комментарий к заказу</Label>
            <Textarea id="comment" name="comment" placeholder="Удобное время, пожелания…" />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
            <Checkbox name="consent" className="mt-0.5" />
            <span>
              Я согласен на обработку персональных данных в соответствии с{" "}
              <Link href="/privacy-policy" className="text-brand-700 underline" target="_blank">
                Политикой конфиденциальности
              </Link>{" "}
              (152-ФЗ).
            </span>
          </label>
          <FieldError>{state.fieldErrors?.consent}</FieldError>
        </div>

        <aside className="h-fit space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Ваш заказ</h2>
          <ul className="space-y-2 border-y border-line py-3 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="text-ink-muted">
                  {i.name} <span className="text-ink-faint">× {i.qty}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatMoney(i.priceKopecks * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="font-bold">Итого</span>
            <span className="text-xl font-extrabold">{formatMoney(totalKopecks)}</span>
          </div>
          <SubmitButton />
          <p className="text-center text-xs text-ink-faint">
            Оплата при получении. Это заявка, а не предоплата.
          </p>
        </aside>
      </form>
    </Container>
  );
}
