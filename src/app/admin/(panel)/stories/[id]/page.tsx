import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { StoryForm } from "../story-form";

export const dynamic = "force-dynamic";

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) notFound();

  return (
    <>
      <AdminHeader title={`Сторис: ${story.title}`} description="Редактирование сторис." />
      <StoryForm story={story} />
    </>
  );
}
