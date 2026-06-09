import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { SmartImage } from "@/components/ui/smart-image";
import { getMaterialBySlug } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { sanitizeHtml } from "@/lib/sanitize";
import { materialMetadata } from "@/lib/seo";

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
  const material = await getMaterialBySlug(slug);
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
    </Container>
  );
}
