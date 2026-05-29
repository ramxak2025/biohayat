"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createCategory, updateCategory, type FormState } from "./actions";
import type { Category } from "@prisma/client";

const init: FormState = {};

export function CategoryForm({ category }: { category?: Category }) {
  const action = category ? updateCategory.bind(null, category.id) : createCategory;
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
              <Input id="name" name="name" defaultValue={category?.name} placeholder="Например: Витамины" />
              <FieldError>{state.fieldErrors?.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" name="slug" defaultValue={category?.slug} placeholder="оставьте пустым — сгенерируется из названия" />
              <p className="mt-1 text-xs text-ink-faint">Адрес категории: /category/<b>slug</b></p>
            </div>
            <div>
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" name="description" defaultValue={category?.description ?? ""} />
            </div>
            <div>
              <Label htmlFor="icon">Иконка (lucide)</Label>
              <Input id="icon" name="icon" defaultValue={category?.icon ?? ""} placeholder="Например: Leaf" />
              <p className="mt-1 text-xs text-ink-faint">Имя иконки из библиотеки lucide.</p>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">SEO</h2>
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input id="metaTitle" name="metaTitle" defaultValue={category?.metaTitle ?? ""} />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea id="metaDescription" name="metaDescription" defaultValue={category?.metaDescription ?? ""} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="sortOrder">Порядок сортировки</Label>
              <Input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={category?.sortOrder ?? 0} />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={category ? category.isActive : true} /> Активна (видна на сайте)
              </label>
            </div>
          </Card>

          <Card>
            <Label>Изображение</Label>
            <ImageUploader name="image" ratio="4/3" spec="1200×900"
              initial={category?.image ? [category.image] : []} />
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{category ? "Сохранить изменения" : "Создать категорию"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/categories">Отмена</Link></Button>
      </div>
    </form>
  );
}
