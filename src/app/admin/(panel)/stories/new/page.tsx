import { AdminHeader } from "@/components/admin/ui";
import { StoryForm } from "../story-form";

export const dynamic = "force-dynamic";

export default function NewStoryPage() {
  return (
    <>
      <AdminHeader title="Новая сторис" description="Кружок на главной: обложка, картинка, текст и кнопка." />
      <StoryForm />
    </>
  );
}
