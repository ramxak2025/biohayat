"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { Input, Textarea, Select, Label, FieldError, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/form-controls";
import { ImageUploader } from "@/components/admin/image-uploader";
import { kopecksToRub } from "@/lib/utils";
import { createProduct, updateProduct, type FormState } from "./actions";
import type { Product, ProductImage, Category } from "@prisma/client";

const init: FormState = {};

export function ProductForm({
  product,
  categories,
}: {
  product?: Product & { images: ProductImage[] };
  categories: Pick<Category, "id" | "name">[];
}) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
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
              <Input id="name" name="name" defaultValue={product?.name} placeholder="Например: Vitamin D3 + K2" />
              <FieldError>{state.fieldErrors?.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" name="slug" defaultValue={product?.slug} placeholder="оставьте пустым — сгенерируется из названия" />
              <p className="mt-1 text-xs text-ink-faint">Адрес товара: /product/<b>slug</b></p>
            </div>
            <div>
              <Label htmlFor="shortDescription">Краткое описание</Label>
              <Textarea id="shortDescription" name="shortDescription" defaultValue={product?.shortDescription ?? ""} />
            </div>
            <div>
              <Label htmlFor="description">Полное описание</Label>
              <Textarea id="description" name="description" rows={5} defaultValue={product?.description ?? ""} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">Характеристики БАД</h2>
            <div>
              <Label htmlFor="composition">Состав</Label>
              <Textarea id="composition" name="composition" defaultValue={product?.composition ?? ""} />
            </div>
            <div>
              <Label htmlFor="usage">Способ применения</Label>
              <Textarea id="usage" name="usage" defaultValue={product?.usage ?? ""} />
            </div>
            <div>
              <Label htmlFor="contraindications">Противопоказания</Label>
              <Textarea id="contraindications" name="contraindications" defaultValue={product?.contraindications ?? ""} />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="font-bold">SEO</h2>
            <p className="text-sm text-ink-muted">
              Если оставить пустым — заполнится автоматически из названия, цены и описания.
            </p>
            <div>
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input id="metaTitle" name="metaTitle" defaultValue={product?.metaTitle ?? ""} />
            </div>
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea id="metaDescription" name="metaDescription" defaultValue={product?.metaDescription ?? ""} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div>
              <Label htmlFor="categoryId" required>Категория</Label>
              <Select id="categoryId" name="categoryId" defaultValue={product?.categoryId}>
                <option value="">— выберите —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <FieldError>{state.fieldErrors?.categoryId}</FieldError>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="priceRub" required>Цена, ₽</Label>
                <Input id="priceRub" name="priceRub" type="number" min="0" step="1"
                  defaultValue={product ? kopecksToRub(product.priceKopecks) : ""} />
                <FieldError>{state.fieldErrors?.priceRub}</FieldError>
              </div>
              <div>
                <Label htmlFor="oldPriceRub">Старая цена, ₽</Label>
                <Input id="oldPriceRub" name="oldPriceRub" type="number" min="0" step="1"
                  defaultValue={product?.oldPriceKopecks ? kopecksToRub(product.oldPriceKopecks) : ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="volume">Объём / форма</Label>
                <Input id="volume" name="volume" defaultValue={product?.volume ?? ""} placeholder="60 капсул" />
              </div>
              <div>
                <Label htmlFor="sku">Артикул</Label>
                <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
              </div>
            </div>
            <div>
              <Label htmlFor="badges">Бейджи (через запятую)</Label>
              <Input id="badges" name="badges" defaultValue={product?.badges.join(", ")} placeholder="хит, новинка" />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isActive" defaultChecked={product ? product.isActive : true} /> Активен (виден на сайте)
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="inStock" defaultChecked={product ? product.inStock : true} /> В наличии
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <Checkbox name="isFeatured" defaultChecked={product?.isFeatured} /> Хит (на главной)
              </label>
            </div>
          </Card>

          <Card>
            <Label>Фотографии</Label>
            <ImageUploader name="images" multiple ratio="1/1" spec="1000×1000 (1:1)"
              initial={product?.images.map((i) => i.url) ?? []} />
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{product ? "Сохранить изменения" : "Создать товар"}</SubmitButton>
        <Button asChild variant="ghost"><Link href="/admin/products">Отмена</Link></Button>
      </div>
    </form>
  );
}
