"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createMaterial, updateMaterial, type FormState } from "./actions";
import type { Material } from "@prisma/client";

const init: FormState = {};

export function MaterialForm({ material }: { material?: Material }) {
  const action = material ? updateMaterial.bind(null, material.id) : createMaterial;
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
              <Input id="title" name="title" defaultValue={material?.title} placeholder="Например: Польза витамина D" />
              <FieldError>{state.fieldErrors?.title}</FieldError>
            </div>
            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" name="slug" defaultValue={material?.slug} placeholder="оставьте пустым — сгенерируется из заголовка" />
              <p className="mt-1 text-xs text-ink-faint">Адрес статьи: /articles/<b>slug</b></p>
            </div>
            <div>
              <Label htmlFor="excerpt">Краткое описание</Label>
              <Textarea id="excerpt" name="excerpt" defaultValue={material?.excerpt ?? ""} />
            </div>
            <div>
              <Label htmlFor="content">Содержание (HTML)</Label>
              <Textarea id="content" name="content" rows={14} defaultValue={material?.content ?? ""} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">SEO</h2>
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input id="metaTitle" name="metaTitle" defaultValue={material?.metaTitle ?? ""} />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea id="metaDescription" name="metaDescription" defaultValue={material?.metaDescription ?? ""} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isPublished" defaultChecked={material?.isPublished} /> Опубликован
              </label>
            </div>
          </Card>

          <Card>
            <Label>Обложка</Label>
            <ImageUploader name="coverImage" ratio="16/9" spec="1200×675"
              initial={material?.coverImage ? [material.coverImage] : []} />
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{material ? "Сохранить изменения" : "Создать материал"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/materials">Отмена</Link></Button>
      </div>
    </form>
  );
}
