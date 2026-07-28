"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Input, Label, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Тексты ошибок входа/регистрации по кодам из адресной строки. */
const ERRORS: Record<string, string> = {
  invalid_credentials: "Неверный телефон или пароль",
  invalid_phone: "Некорректный номер телефона",
  weak_password: "Пароль не короче 6 символов",
  phone_taken: "Пользователь с таким телефоном уже зарегистрирован",
  no_name: "Укажите имя",
  no_consent: "Необходимо согласие на обработку персональных данных",
};

export interface AuthFormsProps {
  /** Какая вкладка открыта изначально (после ошибки регистрации — «Регистрация»). */
  defaultTab?: "login" | "register";
  /** Код ошибки предыдущей попытки. */
  error?: string;
}

export function AuthForms({ defaultTab = "login", error }: AuthFormsProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  // Ошибку показываем только на той вкладке, с которой её вернули.
  const message = error ? (ERRORS[error] ?? "Не удалось выполнить вход") : null;
  const showError = message && tab === defaultTab;

  return (
    <Container className="py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-8">
        <h1 className="text-center text-2xl font-extrabold">Личный кабинет</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">
          Заказы, избранное, трекер приёма и консультации
        </p>

        <div className="mx-auto mt-5 flex w-full rounded-full bg-surface-soft p-1">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition",
                tab === t ? "bg-brand-500 text-white shadow-sm" : "text-ink-muted",
              )}
            >
              {t === "login" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>

        {/*
          Обычные формы с method="post" — без серверных экшенов и клиентского
          состояния. Обработчики отвечают редиректом 303, поэтому браузер делает
          полноценный переход и всегда получает страницу, отрисованную с сессией.
        */}
        {tab === "login" ? (
          <AuthForm action="/account/login" submitLabel="Войти">
            {showError ? <Err>{message}</Err> : null}
            <div>
              <Label htmlFor="lphone" required>Телефон</Label>
              <Input id="lphone" name="phone" type="tel" required placeholder="+7 (___) ___-__-__" autoComplete="tel" />
            </div>
            <div>
              <Label htmlFor="lpass" required>Пароль</Label>
              <Input id="lpass" name="password" type="password" required autoComplete="current-password" />
            </div>
          </AuthForm>
        ) : (
          <AuthForm action="/account/register" submitLabel="Зарегистрироваться">
            {showError ? <Err>{message}</Err> : null}
            <div>
              <Label htmlFor="rname" required>Имя</Label>
              <Input id="rname" name="name" required placeholder="Как к вам обращаться" autoComplete="name" />
            </div>
            <div>
              <Label htmlFor="rphone" required>Телефон</Label>
              <Input id="rphone" name="phone" type="tel" required placeholder="+7 (___) ___-__-__" autoComplete="tel" />
            </div>
            <div>
              <Label htmlFor="remail">E-mail (необязательно)</Label>
              <Input id="remail" name="email" type="email" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="rpass" required>Пароль</Label>
              <Input id="rpass" name="password" type="password" required autoComplete="new-password" placeholder="не короче 6 символов" />
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
    </Container>
  );
}

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

function Err({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{children}</div>;
}
