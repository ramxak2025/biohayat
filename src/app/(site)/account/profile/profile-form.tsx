"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Input, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { updateProfile, type ProfileState } from "../actions";
import type { Customer } from "@prisma/client";

const init: ProfileState = {};

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>;
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action] = useActionState(updateProfile, init);
  useEffect(() => {
    if (state.ok) toast.success("Профиль обновлён");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="max-w-lg space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <div>
        <Label htmlFor="phone">Телефон</Label>
        <Input id="phone" value={customer.phone} disabled />
        <p className="mt-1 text-xs text-ink-faint">Телефон — логин, его нельзя изменить.</p>
      </div>
      <div>
        <Label htmlFor="name" required>Имя</Label>
        <Input id="name" name="name" defaultValue={customer.name} />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} />
      </div>
      <div>
        <Label htmlFor="city">Город</Label>
        <Input id="city" name="city" defaultValue={customer.city ?? ""} />
      </div>
      <Save />
    </form>
  );
}
