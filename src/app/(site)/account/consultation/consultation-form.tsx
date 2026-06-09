"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Input, Textarea, Select, Label } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { submitConsultation, type ConsultationState } from "./actions";

const TOPICS = ["Подбор БАД", "Совместимость", "Похудение", "Иммунитет", "Другое"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
      {pending ? "Отправка…" : "Отправить заявку"}
    </Button>
  );
}

export function ConsultationForm({
  defaultName, defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const [state, action] = useActionState<ConsultationState, FormData>(submitConsultation, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Заявка отправлена! Мы скоро свяжемся с вами.");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-brand-50 p-6 ring-1 ring-brand-100">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
          <div>
            <p className="font-extrabold text-brand-800">Спасибо! Заявка принята.</p>
            <p className="mt-1 text-sm text-brand-700">
              Наш нутрициолог свяжется с вами по телефону {defaultPhone}. Заявка появилась в списке ниже.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="max-w-2xl space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <h2 className="font-bold">Заявка на консультацию</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Имя</Label>
          <Input id="name" name="name" defaultValue={defaultName} />
        </div>
        <div>
          <Label htmlFor="phone" required>Телефон</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaultPhone} />
        </div>
      </div>

      <div>
        <Label htmlFor="topic">Тема консультации</Label>
        <Select id="topic" name="topic" defaultValue={TOPICS[0]}>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="message" required>Ваш вопрос</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Опишите вашу задачу: какие БАД принимаете, цели, самочувствие…"
          className="min-h-[120px]"
        />
      </div>

      <Submit />
    </form>
  );
}
