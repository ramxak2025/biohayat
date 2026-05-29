import { AdminHeader } from "@/components/admin/ui";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <>
      <AdminHeader title="Новая категория" description="Заполните данные категории." />
      <CategoryForm />
    </>
  );
}
