"use client";

import { useState, useEffect } from "react";
import { ListLink as Link } from "@/components/ui/list-link";
import { Gift, Package, Heart, PillBottle, MessageCircleHeart } from "lucide-react";
import { VysotaPhoto } from "@/components/site/vysota-photo";
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
    <Container className="vysota-account-auth py-6 pb-[calc(var(--spacing-mobnav)+2.5rem)] lg:py-12">
      <section className="vysota-dark vysota-hero account-auth-intro">
        <VysotaPhoto scene="hero" primary />
        <div className="account-auth-intro-content">
          <h1>Личный кабинет</h1>
          <ul className="mt-6 hidden gap-3 lg:grid">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-mist">
                <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="rounded-[var(--r-xl)] border border-line bg-white p-5 sm:p-8">
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
                  tab === t ? "bg-ink text-mist" : "text-ink-muted hover:text-ink",
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
                  <Gift size={16} className="mr-1.5 inline align-text-bottom" aria-hidden="true" />Вы по приглашению друга — после первого заказа вы оба получите 300 ₽ бонусами.
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
                <Checkbox name="consent" required className="mt-0.5" />
                <input type="hidden" name="consentVersion" value="2026-10-22" />
                <span>
                  Даю отдельное <Link href="/personal-data-consent" target="_blank" className="text-brand-700 underline">согласие на обработку персональных данных</Link> для регистрации и работы личного кабинета.
                  {" "}<Link href="/privacy-policy" target="_blank" className="text-brand-700 underline">Политика обработки данных</Link>.
                </span>
              </label>
            </AuthForm>
          )}
      </div>
    </Container>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{children}</div>;
}
