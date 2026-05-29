import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { MaterialForm } from "../material-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) notFound();

  return (
    <>
      <AdminHeader title="Редактирование материала" description={material.title} />
      <MaterialForm material={material} />
    </>
  );
}
