import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/prose";
import { SmartImage } from "@/components/ui/smart-image";
import { getPublishedMaterials } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

// ISR: список статей отдаётся статически, перегенерация раз в 5 минут.
// Без параметров: рендер на каждый запрос (данные берутся из Data Cache,
// поэтому это дёшево). Статический пререндер потребовал бы БД на сборке.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    { title: "Статьи", description: "Полезные статьи о здоровье, витаминах и нутрициологии.", path: "/articles" },
    settings,
  );
}

export default async function ArticlesPage() {
  const materials = await getPublishedMaterials();
  return (
    <>
      <PageHero title="Статьи" subtitle="О здоровье, витаминах и натуральной продукции" />
      <Container className="py-8 sm:py-12">
        {materials.length === 0 ? (
          <p className="text-ink-muted">Пока нет опубликованных статей.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <Link
                key={m.id}
                href={`/articles/${m.slug}`}
                className="group overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition hover:shadow-md"
              >
                <SmartImage src={m.coverImage} alt={m.title} ratio="16/9" rounded="rounded-none" label="Обложка статьи" spec="1200×675" />
                <div className="p-4">
                  <h2 className="font-bold leading-tight group-hover:text-brand-700">{m.title}</h2>
                  {m.excerpt ? <p className="mt-1.5 line-clamp-3 text-sm text-ink-muted">{m.excerpt}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
