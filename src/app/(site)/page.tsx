import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, Leaf, Sparkles } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CategoryTiles } from "@/components/site/category-tiles";
import { CollectionTiles } from "@/components/site/collection-tiles";
import { AudienceCards } from "@/components/site/audience-cards";
import { SaleBanner } from "@/components/site/sale-banner";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { getNavCategories, getProducts, getBanners, getPublishedMaterials, getActiveStories } from "@/lib/queries";
import { Stories } from "@/components/site/stories";
import type { ProductCardData } from "@/lib/queries";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

// ISR: главная отдаётся статически, перегенерация не чаще раза в 2 минуты.
// Без параметров: рендер на каждый запрос (данные берутся из Data Cache,
// поэтому это дёшево). Статический пререндер потребовал бы БД на сборке.
export const dynamic = "force-dynamic";

/** Фирменный лист — тот же path, что в логотипе (src/components/site/logo.tsx). */
const LEAF_PATH =
  "M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z";

export default async function HomePage() {
  const [categories, featured, sale, heroBanners, materials, settings, stories] = await Promise.all([
    getNavCategories(),
    getProducts({ featured: true, take: 10 }),
    getProducts({ onSale: true, take: 5 }),
    getBanners("HERO"),
    getPublishedMaterials(3),
    getSettings(),
    getActiveStories(),
  ]);

  const hero = heroBanners[0];

  return (
    <>
      {/* ── Сторис: кружки над hero (мобайл и десктоп) ── */}
      {stories.length > 0 ? (
        <Section className="pb-0 pt-3 sm:pt-5">
          <Container>
            <Stories stories={stories} />
          </Container>
        </Section>
      ) : null}

      {/* ── Hero: компактная премиальная карточка ── */}
      <Section className="pb-4 pt-4 sm:pb-6 sm:pt-8">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 text-white shadow-md">
            {hero?.image ? (
              <>
                <SmartImage
                  src={hero.image}
                  alt={hero.title}
                  ratio="16/9"
                  rounded="rounded-none"
                  className="absolute inset-0 h-full w-full"
                  sizes="(max-width: 1280px) 100vw, 1216px"
                  priority
                />
                {/* затемнение слева — читаемость текста поверх фото */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-900/80 via-brand-900/45 to-brand-900/10" />
              </>
            ) : null}

            {/* крупный фирменный лист — декор за текстом */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute -right-14 -top-12 h-60 w-60 rotate-[22deg] fill-white/[0.08] sm:-right-6 sm:top-1/2 sm:h-[380px] sm:w-[380px] sm:-translate-y-1/2 sm:rotate-12 lg:right-6 lg:h-[440px] lg:w-[440px]"
            >
              <path d={LEAF_PATH} />
            </svg>

            <div className="relative p-6 sm:flex sm:min-h-[320px] sm:items-center sm:p-10 lg:min-h-[380px] lg:p-14">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur sm:text-xs">
                  <Leaf className="h-3.5 w-3.5" aria-hidden /> Натурально · Проверено временем
                </span>
                <h1 className="mt-3 text-[28px] font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  {hero?.title || "Натуральные витамины для всей семьи"}
                </h1>
                <p className="mt-2 max-w-md text-sm text-white/85 sm:text-base lg:text-lg">
                  {hero?.subtitle || "Фитопродукция ХАЯТ — из натурального сырья"}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7 sm:gap-3">
                  <Button
                    asChild
                    variant="secondary"
                    className="bg-white text-brand-700 shadow-sm hover:bg-white/90"
                  >
                    <Link href={hero?.link || "/catalog"}>
                      {hero?.ctaLabel || "В каталог"} <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Link
                    href="/sale"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white/90 ring-1 ring-white/30 transition hover:bg-white/10 hover:text-white"
                  >
                    Распродажа <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Полоса преимуществ: 3 компактных пункта в один ряд ── */}
          <div className="mt-3 overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line sm:mt-4">
            <div className="grid grid-cols-3 divide-x divide-line">
              <TrustItem
                icon={Truck}
                title="Бесплатная доставка"
                text={`от ${formatMoney(settings.freeDeliveryThresholdKopecks)}`}
              />
              <TrustItem icon={ShieldCheck} title="Сертифицировано" text="стандарты ЕАЭС" />
              <TrustItem icon={Leaf} title="Натуральный состав" text="производство в России" />
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Распродажа ── */}
      <Section className="py-4 sm:py-5">
        <Container>
          <SaleBanner />
        </Container>
      </Section>

      {/* ── Навигация по покупателю: Для кого / Зачем ── */}
      <Section className="py-5 sm:py-6">
        <Container className="space-y-7 sm:space-y-8">
          <div>
            <SectionHeader title="Для кого" subtitle="Подберём под вас и вашу семью" />
            <AudienceCards />
          </div>
          <div>
            <SectionHeader title="Зачем" subtitle="Выберите по своей цели — мы подскажем" />
            <CollectionTiles variant="goal" />
          </div>

          {/* ── CTA квиза: компактная карточка, на десктопе — баннер-полоса ── */}
          <Link
            href="/quiz"
            className="group relative block overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-500 p-5 text-white shadow-md transition hover:shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-6"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rotate-12 fill-white/[0.08] sm:right-32 sm:-top-10 sm:h-40 sm:w-40"
            >
              <path d={LEAF_PATH} />
            </svg>
            <span className="relative flex items-center gap-3 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-extrabold leading-tight sm:text-lg">
                  Не знаете, что выбрать?
                </span>
                <span className="mt-0.5 block text-sm text-white/85">
                  Подбор за 1 минуту — три коротких вопроса
                </span>
              </span>
            </span>
            <span className="relative mt-4 inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-bold text-brand-700 shadow-sm transition group-hover:bg-white/90 sm:mt-0 sm:shrink-0">
              Пройти подбор <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        </Container>
      </Section>

      {/* ── Категории ── */}
      <Section className="py-5 sm:py-6">
        <Container>
          <SectionHeader
            title="Категории"
            subtitle="Весь каталог по типам продукции"
            action={<AllLink href="/catalog" />}
          />
          <CategoryTiles categories={categories} />
        </Container>
      </Section>

      {/* ── Хиты продаж: на мобайле — лента, на десктопе — сетка ── */}
      <Section className="bg-surface-soft py-8 sm:py-14">
        <Container>
          <SectionHeader
            title="Хиты продаж"
            subtitle="Чаще всего выбирают наши покупатели"
            action={<AllLink href="/catalog" />}
          />
          <ProductRail products={featured.items} />
        </Container>
      </Section>

      {/* ── Акции ── */}
      {sale.items.length > 0 ? (
        <Section className="py-8 sm:py-14">
          <Container>
            <SectionHeader
              title="Товары по акции"
              subtitle="Успейте купить выгодно"
              action={<AllLink href="/sale" />}
            />
            <ProductRail products={sale.items} />
          </Container>
        </Section>
      ) : null}

      {/* ── Недавно смотрели (если есть история просмотров) ── */}
      <Container>
        <RecentlyViewed className="py-8 sm:py-14" />
      </Container>

      {/* ── Статьи: на мобайле — лента из ~2.2 карточек ── */}
      {materials.length > 0 ? (
        <Section className="bg-surface-soft py-8 sm:py-14">
          <Container>
            <SectionHeader
              title="Полезные статьи"
              subtitle="О здоровье, витаминах и нутрициологии"
              action={<AllLink href="/articles" />}
            />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-3">
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/articles/${m.slug}`}
                  className="group w-[42vw] min-w-[168px] shrink-0 snap-start overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:shrink"
                >
                  <SmartImage
                    src={m.coverImage}
                    alt={m.title}
                    ratio="16/9"
                    rounded="rounded-none"
                    label={m.title}
                    spec="1200×675"
                    sizes="(max-width: 640px) 44vw, (max-width: 1024px) 50vw, 400px"
                  />
                  <div className="p-3 sm:p-4">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-brand-700 sm:text-base">
                      {m.title}
                    </h3>
                    {m.excerpt ? (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-muted sm:mt-1.5 sm:text-sm">
                        {m.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ── О компании ── */}
      <Section>
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-brand-800 text-white">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute -left-10 -bottom-12 h-56 w-56 -rotate-12 fill-white/[0.06]"
            >
              <path d={LEAF_PATH} />
            </svg>
            <div className="relative grid items-center gap-6 p-7 sm:p-8 lg:grid-cols-2 lg:p-12">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Компания «ХАЯТ»
                </h2>
                <p className="mt-3 text-sm text-white/85 sm:text-base">
                  Мы производим и продаём натуральную фитопродукцию и биологически активные
                  добавки, основанные на знаниях, рецептах и принципах, проверенных временем.
                  Продукция изготавливается из натурального сырья.
                </p>
                <Button asChild variant="secondary" className="mt-5 bg-white text-brand-700 hover:bg-white/90">
                  <Link href="/about">Подробнее о нас</Link>
                </Button>
              </div>
              <SmartImage
                src={null}
                alt="О компании ХАЯТ"
                ratio="16/9"
                label="Фото производства / команды"
                spec="1200×675"
                rounded="rounded-2xl"
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/** Единый паттерн заголовков секций: ссылка «Все →» справа от h2. */
function AllLink({ href, label = "Все" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-0.5 text-sm font-bold text-brand-600 transition hover:text-brand-700"
    >
      {label} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

/**
 * Секция товаров: на мобайле — горизонтальная snap-лента (вместо «стены»
 * карточек на несколько экранов), на десктопе — привычная сетка.
 */
function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 py-1 sm:hidden">
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <div className="max-sm:hidden">
        <ProductGrid products={products} />
      </div>
    </>
  );
}

/** Пункт полосы преимуществ: компактный, иконка 20px в кружке + 2 строки. */
function TrustItem({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center sm:flex-row sm:gap-3 sm:px-5 sm:py-4 sm:text-left">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-tight text-ink-muted">{text}</span>
      </span>
    </div>
  );
}
