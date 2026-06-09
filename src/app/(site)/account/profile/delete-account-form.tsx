"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { Input, Label, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteAccount, type DeleteAccountState } from "../actions";

const init: DeleteAccountState = {};

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Удаляем…</> : "Удалить аккаунт навсегда"}
    </Button>
  );
}

/** Удаление аккаунта по запросу покупателя (152-ФЗ). */
export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteAccount, init);

  return (
    <div className="max-w-lg rounded-2xl bg-surface p-5 ring-1 ring-danger/30">
      <h2 className="flex items-center gap-2 font-bold text-danger">
        <TriangleAlert className="h-5 w-5" /> Удаление аккаунта
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Аккаунт будет деактивирован, персональные данные (телефон, имя, e-mail, город) — удалены,
        избранное и курсы приёма — стёрты. Действие необратимо (152-ФЗ «О персональных данных»).
      </p>

      {!open ? (
        <Button type="button" variant="outline" className="mt-4 text-danger" onClick={() => setOpen(true)}>
          Удалить аккаунт
        </Button>
      ) : (
        <form action={action} className="mt-4 space-y-4">
          {state.error ? (
            <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{state.error}</div>
          ) : null}
          <div>
            <Label htmlFor="deletePassword" required>Пароль для подтверждения</Label>
            <Input id="deletePassword" name="password" type="password" autoComplete="current-password" />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-muted">
            <Checkbox name="confirm" className="mt-0.5" />
            <span>Я понимаю, что аккаунт и мои данные будут удалены безвозвратно.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <ConfirmButton />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </form>
      )}
    </div>
  );
}
