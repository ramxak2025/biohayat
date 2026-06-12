"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { createStory, updateStory, type FormState } from "./actions";
import type { Story } from "@prisma/client";

const init: FormState = {};

export function StoryForm({ story }: { story?: Story }) {
  const action = story ? updateStory.bind(null, story.id) : createStory;
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
              <Label htmlFor="title" required>Подпись кружка</Label>
              <Input id="title" name="title" defaultValue={story?.title} placeholder="Например: Новинка" />
              <FieldError>{state.fieldErrors?.title}</FieldError>
            </div>
            <div>
              <Label htmlFor="text">Текст сторис</Label>
              <Textarea id="text" name="text" rows={3} defaultValue={story?.text ?? ""} placeholder="Короткое сообщение под картинкой" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ctaLabel">Текст кнопки</Label>
                <Input id="ctaLabel" name="ctaLabel" defaultValue={story?.ctaLabel ?? ""} placeholder="Смотреть" />
              </div>
              <div>
                <Label htmlFor="link">Ссылка кнопки</Label>
                <Input id="link" name="link" defaultValue={story?.link ?? ""} placeholder="/sale" />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">Изображения</h2>
            <div>
              <Label>Обложка кружка (квадрат)</Label>
              <ImageUploader name="cover" ratio="1/1" spec="200×200"
                initial={story?.cover ? [story.cover] : []} />
            </div>
            <div>
              <Label>Картинка сторис (вертикальная)</Label>
              <ImageUploader name="image" ratio="4/5" spec="800×1000"
                initial={story?.image ? [story.image] : []} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="sortOrder">Порядок</Label>
              <Input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={story?.sortOrder ?? 0} />
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Checkbox name="isActive" defaultChecked={story ? story.isActive : true} /> Активна (видна на главной)
            </label>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{story ? "Сохранить изменения" : "Создать сторис"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/stories">Отмена</Link></Button>
      </div>
    </form>
  );
}
