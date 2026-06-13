import { AdminHeader } from "@/components/admin/ui";
import { BrandForm } from "../brand-form";

export const dynamic = "force-dynamic";

export default function NewBrandPage() {
  return (
    <>
      <AdminHeader title="Новый бренд" description="Заполните данные бренда." />
      <BrandForm />
    </>
  );
}
