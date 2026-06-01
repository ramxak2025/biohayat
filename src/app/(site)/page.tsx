import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, Leaf, BadgePercent } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CategoryTiles } from "@/components/site/category-tiles";
import { CollectionTiles } from "@/components/site/collection-tiles";
import { ProductGrid } from "@/components/product/product-card";
import { getNavCategories, getProducts, getBanners, getPublishedMaterials } from "@/lib/queries";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const [categories, featured, sale, heroBanners, materials, settings] = await Promise.all([
    getNavCategories(),
    getProducts({ featured: true, take: 10 }),
    getProducts({ onSale: true, take: 5 }),
    getBanners("HERO"),
    getPublishedMaterials(3),
    getSettings(),
  ]);

  const hero = heroBanners[0];
  const heroSecondary = heroBanners[1];

  return (
    <>
      {/* ── Hero ── */}
      <Section className="pb-6 pt-6 sm:pt-8">
        <Container>
          <div className="grid gap-4 lg:grid-cols-3">
            <div
              className="relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white sm:min-h-[380px] lg:col-span-2 lg:p-10"
              style={{ backgroundColor: hero?.bgColor || "#3a9447" }}
            >
              {hero?.image ? (
                <SmartImage
                  src={hero.image}
                  alt={hero.title}
                  ratio="16/9"
                  rounded="rounded-none"
                  className="absolute inset-0 h-full w-full"
                  priority
                />
              ) : null}
              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                  <Leaf className="h-3.5 w-3.5" /> Натурально · Проверено временем
                </span>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                  {hero?.title || "Натуральные витамины для всей семьи"}
                </h1>
                <p className="mt-2 text-base text-white/90 sm:text-lg">
                  {hero?.subtitle || "Фитопродукция ХАЯТ"}
                </p>
                <Button asChild variant="secondary" size="lg" className="mt-5 bg-white text-brand-700 hover:bg-white/90">
                  <Link href={hero?.link || "/catalog"}>
                    {hero?.ctaLabel || "В каталог"} <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div
              className="relative flex min-h-[180px] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white lg:min-h-0"
              style={{ backgroundColor: heroSecondary?.bgColor || "#d98a12" }}
            >
              {heroSecondary?.image ? (
                <SmartImage
                  src={heroSecondary.image}
                  alt={heroSecondary.title}
                  ratio="4/5"
                  rounded="rounded-none"
                  className="absolute inset-0 h-full w-full"
                />
              ) : null}
              <div className="relative">
                <BadgePercent className="mb-2 h-8 w-8" />
                <h2 className="text-2xl font-extrabold leading-tight">
                  {heroSecondary?.title || "−25% на первый заказ"}
                </h2>
                <p className="mt-1 text-white/90">
                  {heroSecondary?.subtitle || "Промокод FREE25Hayat"}
                </p>
                <Button asChild variant="secondary" className="mt-4 bg-white text-accent-600 hover:bg-white/90">
                  <Link href={heroSecondary?.link || "/sale"}>
                    {heroSecondary?.ctaLabel || "К акциям"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* trust strip */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TrustItem icon={Truck} title="Бесплатная доставка" text={`от ${formatMoney(settings.freeDeliveryThresholdKopecks)} по России`} />
            <TrustItem icon={ShieldCheck} title="Сертифицировано" text="Соответствует требованиям ЕАЭС" />
            <TrustItem icon={Leaf} title="Натуральный состав" text="Производство ООО «Восток», Россия" />
          </div>
        </Container>
      </Section>

      {/* ── Категории ── */}
      <Section className="py-6">
        <Container>
          <SectionHeader title="Категории" subtitle="Подберите продукцию под свою задачу" />
          <CategoryTiles categories={categories} />
        </Container>
      </Section>

      {/* ── Подбор: кому / зачем ── */}
      <Section className="py-6">
        <Container className="space-y-6">
          <div>
            <SectionHeader title="Кому" subtitle="Подборки для всей семьи" />
            <CollectionTiles variant="audience" />
          </div>
          <div>
            <SectionHeader title="Зачем" subtitle="Подберите по вашей цели" />
            <CollectionTiles variant="goal" />
          </div>
        </Container>
      </Section>

      {/* ── Хиты продаж ── */}
      <Section className="bg-surface-soft">
        <Container>
          <SectionHeader
            title="Хиты продаж"
            subtitle="Чаще всего выбирают наши покупатели"
            action={
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/catalog">Все товары <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            }
          />
          <ProductGrid products={featured.items} />
        </Container>
      </Section>

      {/* ── Акции ── */}
      {sale.items.length > 0 ? (
        <Section>
          <Container>
            <SectionHeader
              title="Акции и скидки"
              subtitle="Выгодные предложения"
              action={
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link href="/sale">Все акции <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              }
            />
            <ProductGrid products={sale.items} />
          </Container>
        </Section>
      ) : null}

      {/* ── Статьи ── */}
      {materials.length > 0 ? (
        <Section className="bg-surface-soft">
          <Container>
            <SectionHeader title="Полезные статьи" subtitle="О здоровье, витаминах и нутрициологии" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/articles/${m.slug}`}
                  className="group overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition hover:shadow-md"
                >
                  <SmartImage src={m.coverImage} alt={m.title} ratio="16/9" rounded="rounded-none" label="Обложка статьи" spec="1200×675" />
                  <div className="p-4">
                    <h3 className="font-bold leading-tight group-hover:text-brand-700">{m.title}</h3>
                    {m.excerpt ? <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{m.excerpt}</p> : null}
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
          <div className="overflow-hidden rounded-3xl bg-brand-500 text-white">
            <div className="grid items-center gap-6 p-8 lg:grid-cols-2 lg:p-12">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Компания «ХАЯТ»</h2>
                <p className="mt-3 text-white/90">
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
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold leading-tight">{title}</div>
        <div className="text-xs leading-tight text-ink-muted">{text}</div>
      </div>
    </div>
  );
}
