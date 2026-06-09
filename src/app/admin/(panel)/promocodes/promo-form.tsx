"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, FieldError, Checkbox, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { kopecksToRub } from "@/lib/utils";
import { createPromoCode, updatePromoCode, type FormState } from "./actions";
import type { PromoCode } from "@prisma/client";

const init: FormState = {};

/** Дата для input[type=date] в формате YYYY-MM-DD. */
function toDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function PromoForm({ promo }: { promo?: PromoCode }) {
  const action = promo ? updatePromoCode.bind(null, promo.id) : createPromoCode;
  const [state, formAction] = useActionState(action, init);
  const [discountType, setDiscountType] = useState(promo?.discountType ?? "PERCENT");

  // PERCENT хранится как проценты, FIXED — в копейках (в форме показываем рубли)
  const defaultValue = promo
    ? promo.discountType === "FIXED"
      ? kopecksToRub(promo.value)
      : promo.value
    : "";

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="code" required>Код промокода</Label>
              <Input id="code" name="code" defaultValue={promo?.code} placeholder="Например: HAYAT10" />
              <p className="mt-1 text-xs text-ink-faint">Сохраняется в верхнем регистре.</p>
              <FieldError>{state.fieldErrors?.code}</FieldError>
            </div>
            <div>
              <Label htmlFor="description">Описание (для админки)</Label>
              <Textarea id="description" name="description" defaultValue={promo?.description ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discountType" required>Тип скидки</Label>
                <Select
                  id="discountType"
                  name="discountType"
                  defaultValue={promo?.discountType ?? "PERCENT"}
                  onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
                >
                  <option value="PERCENT">Процент от суммы</option>
                  <option value="FIXED">Фиксированная сумма</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="value" required>
                  {discountType === "PERCENT" ? "Скидка, %" : "Скидка, ₽"}
                </Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step={discountType === "PERCENT" ? "1" : "0.01"}
                  min="0"
                  defaultValue={defaultValue}
                  placeholder={discountType === "PERCENT" ? "10" : "500"}
                />
                <FieldError>{state.fieldErrors?.value}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="minOrderRub">Минимальная сумма заказа, ₽</Label>
              <Input
                id="minOrderRub"
                name="minOrderRub"
                type="number"
                step="0.01"
                min="0"
                defaultValue={promo ? kopecksToRub(promo.minOrderKopecks) : 0}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="usageLimit">Лимит использований</Label>
              <Input
                id="usageLimit"
                name="usageLimit"
                type="number"
                step="1"
                min="1"
                defaultValue={promo?.usageLimit ?? ""}
                placeholder="пусто — без лимита"
              />
              {promo ? (
                <p className="mt-1 text-xs text-ink-faint">Использовано: {promo.usedCount}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="expiresAt">Действует до</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={toDateInput(promo?.expiresAt)}
              />
              <p className="mt-1 text-xs text-ink-faint">Пусто — бессрочный.</p>
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={promo ? promo.isActive : true} /> Активен
              </label>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{promo ? "Сохранить изменения" : "Создать промокод"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/promocodes">Отмена</Link></Button>
      </div>
    </form>
  );
}
