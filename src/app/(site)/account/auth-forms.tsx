"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Container } from "@/components/ui/container";
import { Input, Label, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/account/phone-input";
import { cn } from "@/lib/utils";
import { loginAction, registerAction, type AuthState } from "./actions";

const init: AuthState = {};

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Подождите…" : children}
    </Button>
  );
}

export function AuthForms() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginState, loginFn] = useActionState(loginAction, init);
  const [regState, regFn] = useActionState(registerAction, init);

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

        {tab === "login" ? (
          <form action={loginFn} className="mt-6 space-y-4">
            {loginState.error ? <Err>{loginState.error}</Err> : null}
            <div>
              <Label htmlFor="lphone" required>Телефон</Label>
              <PhoneInput id="lphone" name="phone" autoComplete="tel" />
            </div>
            <div>
              <Label htmlFor="lpass" required>Пароль</Label>
              <Input id="lpass" name="password" type="password" autoComplete="current-password" />
            </div>
            <Submit>Войти</Submit>
          </form>
        ) : (
          <form action={regFn} className="mt-6 space-y-4">
            {regState.error ? <Err>{regState.error}</Err> : null}
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
            <Submit>Зарегистрироваться</Submit>
          </form>
        )}
      </div>
    </Container>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{children}</div>;
}
