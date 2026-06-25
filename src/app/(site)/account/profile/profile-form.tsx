"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Input, Label, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  updateProfile,
  changePassword,
  type ProfileState,
  type PasswordState,
} from "../actions";
import type { Customer } from "@prisma/client";

const initProfile: ProfileState = {};
const initPassword: PasswordState = {};

function Save() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>;
}

function SavePassword() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" disabled={pending}>{pending ? "Сохранение…" : "Сменить пароль"}</Button>;
}

/** Дата → строка YYYY-MM-DD для input type="date". */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action] = useActionState(updateProfile, initProfile);
  const [pwState, pwAction] = useActionState(changePassword, initPassword);

  // Локальные значения для расчёта полноты профиля «вживую».
  const [name, setName] = useState(customer.name ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [birthDate, setBirthDate] = useState(toDateInput(customer.birthDate));
  const [gender, setGender] = useState(customer.gender ?? "");

  useEffect(() => {
    if (state.ok) toast.success("Профиль обновлён");
    if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (pwState.ok) toast.success("Пароль изменён");
    if (pwState.error) toast.error(pwState.error);
  }, [pwState]);

  // Полнота профиля: телефон уже есть всегда, остальные 5 полей.
  const completeness = useMemo(() => {
    const fields = [Boolean(customer.phone), Boolean(name.trim()), Boolean(email.trim()), Boolean(city.trim()), Boolean(birthDate), Boolean(gender)];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [customer.phone, name, email, city, birthDate, gender]);

  return (
    <div className="max-w-lg space-y-6">
      {/* Полнота профиля */}
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Профиль заполнен на {completeness}%</span>
          {completeness === 100 ? (
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">Отлично!</span>
          ) : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${completeness}%` }} />
        </div>
        {completeness < 100 ? (
          <p className="mt-2 text-xs text-ink-faint">Заполните профиль полностью, чтобы мы могли подбирать рекомендации точнее.</p>
        ) : null}
      </div>

      {/* Основные данные */}
      <form action={action} className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div>
          <Label htmlFor="phone">Телефон</Label>
          <Input id="phone" value={customer.phone} disabled />
          <p className="mt-1 text-xs text-ink-faint">Телефон — логин, его нельзя изменить.</p>
        </div>
        <div>
          <Label htmlFor="name" required>Имя</Label>
          <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="city">Город</Label>
          <Input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="birthDate">Дата рождения</Label>
            <Input id="birthDate" name="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="gender">Пол</Label>
            <Select id="gender" name="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </Select>
          </div>
        </div>
        <Save />
      </form>

      {/* Смена пароля */}
      <form action={pwAction} className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <div>
          <h2 className="font-bold">Сменить пароль</h2>
          <p className="mt-0.5 text-sm text-ink-muted">Введите текущий и новый пароль.</p>
        </div>
        <div>
          <Label htmlFor="oldPassword" required>Текущий пароль</Label>
          <Input id="oldPassword" name="oldPassword" type="password" autoComplete="current-password" />
        </div>
        <div>
          <Label htmlFor="newPassword" required>Новый пароль</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
          <p className="mt-1 text-xs text-ink-faint">Не короче 6 символов.</p>
        </div>
        <SavePassword />
      </form>
    </div>
  );
}
