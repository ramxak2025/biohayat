import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { BannerForm } from "../banner-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <>
      <AdminHeader title="Редактирование баннера" description={banner.title} />
      <BannerForm banner={banner} />
    </>
  );
}
