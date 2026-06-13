import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return (
    <>
      <AdminHeader title="Новый товар" description="Заполните карточку. SEO заполнится автоматически." />
      <ProductForm categories={categories} brands={brands} />
    </>
  );
}
