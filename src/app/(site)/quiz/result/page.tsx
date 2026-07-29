import type { Metadata } from "next";
import { ListLink as Link } from "@/components/ui/list-link";
import { MessageCircleHeart, PackageSearch, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { getProducts } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { AUDIENCES, GOALS, audienceName, goalName } from "@/lib/taxonomy";

// Подборка зависит от searchParams — рендер на каждый запрос.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    {
      title: "Ваша подборка",
      description: "Персональная подборка витаминов и БАД ХАЯТ по результатам квиза.",
      path: "/quiz/result",
      noindex: true,
    },
    settings,
  );
}

export default async function QuizResultPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; goal?: string; extra?: string }>;
}) {
  const sp = await searchParams;
  // валидация слагов из URL — всё неизвестное игнорируем
  const audience = AUDIENCES.some((a) => a.slug === sp.audience) ? sp.audience : undefined;
  const goal = GOALS.some((g) => g.slug === sp.goal) ? sp.goal : undefined;
  const extra =
    GOALS.some((g) => g.slug === sp.extra) && sp.extra !== goal ? sp.extra : undefined;

  // основная выборка; если по паре «кому+цель» пусто — мягкий fallback только по цели
  let { items } = await getProducts({ audience, goal, take: 12 });
  let relaxed = false;
  if (items.length === 0 && audience && goal) {
    ({ items } = await getProducts({ goal, take: 12 }));
    relaxed = true;
  }
  if (items.length === 0) {
    ({ items } = await getProducts({ featured: true, take: 12 }));
    relaxed = true;
  }

  // мягкое влияние возраста: небольшая дополнительная подборка
  const shown = new Set(items.map((p) => p.id));
  const extraItems = extra
    ? (await getProducts({ goal: extra, take: 8 })).items
        .filter((p) => !shown.has(p.id))
        .slice(0, 4)
    : [];

  const chips = [audienceName(audience ?? ""), goalName(goal ?? "")].filter(Boolean) as string[];

  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Ваша подборка</h1>
          {chips.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold leading-none text-brand-700"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : null}
          {relaxed ? (
            <p className="mt-2 text-sm text-ink-muted">
              Точных совпадений мало — расширили подборку, чтобы было из чего выбрать.
            </p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm" className="min-h-[44px] shrink-0">
          <Link href="/quiz">
            <RotateCcw className="h-4 w-4" aria-hidden /> Пройти заново
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <div className="flex flex-col items-center rounded-2xl bg-surface-soft px-6 py-14 text-center">
            <PackageSearch className="h-12 w-12 text-brand-300" aria-hidden />
            <p className="mt-4 text-lg font-bold">Пока ничего не нашли</p>
            <p className="mt-1 max-w-sm text-ink-muted">
              Загляните в каталог — там весь ассортимент.
            </p>
            <Button asChild className="mt-5">
              <Link href="/catalog">В каталог</Link>
            </Button>
          </div>
        )}
      </div>

      {extraItems.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold tracking-tight">
            С учётом возраста также полезно
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{goalName(extra!)}</p>
          <div className="mt-5">
            <ProductGrid products={extraItems} />
          </div>
        </section>
      ) : null}

      {/* CTA: бесплатная консультация нутрициолога */}
      <div className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white shadow-md sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <MessageCircleHeart className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold leading-tight sm:text-lg">Нужна точность?</p>
            <p className="mt-0.5 text-sm text-white/85">
              Бесплатная консультация нутрициолога — подберём курс лично под вас
            </p>
          </div>
        </div>
        <Link
          href="/account/consultation"
          className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-white/90 sm:mt-0"
        >
          Записаться
        </Link>
      </div>
    </Container>
  );
}
