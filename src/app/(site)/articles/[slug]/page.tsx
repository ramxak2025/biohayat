import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { SmartImage } from "@/components/ui/smart-image";
import { ProductCard } from "@/components/product/product-card";
import { getMaterialBySlug, getProductsForMaterial } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { sanitizeHtml } from "@/lib/sanitize";
import { materialMetadata } from "@/lib/seo";

// ISR: статья отдаётся статически, перегенерация раз в 5 минут.
export const revalidate = 300;
// Регистрирует маршрут как ISR: страницы генерируются при первом запросе
// и кэшируются (на сборке БД не нужна, поэтому список пуст).
export function generateStaticParams() {
  return [];
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const material = await getMaterialBySlug(slug);
  if (!material) return {};
  const settings = await getSettings();
  return materialMetadata(material, settings);
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [material, products] = await Promise.all([
    getMaterialBySlug(slug),
    getProductsForMaterial(slug),
  ]);
  if (!material || !material.isPublished) notFound();

  return (
    <Container className="py-8 sm:py-12">
      <Link href="/articles" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ChevronLeft className="h-4 w-4" /> Все статьи
      </Link>
      <article>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">{material.title}</h1>
        {material.publishedAt ? (
          <time className="mt-2 block text-sm text-ink-faint">
            {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(material.publishedAt)}
          </time>
        ) : null}
        <div className="my-6 max-w-3xl">
          <SmartImage src={material.coverImage} alt={material.title} ratio="16/9" label="Обложка статьи" spec="1200×675" rounded="rounded-2xl" />
        </div>
        <Prose>
          {/* Контент из админки прогоняем через allowlist-санитайзер (защита от XSS) */}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(material.content) }} />
        </Prose>
      </article>

      {/* кросс-линковка: товары по теме статьи (мобайл — лента, десктоп — сетка) */}
      {products.length > 0 ? (
        <section className="mt-10 border-t border-line pt-8 sm:mt-12">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Подойдёт для этого
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Продукты ХАЯТ по теме статьи</p>
          <div className="no-scrollbar -mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="w-40 shrink-0 snap-start sm:w-auto sm:shrink">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
