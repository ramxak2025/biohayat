import { AdminHeader } from "@/components/admin/ui";
import { MaterialForm } from "../material-form";

export const dynamic = "force-dynamic";

export default function NewMaterialPage() {
  return (
    <>
      <AdminHeader title="Новый материал" description="Заполните данные статьи." />
      <MaterialForm />
    </>
  );
}
