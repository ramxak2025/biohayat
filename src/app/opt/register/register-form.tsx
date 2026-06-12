"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/account/phone-input";
import { registerAction, type B2BFormState } from "../auth-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" variant="accent" className="w-full" disabled={pending}>
      {pending ? "Отправляем…" : "Отправить заявку"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<B2BFormState, FormData>(registerAction, {});

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Контактное лицо</Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Имя и фамилия" required />
        </div>
        <div>
          <Label htmlFor="company">Компания или ИП (необязательно)</Label>
          <Input id="company" name="company" autoComplete="organization" placeholder="Если закупаете как частное лицо — оставьте пустым" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="inn">ИНН</Label>
          <Input id="inn" name="inn" inputMode="numeric" maxLength={12} placeholder="10 или 12 цифр" />
        </div>
        <div>
          <Label htmlFor="city">Город</Label>
          <Input id="city" name="city" autoComplete="address-level2" placeholder="Грозный" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            autoComplete="new-password"
            minLength={6}
            placeholder="Не короче 6 символов"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="comment">Что и в каких объёмах планируете продавать?</Label>
        <Textarea
          id="comment"
          name="comment"
          rows={3}
          placeholder="Например: аптека в Грозном, интересуют витамины и коллаген, ориентировочно 100–200 шт в месяц"
        />
        <p className="mt-1 text-xs text-ink-faint">
          Пара слов о вашем бизнесе поможет менеджеру быстрее одобрить заявку.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-muted">
        <Checkbox name="consent" value="1" required className="mt-0.5" />
        <span>
          Соглашаюсь на обработку персональных данных в соответствии с{" "}
          {/* Абсолютная ссылка на розничный сайт: на опт-хосте относительный
              путь переписался бы в несуществующий /opt/privacy-policy */}
          <a
            href={`${process.env.NEXT_PUBLIC_SITE_URL || "https://biohayat.ru"}/privacy-policy`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            политикой конфиденциальности
          </a>{" "}
          (152-ФЗ)
        </span>
      </label>

      <SubmitButton />
    </form>
  );
}
