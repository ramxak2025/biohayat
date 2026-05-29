"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Select, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { createRule, updateRule, type FormState } from "./actions";
import type { CompatibilityRule } from "@prisma/client";

const init: FormState = {};

// Русские метки типов совместимости
export const TYPE_LABELS: Record<CompatibilityRule["type"], string> = {
  SYNERGY: "Синергия",
  ANTAGONIST: "Нельзя вместе",
  CAUTION: "С осторожностью",
};

export function RuleForm({ rule }: { rule?: CompatibilityRule }) {
  const action = rule ? updateRule.bind(null, rule.id) : createRule;
  const [state, formAction] = useActionState(action, init);

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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="componentA" required>Компонент A</Label>
                <Input id="componentA" name="componentA" defaultValue={rule?.componentA} placeholder="Например: Кальций" />
                <FieldError>{state.fieldErrors?.componentA}</FieldError>
              </div>
              <div>
                <Label htmlFor="componentB" required>Компонент B</Label>
                <Input id="componentB" name="componentB" defaultValue={rule?.componentB} placeholder="Например: Железо" />
                <FieldError>{state.fieldErrors?.componentB}</FieldError>
              </div>
            </div>
            <div>
              <Label htmlFor="note">Пояснение</Label>
              <Textarea id="note" name="note" defaultValue={rule?.note ?? ""} placeholder="Чем обусловлена совместимость / несовместимость." />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="type" required>Тип совместимости</Label>
              <Select id="type" name="type" defaultValue={rule?.type ?? "SYNERGY"}>
                <option value="SYNERGY">{TYPE_LABELS.SYNERGY}</option>
                <option value="ANTAGONIST">{TYPE_LABELS.ANTAGONIST}</option>
                <option value="CAUTION">{TYPE_LABELS.CAUTION}</option>
              </Select>
              <FieldError>{state.fieldErrors?.type}</FieldError>
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={rule ? rule.isActive : true} /> Активно (видно в ЛК)
              </label>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{rule ? "Сохранить изменения" : "Создать правило"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/compatibility">Отмена</Link></Button>
      </div>
    </form>
  );
}
