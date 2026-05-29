import { AdminHeader } from "@/components/admin/ui";
import { BannerForm } from "../banner-form";

export const dynamic = "force-dynamic";

export default function NewBannerPage() {
  return (
    <>
      <AdminHeader title="Новый баннер" description="Заполните данные баннера." />
      <BannerForm />
    </>
  );
}
