import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { PromoForm } from "../promo-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) notFound();

  return (
    <>
      <AdminHeader title="Редактирование промокода" description={promo.code} />
      <PromoForm promo={promo} />
    </>
  );
}
