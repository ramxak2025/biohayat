import type { Metadata } from "next";
import { Search as SearchIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-card";
import { smartSearchProducts } from "@/lib/search";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const settings = await getSettings();
  return buildMetadata(
    { title: q ? `Поиск: ${q}` : "Поиск", description: "Поиск по каталогу ХАЯТ.", path: "/search", noindex: true },
    settings,
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { items, total, query } = await smartSearchProducts(q);

  return (
    <Container className="py-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">Поиск</h1>
      <form action="/search" className="relative mb-6">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Что ищете? Например: витамин д3, калаген, омега…"
          className="w-full rounded-full border border-line bg-surface-soft py-3.5 pl-12 pr-4 text-base placeholder:text-ink-faint focus:border-brand-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </form>

      {query.length < 2 ? (
        <p className="text-ink-muted">Введите запрос — поиск понимает опечатки и неполные слова.</p>
      ) : total === 0 ? (
        <div className="rounded-2xl bg-surface-soft py-14 text-center text-ink-muted">
          По запросу «{query}» ничего не найдено. Попробуйте иначе.
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-faint">Найдено: {total}</p>
          <ProductGrid products={items} reveal={false} />
        </>
      )}
    </Container>
  );
}
