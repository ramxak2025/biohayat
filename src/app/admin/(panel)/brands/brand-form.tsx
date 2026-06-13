"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createBrand, updateBrand, type FormState } from "./actions";
import type { Brand } from "@prisma/client";

const init: FormState = {};

export function BrandForm({ brand }: { brand?: Brand }) {
  const action = brand ? updateBrand.bind(null, brand.id) : createBrand;
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
              <Label htmlFor="name" required>Название</Label>
              <Input id="name" name="name" defaultValue={brand?.name} placeholder="Например: Solgar" />
              <FieldError>{state.fieldErrors?.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" name="slug" defaultValue={brand?.slug} placeholder="оставьте пустым — сгенерируется из названия" />
              <p className="mt-1 text-xs text-ink-faint">Адрес бренда: /brand/<b>slug</b></p>
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" name="description" defaultValue={brand?.description ?? ""} />
            </div>
            <div>
              <Label htmlFor="country">Страна производства</Label>
              <Input id="country" name="country" defaultValue={brand?.country ?? ""} placeholder="Например: США" />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">SEO</h2>
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input id="metaTitle" name="metaTitle" defaultValue={brand?.metaTitle ?? ""} />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea id="metaDescription" name="metaDescription" defaultValue={brand?.metaDescription ?? ""} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={brand?.sortOrder ?? 0} />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={brand ? brand.isActive : true} /> Активен (виден на сайте)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isFeatured" defaultChecked={brand?.isFeatured} /> В витрине брендов
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isOwn" defaultChecked={brand?.isOwn} /> Собственный бренд (ХАЯТ)
              </label>
            </div>
          </Card>

          <Card>
            <Label>Логотип</Label>
            <ImageUploader name="logo" ratio="1/1" spec="500×500 (прозрачный PNG/SVG)"
              initial={brand?.logo ? [brand.logo] : []} />
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{brand ? "Сохранить изменения" : "Создать бренд"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/brands">Отмена</Link></Button>
      </div>
    </form>
  );
}
