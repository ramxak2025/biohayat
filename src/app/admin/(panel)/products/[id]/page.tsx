import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminHeader title="Редактирование товара" description={product.name} />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
