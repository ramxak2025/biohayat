import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { BrandForm } from "../brand-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) notFound();

  return (
    <>
      <AdminHeader title="Редактирование бренда" description={brand.name} />
      <BrandForm brand={brand} />
    </>
  );
}
