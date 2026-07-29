"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ListLink as Link } from "@/components/ui/list-link";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2, ArrowRight, Loader2, Tag, X, MapPin, Plus, Package, User, MessageSquare, Coins,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { PhoneInput, isPhoneComplete } from "@/components/account/phone-input";
import { useCart } from "@/components/cart/cart-provider";
import { cn, formatMoney } from "@/lib/utils";
import { submitOrder, validatePromo, type OrderActionState } from "@/app/actions/order";

export interface SavedAddress {
  id: string;
  label: string | null;
  city: string;
  street: string;
  isDefault: boolean;
}

const initial: OrderActionState = { ok: false };

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" /> Отправляем…
        </>
      ) : (
        <>
          Отправить заявку <ArrowRight className="h-5 w-5" />
        </>
      )}
    </Button>
  );
}

/** Секция-карточка формы оформления. */
function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Экран успешного оформления заказа. */
function SuccessScreen({ orderNumber, loggedIn }: { orderNumber?: number; loggedIn: boolean }) {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-10 w-10 text-brand-500" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
          Заказ №{orderNumber} оформлен!
        </h1>
        <p className="mt-3 text-ink-muted">
          Спасибо за заказ. Мы уже получили вашу заявку.
        </p>

        <div className="mt-6 rounded-2xl bg-surface p-5 text-left ring-1 ring-line">
          <h2 className="font-bold">Что дальше?</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-ink-muted">
            <li className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">1</span>
              Менеджер свяжется с вами в ближайшее время для подтверждения заказа.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">2</span>
              Согласуем удобный способ и время доставки.
            </li>
            <li className="flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">3</span>
              Оплата — при получении. Предоплата не требуется.
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/catalog">В каталог</Link>
          </Button>
          {loggedIn ? (
            <Button asChild size="lg" variant="outline">
              <Link href="/account/orders">
                <Package className="h-5 w-5" /> Мои заказы
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Container>
  );
}

export function CheckoutForm({
  loggedIn,
  addresses,
  defaults,
  bonusBalanceKopecks = 0,
}: {
  loggedIn: boolean;
  addresses: SavedAddress[];
  defaults: { name?: string; phone?: string; email?: string };
  bonusBalanceKopecks?: number;
}) {
  const { items, totalKopecks, clear, ready } = useCart();
  const [state, formAction] = useActionState(submitOrder, initial);
  const cleared = useRef(false);

  // ── live-валидация полей до отправки ──
  const [name, setName] = useState(defaults.name ?? "");
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [email, setEmail] = useState(defaults.email ?? "");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const clientErrors: Record<string, string | undefined> = {
    customerName: name.trim().length < 2 ? "Укажите имя" : undefined,
    phone: !isPhoneComplete(phone) ? "Укажите телефон полностью" : undefined,
    email: email && !EMAIL_RE.test(email) ? "Некорректный e-mail" : undefined,
    consent: !consent ? "Необходимо согласие на обработку персональных данных" : undefined,
  };
  const fieldError = (field: string) =>
    (touched[field] ? clientErrors[field] : undefined) ?? state.fieldErrors?.[field];
  const markTouched = (field: string) => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  // ── промокод ──
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discountKopecks: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromo] = useTransition();

  function applyPromo() {
    const code = promoInput.trim();
    if (!code || promoPending) return;
    startPromo(async () => {
      const res = await validatePromo(code, totalKopecks);
      if (res.ok) {
        setPromo({ code: res.code, discountKopecks: res.discountKopecks });
        setPromoError(null);
      } else {
        setPromo(null);
        setPromoError(res.error);
      }
    });
  }

  // ── бонусные баллы (1 балл = 1 копейка; вводим в рублях) ──
  const [bonusInput, setBonusInput] = useState("");

  // ── сохранённые адреса ──
  const defaultAddressId = addresses[0]?.id ?? "new";
  const [addressId, setAddressId] = useState<string>(defaultAddressId);
  const [newAddress, setNewAddress] = useState("");
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? null;
  const addressValue = selectedAddress
    ? `${selectedAddress.city}, ${selectedAddress.street}`
    : newAddress;

  useEffect(() => {
    if (state.ok && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [state.ok, clear]);

  if (state.ok) {
    return <SuccessScreen orderNumber={state.orderNumber} loggedIn={loggedIn} />;
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

  const discountKopecks = promo ? Math.min(promo.discountKopecks, totalKopecks) : 0;
  const afterPromoKopecks = Math.max(0, totalKopecks - discountKopecks);

  // Списание бонусов: не больше баланса и не больше 20% суммы после промокода.
  // Сервер всё равно перепроверит и обрежет (submitOrder).
  const showBonus = loggedIn && bonusBalanceKopecks > 0;
  const maxBonusKopecks = showBonus
    ? Math.min(bonusBalanceKopecks, Math.floor(afterPromoKopecks / 5))
    : 0;
  const requestedBonusKopecks = Math.round((Number(bonusInput.replace(",", ".")) || 0) * 100);
  const bonusSpendKopecks = Math.min(Math.max(0, requestedBonusKopecks), maxBonusKopecks);

  const finalKopecks = Math.max(0, afterPromoKopecks - bonusSpendKopecks);

  return (
    <Container className="py-6 sm:py-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Оформление заказа</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Шаг 1 из 1 — менеджер подтвердит заказ по телефону
        </p>
      </div>
      <form
        action={formAction}
        onSubmit={(e) => {
          // блокируем отправку, если live-валидация нашла ошибки
          if (Object.values(clientErrors).some(Boolean)) {
            e.preventDefault();
            setTouched({ customerName: true, phone: true, email: true, consent: true });
          }
        }}
        className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6"
      >
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
        {promo ? <input type="hidden" name="promoCode" value={promo.code} /> : null}
        {bonusSpendKopecks > 0 ? (
          <input type="hidden" name="bonusSpend" value={bonusSpendKopecks} />
        ) : null}
        <input type="hidden" name="address" value={addressValue} />

        <div className="space-y-4">
          {state.error ? (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {state.error}
            </div>
          ) : null}

          {/* ── Получатель ── */}
          <FormSection title="Получатель" icon={<User className="h-4 w-4" aria-hidden />}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName" required>Ваше имя</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  placeholder="Иван Иванов"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched("customerName")}
                  aria-invalid={Boolean(fieldError("customerName"))}
                />
                <FieldError>{fieldError("customerName")}</FieldError>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone" required>Телефон</Label>
                  <PhoneInput
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    defaultValue={defaults.phone}
                    onValueChange={setPhone}
                    onBlur={() => markTouched("phone")}
                    aria-invalid={Boolean(fieldError("phone"))}
                  />
                  <FieldError>{fieldError("phone")}</FieldError>
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched("email")}
                    aria-invalid={Boolean(fieldError("email"))}
                  />
                  <FieldError>{fieldError("email")}</FieldError>
                </div>
              </div>
            </div>
          </FormSection>

          {/* ── Доставка ── */}
          <FormSection title="Доставка" icon={<MapPin className="h-4 w-4" aria-hidden />}>
            <Label htmlFor="address">Адрес доставки</Label>

            {loggedIn && addresses.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAddressId(a.id)}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition",
                      addressId === a.id
                        ? "bg-brand-500 text-white ring-brand-500"
                        : "bg-surface text-ink-muted ring-line-strong hover:bg-surface-soft",
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{a.label || `${a.city}, ${a.street}`}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAddressId("new")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition",
                    addressId === "new"
                      ? "bg-brand-500 text-white ring-brand-500"
                      : "bg-surface text-ink-muted ring-line-strong hover:bg-surface-soft",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Новый адрес
                </button>
              </div>
            ) : null}

            {selectedAddress ? (
              <p className="rounded-xl bg-surface-soft px-4 py-2.5 text-sm text-ink-muted">
                {selectedAddress.city}, {selectedAddress.street}
              </p>
            ) : (
              <>
                <Input
                  id="address"
                  placeholder="Город, улица, дом, квартира"
                  autoComplete="street-address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
                {loggedIn ? (
                  <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-ink-muted">
                    <Checkbox name="saveAddress" />
                    Сохранить адрес в личном кабинете
                  </label>
                ) : null}
              </>
            )}
            <FieldError>{state.fieldErrors?.address}</FieldError>
          </FormSection>

          {/* ── Комментарий ── */}
          <FormSection title="Комментарий" icon={<MessageSquare className="h-4 w-4" aria-hidden />}>
            <Label htmlFor="comment">Комментарий к заказу</Label>
            <Textarea id="comment" name="comment" placeholder="Удобное время, пожелания…" />

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
              <Checkbox
                name="consent"
                className="mt-0.5"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  markTouched("consent");
                }}
              />
              <span>
                Я согласен на обработку персональных данных в соответствии с{" "}
                <Link href="/privacy-policy" className="text-brand-700 underline" target="_blank">
                  Политикой конфиденциальности
                </Link>{" "}
                (152-ФЗ).
              </span>
            </label>
            <FieldError>{fieldError("consent")}</FieldError>
          </FormSection>

          {/* ── Промокод ── */}
          <FormSection title="Промокод" icon={<Tag className="h-4 w-4" aria-hidden />}>
            <Label htmlFor="promo" className="sr-only">Промокод</Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                  <Tag className="h-4 w-4" /> {promo.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPromo(null);
                    setPromoInput("");
                    setPromoError(null);
                  }}
                  className="text-brand-700/70 transition hover:text-brand-700"
                  aria-label="Убрать промокод"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="promo"
                  placeholder="Например, HAYAT10"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyPromo();
                    }
                  }}
                  className="uppercase placeholder:normal-case"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyPromo}
                  disabled={promoPending || !promoInput.trim()}
                  className="shrink-0"
                >
                  {promoPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
                </Button>
              </div>
            )}
            <FieldError>{promoError ?? state.fieldErrors?.promoCode}</FieldError>
          </FormSection>

          {/* ── Бонусные баллы (только для залогиненных с балансом) ── */}
          {showBonus ? (
            <FormSection title="Списать баллы" icon={<Coins className="h-4 w-4" aria-hidden />}>
              <p className="text-sm text-ink-muted">
                У вас <span className="tnum font-bold text-ink">{formatMoney(bonusBalanceKopecks)}</span> бонусов.
                Можно оплатить до 20% заказа — сейчас это{" "}
                <span className="tnum font-semibold">{formatMoney(maxBonusKopecks)}</span>.
              </p>
              <div className="mt-3 flex gap-2">
                <Label htmlFor="bonusSpendRub" className="sr-only">Сумма списания, ₽</Label>
                <Input
                  id="bonusSpendRub"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={maxBonusKopecks / 100}
                  step="0.01"
                  placeholder="0"
                  value={bonusInput}
                  onChange={(e) => setBonusInput(e.target.value)}
                  onBlur={() => {
                    // Приводим к фактически применяемой сумме (clamp по максимуму).
                    setBonusInput(bonusSpendKopecks > 0 ? String(bonusSpendKopecks / 100) : "");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={maxBonusKopecks <= 0}
                  onClick={() => setBonusInput(String(maxBonusKopecks / 100))}
                  className="shrink-0"
                >
                  Списать максимум
                </Button>
              </div>
              {bonusSpendKopecks > 0 ? (
                <p className="mt-2 text-xs text-ink-faint">
                  Спишем <span className="tnum font-semibold text-brand-700">{formatMoney(bonusSpendKopecks)}</span> при оформлении заказа.
                </p>
              ) : null}
            </FormSection>
          ) : null}
        </div>

        {/* ── Ваш заказ ── */}
        <aside className="h-fit space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Package className="h-4 w-4" aria-hidden />
            </span>
            Ваш заказ
          </h2>
          <ul className="space-y-2 border-y border-line py-3 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="text-ink-muted">
                  {i.name} <span className="tnum text-ink-faint">× {i.qty}</span>
                </span>
                <span className="tnum shrink-0 font-semibold">{formatMoney(i.priceKopecks * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Товары</span>
              <span className="tnum font-semibold">{formatMoney(totalKopecks)}</span>
            </div>
            {discountKopecks > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Скидка по промокоду</span>
                <span className="tnum font-semibold text-brand-700">−{formatMoney(discountKopecks)}</span>
              </div>
            ) : null}
            {bonusSpendKopecks > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">Бонусы</span>
                <span className="tnum font-semibold text-brand-700">−{formatMoney(bonusSpendKopecks)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold">Итого</span>
              <span className="tnum text-xl font-extrabold">{formatMoney(finalKopecks)}</span>
            </div>
          </div>

          {/* на мобайле кнопка живёт в прилипающей панели ниже */}
          <div className="hidden lg:block">
            <SubmitButton />
          </div>
          <p className="hidden text-center text-xs text-ink-faint lg:block">
            Оплата при получении. Это заявка, а не предоплата.
          </p>
        </aside>

        {/* мобильная итоговая панель: прилипает к низу над нижним меню */}
        <div className="sticky bottom-[calc(var(--spacing-mobnav)+max(10px,env(safe-area-inset-bottom))+10px)] z-10 rounded-2xl bg-surface/95 p-4 shadow-md ring-1 ring-line backdrop-blur lg:hidden">
          {discountKopecks > 0 ? (
            <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
              <span>Скидка по промокоду</span>
              <span className="tnum font-semibold text-brand-700">−{formatMoney(discountKopecks)}</span>
            </div>
          ) : null}
          {bonusSpendKopecks > 0 ? (
            <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
              <span>Бонусы</span>
              <span className="tnum font-semibold text-brand-700">−{formatMoney(bonusSpendKopecks)}</span>
            </div>
          ) : null}
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold">Итого</span>
            <span className="tnum text-xl font-extrabold">{formatMoney(finalKopecks)}</span>
          </div>
          <SubmitButton />
          <p className="mt-2.5 text-center text-xs text-ink-faint">
            Оплата при получении. Это заявка, а не предоплата.
          </p>
        </div>
      </form>
    </Container>
  );
}
