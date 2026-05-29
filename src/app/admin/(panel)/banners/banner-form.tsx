"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Select, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createBanner, updateBanner, type FormState } from "./actions";
import type { Banner } from "@prisma/client";

const init: FormState = {};

const PLACEMENTS: { value: Banner["placement"]; label: string }[] = [
  { value: "HERO", label: "Главный слайдер (HERO)" },
  { value: "HOME_STRIP", label: "Промо-полоса на главной" },
  { value: "CATEGORY", label: "Баннер в каталоге" },
  { value: "SIDEBAR", label: "Боковой блок" },
  { value: "POPUP", label: "Всплывающий промо" },
];

export function BannerForm({ banner }: { banner?: Banner }) {
  const action = banner ? updateBanner.bind(null, banner.id) : createBanner;
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
            <div>
              <Label htmlFor="title" required>Заголовок</Label>
              <Input id="title" name="title" defaultValue={banner?.title} placeholder="Например: Скидки до 30%" />
              <FieldError>{state.fieldErrors?.title}</FieldError>
            </div>
            <div>
              <Label htmlFor="subtitle">Подзаголовок</Label>
              <Textarea id="subtitle" name="subtitle" defaultValue={banner?.subtitle ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ctaLabel">Текст кнопки</Label>
                <Input id="ctaLabel" name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} placeholder="Подробнее" />
              </div>
              <div>
                <Label htmlFor="link">Ссылка</Label>
                <Input id="link" name="link" defaultValue={banner?.link ?? ""} placeholder="/catalog" />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">Изображения</h2>
            <div>
              <Label>Изображение (десктоп)</Label>
              <ImageUploader name="image" ratio="16/9" spec="1600×900"
                initial={banner?.image ? [banner.image] : []} />
            </div>
            <div>
              <Label>Изображение (мобильное)</Label>
              <ImageUploader name="imageMobile" ratio="4/5" spec="800×1000"
                initial={banner?.imageMobile ? [banner.imageMobile] : []} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="placement" required>Размещение</Label>
              <Select id="placement" name="placement" defaultValue={banner?.placement ?? "HOME_STRIP"}>
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.placement}</FieldError>
            </div>
            <div>
              <Label htmlFor="bgColor">Цвет фона</Label>
              <Input id="bgColor" name="bgColor" defaultValue={banner?.bgColor ?? ""} placeholder="#3a9447" />
            </div>
            <div>
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={banner?.sortOrder ?? 0} />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={banner ? banner.isActive : true} /> Активен (виден на сайте)
              </label>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{banner ? "Сохранить изменения" : "Создать баннер"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/banners">Отмена</Link></Button>
      </div>
    </form>
  );
}
