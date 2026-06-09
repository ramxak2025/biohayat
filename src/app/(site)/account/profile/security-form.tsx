"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { changePassword, type PasswordState } from "../actions";

const init: PasswordState = {};

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохранение…</> : "Сменить пароль"}
    </Button>
  );
}

/** Раздел «Безопасность»: смена пароля. */
export function SecurityForm() {
  const [state, action] = useActionState(changePassword, init);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Пароль изменён");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="max-w-lg space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <ShieldCheck className="h-5 w-5 text-brand-500" /> Безопасность
      </h2>
      {state.error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{state.error}</div>
      ) : null}
      <div>
        <Label htmlFor="currentPassword" required>Текущий пароль</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="newPassword" required>Новый пароль</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" placeholder="не короче 6 символов" />
        </div>
        <div>
          <Label htmlFor="newPassword2" required>Повторите новый пароль</Label>
          <Input id="newPassword2" name="newPassword2" type="password" autoComplete="new-password" />
        </div>
      </div>
      <Save />
    </form>
  );
}
