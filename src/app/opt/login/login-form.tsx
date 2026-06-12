"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { PhoneInput } from "@/components/account/phone-input";
import { loginAction, type B2BFormState } from "../auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Вход…" : "Войти"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<B2BFormState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </div>
      ) : null}
      <div>
        <Label htmlFor="phone" required>Телефон</Label>
        <PhoneInput id="phone" name="phone" autoComplete="tel" required />
      </div>
      <div>
        <Label htmlFor="password" required>Пароль</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>
      <SubmitButton />
    </form>
  );
}
