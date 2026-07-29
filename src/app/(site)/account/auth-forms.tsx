"use client";

import { useState, useEffect } from "react";
import { ListLink as Link } from "@/components/ui/list-link";
import { Leaf, Package, Heart, PillBottle, MessageCircleHeart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Input, Label, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/account/phone-input";
import { cn } from "@/lib/utils";
import { getStoredReferral } from "@/components/site/referral-capture";

/** Тексты ошибок входа/регистрации по кодам из адресной строки. */
const ERRORS: Record<string, string> = {
  invalid_credentials: "Неверный телефон или пароль",
  invalid_phone: "Некорректный номер телефона",
  weak_password: "Пароль не короче 6 символов",
  phone_taken: "Пользователь с таким телефоном уже зарегистрирован",
  no_name: "Укажите имя",
  no_consent: "Необходимо согласие на обработку персональных данных",
  server: "Сейчас не получается войти — на сервере ошибка. Попробуйте позже.",
};

export interface AuthFormsProps {
  /** Какая вкладка открыта изначально (после ошибки регистрации — «Регистрация»). */
  defaultTab?: "login" | "register";
  /** Код ошибки предыдущей попытки. */
  error?: string;
  /** Через сколько минут можно повторить попытку (для error=rate_limit). */
  retryMin?: string;
}

const BENEFITS = [
  { icon: Package, text: "Заказы и трекинг доставки в одном месте" },
  { icon: Heart, text: "Избранные товары всегда под рукой" },
  { icon: PillBottle, text: "Трекер приёма БАД и календарь курсов" },
  { icon: MessageCircleHeart, text: "Личная консультация нутрициолога" },
];

/**
 * Обычная форма с защитой от двойной отправки.
 *
 * Блокировать кнопку нужно именно в onSubmit: если снимать её по onClick,
 * браузер отменяет отправку — кнопка становится disabled ещё до того, как
 * событие submit доходит до формы, и «Войти» вообще перестаёт работать.
 */
function AuthForm({
  action, submitLabel, children,
}: {
  action: string;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [sending, setSending] = useState(false);
  return (
    <form
      action={action}
      method="post"
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        if (sending) {
          e.preventDefault();
          return;
        }
        setSending(true);
      }}
    >
      {children}
      <Button type="submit" size="lg" className="w-full" disabled={sending}>
        {sending ? "Подождите…" : submitLabel}
      </Button>
    </form>
  );
}

export function AuthForms({ defaultTab = "login", error, retryMin }: AuthFormsProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  // Реферальный код из ссылки (?ref=) — подставляем в скрытое поле регистрации
  const [ref, setRef] = useState("");
  useEffect(() => {
    setRef(getStoredReferral());
  }, []);

  const message = error === "rate_limit"
    ? `Слишком много попыток, попробуйте через ${retryMin || "15"} мин`
    : error ? (ERRORS[error] ?? "Не удалось выполнить вход") : null;
  // Ошибку показываем только на той вкладке, с которой её вернули.
  const showError = message && tab === defaultTab;

  return (
    <Container className="py-8 pb-[calc(var(--spacing-mobnav)+2.5rem)] sm:py-12 lg:pb-12">
      <div className="mx-auto w-full max-w-md">
        {/* Экран-приветствие как в приложении */}
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">
            <Leaf className="h-8 w-8 text-brand-600" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Личный кабинет</h1>
          <p className="mt-1 text-ink-muted">Войдите, чтобы покупки стали удобнее</p>
        </div>

        {/* Буллиты выгод */}
        <ul className="mt-6 space-y-2.5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink">{text}</span>
            </li>
          ))}
        </ul>

        {/* Карточка с формами */}
        <div className="mt-6 rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
          <div
            role="tablist"
            aria-label="Вход или регистрация"
            className="flex w-full rounded-full bg-surface-soft p-1"
          >
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "min-h-11 flex-1 rounded-full py-2.5 text-sm font-semibold transition",
                  tab === t ? "bg-brand-500 text-white shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {t === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <AuthForm action="/account/login" submitLabel="Войти">
              {showError ? <Err>{message}</Err> : null}
              <div>
                <Label htmlFor="lphone" required>Телефон</Label>
                <PhoneInput id="lphone" name="phone" autoComplete="tel" />
              </div>
              <div>
                <Label htmlFor="lpass" required>Пароль</Label>
                <Input id="lpass" name="password" type="password" autoComplete="current-password" />
              </div>
            </AuthForm>
          ) : (
            <AuthForm action="/account/register" submitLabel="Зарегистрироваться">
              {showError ? <Err>{message}</Err> : null}
              <input type="hidden" name="ref" value={ref} />
              {ref ? (
                <div className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-700">
                  🎁 Вы по приглашению друга — после первого заказа вы оба получите 300 ₽ бонусами.
                </div>
              ) : null}
              <div>
                <Label htmlFor="rname" required>Имя</Label>
                <Input id="rname" name="name" placeholder="Как к вам обращаться" autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="rphone" required>Телефон</Label>
                <PhoneInput id="rphone" name="phone" autoComplete="tel" />
              </div>
              <div>
                <Label htmlFor="remail">E-mail (необязательно)</Label>
                <Input id="remail" name="email" type="email" autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="rpass" required>Пароль</Label>
                <Input id="rpass" name="password" type="password" autoComplete="new-password" placeholder="не короче 6 символов" />
              </div>
              <label className="flex items-start gap-2.5 text-sm text-ink-muted">
                <Checkbox name="consent" className="mt-0.5" />
                <span>
                  Согласен на обработку персональных данных согласно{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-brand-700 underline">Политике</Link>.
                </span>
              </label>
            </AuthForm>
          )}
        </div>
      </div>
    </Container>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{children}</div>;
}
