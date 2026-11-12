"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { VysotaPhoto } from "@/components/site/vysota-photo";
import { Logo } from "@/components/site/logo";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Вход…" : "Войти"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  const params = useSearchParams();

  return (
    <div className="vysota-hero flex min-h-dvh items-center justify-center px-4 py-8">
      <VysotaPhoto scene="osnova" primary />
      <div className="w-full max-w-sm rounded-[var(--r-xl)] border border-line bg-mist p-8 text-ink">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-xl font-medium">Личный кабинет</h1>
            <p className="text-sm text-ink-muted">Панель управления сайтом</p>
          </div>
        </div>
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={params.get("next") || "/admin"} />
          {state?.error ? (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {state.error}
            </div>
          ) : null}
          <div>
            <Label htmlFor="email" required>E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="username"  />
          </div>
          <div>
            <Label htmlFor="password" required>Пароль</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" />
          </div>
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
