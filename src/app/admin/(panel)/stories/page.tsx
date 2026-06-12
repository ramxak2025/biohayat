import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { deleteStory } from "./actions";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const stories = await prisma.story.findMany({
    orderBy: { sortOrder: "asc" },
    take: 100,
  });

  return (
    <>
      <AdminHeader
        title="Сторис"
        description={`Кружки на главной странице. Всего: ${stories.length}`}
        action={
          <Button asChild>
            <Link href="/admin/stories/new"><Plus className="h-4 w-4" /> Добавить сторис</Link>
          </Button>
        }
      />

      {stories.length === 0 ? (
        <EmptyState>Сторис пока нет. Добавьте первую — кружки появятся на главной в мобильной версии.</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase text-ink-faint">
              <tr>
                <th className="p-4 font-semibold">Сторис</th>
                <th className="p-4 font-semibold">Ссылка</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stories.map((s) => (
                <tr key={s.id} className="hover:bg-surface-soft/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-2 ring-brand-200">
                        {s.cover ? (
                          <Image src={s.cover} alt="" width={48} height={48} className="h-12 w-12 object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{s.title}</div>
                        {s.text ? <div className="line-clamp-1 text-xs text-ink-faint">{s.text}</div> : null}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-ink-muted">{s.link || "—"}</td>
                  <td className="p-4">
                    <Pill tone={s.isActive ? "green" : "neutral"}>{s.isActive ? "Активна" : "Скрыта"}</Pill>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/stories/${s.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton action={deleteStory.bind(null, s.id)} label="" confirmText={`Удалить «${s.title}»?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
