"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { kopecksToRub } from "@/lib/utils";
import { updateSettings, testBitrix, type SettingsState } from "./actions";
import type { SiteSettings } from "@prisma/client";

const init: SettingsState = {};

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState(updateSettings, init);
  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const webhookRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("Настройки сохранены");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <Section title="Контакты">
        <Field label="Название сайта" name="siteName" def={settings.siteName} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Телефон" name="phone" def={settings.phone} />
          <Field label="E-mail" name="email" def={settings.email} />
        </div>
        <Field label="Адрес" name="address" def={settings.address} />
        <Field label="Режим работы" name="workingHours" def={settings.workingHours} />
      </Section>

      <Section title="Социальные сети">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telegram" name="telegram" def={settings.telegram} />
          <Field label="WhatsApp" name="whatsapp" def={settings.whatsapp} />
          <Field label="Instagram" name="instagram" def={settings.instagram} />
          <Field label="ВКонтакте" name="vk" def={settings.vk} />
          <Field label="Wildberries" name="wildberries" def={settings.wildberries} />
        </div>
      </Section>

      <Section title="Юридические реквизиты" hint="Используются в футере, оферте и микроразметке (152-ФЗ).">
        <Field label="Юр. наименование" name="legalName" def={settings.legalName} placeholder="ООО «...»" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ИНН" name="inn" def={settings.inn} />
          <Field label="ОГРН" name="ogrn" def={settings.ogrn} />
        </div>
        <Field label="Юридический адрес" name="legalAddress" def={settings.legalAddress} />
      </Section>

      <Section title="Доставка">
        <Field
          label="Бесплатная доставка от, ₽"
          name="freeDeliveryRub"
          type="number"
          def={String(kopecksToRub(settings.freeDeliveryThresholdKopecks))}
        />
      </Section>

      <Section title="Интеграция с Битрикс24" hint="Заявки с сайта будут создаваться лидами в CRM.">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <Checkbox name="bitrixEnabled" defaultChecked={settings.bitrixEnabled} /> Включить интеграцию
        </label>
        <div>
          <Label htmlFor="bitrixWebhookUrl">URL входящего вебхука</Label>
          <Input
            id="bitrixWebhookUrl"
            name="bitrixWebhookUrl"
            ref={webhookRef}
            defaultValue={settings.bitrixWebhookUrl ?? ""}
            placeholder="https://portal.bitrix24.ru/rest/1/xxxxxxxx/"
          />
          <p className="mt-1 text-xs text-ink-faint">
            Битрикс24 → Разработчикам → Другое → Входящий вебхук → права crm.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={testing}
            onClick={() =>
              startTest(async () => {
                const r = await testBitrix(webhookRef.current?.value || "");
                setTestResult(r);
              })
            }
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Проверить подключение
          </Button>
          {testResult ? (
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${testResult.ok ? "text-brand-700" : "text-danger"}`}>
              {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </span>
          ) : null}
        </div>
        <Field label="ID ответственного за лиды (опц.)" name="bitrixResponsibleId" def={settings.bitrixResponsibleId} />
        <div>
          <Label htmlFor="bitrixChatCode">Код виджета онлайн-чата (Открытые линии)</Label>
          <Textarea
            id="bitrixChatCode"
            name="bitrixChatCode"
            rows={4}
            defaultValue={settings.bitrixChatCode ?? ""}
            placeholder="<script>(function(w,d,u){...})(...);</script>"
          />
          <p className="mt-1 text-xs text-ink-faint">Виджет появится на сайте при включённой интеграции.</p>
        </div>
      </Section>

      <Section title="SEO по умолчанию">
        <Field label="Шаблон заголовка" name="titleTemplate" def={settings.titleTemplate} placeholder="%s — ХАЯТ" />
        <Field label="Meta Title (главная)" name="defaultMetaTitle" def={settings.defaultMetaTitle} />
        <div>
          <Label htmlFor="defaultMetaDescription">Meta Description (главная)</Label>
          <Textarea id="defaultMetaDescription" name="defaultMetaDescription" defaultValue={settings.defaultMetaDescription} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Яндекс.Вебмастер (verification)" name="yandexVerification" def={settings.yandexVerification} />
          <Field label="Google (verification)" name="googleVerification" def={settings.googleVerification} />
        </div>
        <Field label="ID Яндекс.Метрики" name="yandexMetrikaId" def={settings.yandexMetrikaId} placeholder="12345678" />
      </Section>

      <Section title="Юридический дисклеймер БАД">
        <Textarea name="badDisclaimer" rows={2} defaultValue={settings.badDisclaimer} />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <div className="rounded-full bg-surface p-1.5 shadow-lg ring-1 ring-line">
          <SubmitButton>Сохранить настройки</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  name,
  def,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  def?: string | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={def ?? ""} placeholder={placeholder} />
    </div>
  );
}
