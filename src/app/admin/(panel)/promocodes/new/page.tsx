import { AdminHeader } from "@/components/admin/ui";
import { PromoForm } from "../promo-form";

export const dynamic = "force-dynamic";

export default function NewPromoCodePage() {
  return (
    <>
      <AdminHeader title="Новый промокод" description="Заполните данные промокода." />
      <PromoForm />
    </>
  );
}
