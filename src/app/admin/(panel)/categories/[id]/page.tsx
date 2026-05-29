import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { CategoryForm } from "../category-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <>
      <AdminHeader title="Редактирование категории" description={category.name} />
      <CategoryForm category={category} />
    </>
  );
}
