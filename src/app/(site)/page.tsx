import Link from "next/link";
import { ArrowRight, Truck, ShieldCheck, Leaf, BadgePercent } from "lucide-react";
import { Container, Section, SectionHeader } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CategoryTiles } from "@/components/site/category-tiles";
import { CollectionTiles } from "@/components/site/collection-tiles";
import { AudienceCards } from "@/components/site/audience-cards";
import { SaleBanner } from "@/components/site/sale-banner";
import { ProductGrid } from "@/components/product/product-card";
import { getNavCategories, getProducts, getBanners, getPublishedMaterials } from "@/lib/queries";
import { SmartImage } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { Parallax } from "@/components/motion/parallax";
import { CountUp } from "@/components/motion/count-up";

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
              className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white sm:min-h-[420px] lg:col-span-2 lg:min-h-[460px] lg:p-12"
              style={{ backgroundColor: hero?.bgColor || "#2c7838" }}
            >
              {/* фирменный mesh-градиент как дефолт — «дорогая» глубина вместо плоской заливки */}
              {!hero?.image ? (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(120% 90% at 12% 8%, #5cae69 0%, transparent 55%), radial-gradient(110% 80% at 92% 100%, #1c3f24 0%, transparent 60%), radial-gradient(90% 70% at 80% 10%, #8ecb97 0%, transparent 45%)",
                  }}
                />
              ) : (
                <Parallax className="absolute left-0 top-[-6%] h-[112%] w-full">
                  <SmartImage
                    src={hero.image}
                    alt={hero.title || "Натуральные витамины ХАЯТ"}
                    ratio="16/9"
                    rounded="rounded-none"
                    className="absolute inset-0 h-full w-full"
                    priority
                  />
                </Parallax>
              )}
              {/* мягкий объём/градиент для глубины и читаемости текста */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
              <Reveal className="relative max-w-lg" stagger trigger="load" y={18} step={0.09}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                  <Leaf className="h-3.5 w-3.5" /> Натурально · Проверено временем
                </span>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {hero?.title || "Натуральные витамины для всей семьи"}
                </h1>
                <p className="mt-2 text-base text-white/90 sm:text-lg">
                  {hero?.subtitle || "Фитопродукция ХАЯТ"}
                </p>
                <div>
                  <Magnetic className="mt-5 inline-block">
                    <Button asChild variant="secondary" size="lg" className="bg-white text-brand-700 shadow-lg hover:bg-white/90">
                      <Link href={hero?.link || "/catalog"}>
                        {hero?.ctaLabel || "В каталог"} <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  </Magnetic>
                </div>
              </Reveal>
            </div>

            <div
              className="relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl p-7 text-white lg:min-h-0"
              style={{ backgroundColor: heroSecondary?.bgColor || "#b86e0e" }}
            >
              {heroSecondary?.image ? (
                <SmartImage
                  src={heroSecondary.image}
                  alt={heroSecondary.title || "Акция ХАЯТ"}
                  ratio="4/5"
                  rounded="rounded-none"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(120% 100% at 10% 0%, #e7a124 0%, transparent 55%), radial-gradient(120% 100% at 100% 100%, #8f5409 0%, transparent 60%)",
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
              <Reveal className="relative" stagger y={14} step={0.08}>
                <BadgePercent className="mb-2 h-8 w-8" />
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight">
                  {heroSecondary?.title || "−25% на первый заказ"}
                </h2>
                <p className="mt-1 text-white/90">
                  {heroSecondary?.subtitle || "Промокод FREE25Hayat"}
                </p>
                <div>
                  <Button asChild variant="secondary" className="mt-4 bg-white text-accent-700 hover:bg-white/90">
                    <Link href={heroSecondary?.link || "/sale"}>
                      {heroSecondary?.ctaLabel || "К акциям"}
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>

          {/* trust strip */}
          <Reveal className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" stagger y={16}>
            <TrustItem icon={Truck} title="Бесплатная доставка" text={`от ${formatMoney(settings.freeDeliveryThresholdKopecks)} по России`} />
            <TrustItem icon={ShieldCheck} title="Сертифицировано" text="Соответствует требованиям ЕАЭС" />
            <TrustItem icon={Leaf} title="Натуральный состав" text="Производство ООО «Восток», Россия" />
          </Reveal>
        </Container>
      </Section>

      {/* ── Распродажа (яркий анимированный блок) ── */}
      <Section className="py-5">
        <Container>
          <SaleBanner />
        </Container>
      </Section>

      {/* ── Навигация по покупателю: Для кого / Зачем ── */}
      <Section className="py-6">
        <Container className="space-y-8">
          <div>
            <SectionHeader title="Для кого" subtitle="Подберём под вас и вашу семью" />
            <AudienceCards />
          </div>
          <div>
            <SectionHeader title="Зачем" subtitle="Выберите по своей цели — мы подскажем" />
            <CollectionTiles variant="goal" />
          </div>
        </Container>
      </Section>

      {/* ── Категории ── */}
      <Section className="py-6">
        <Container>
          <SectionHeader title="Категории" subtitle="Весь каталог по типам продукции" />
          <CategoryTiles categories={categories} />
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
              title="Товары по акции"
              subtitle="Успейте купить выгодно"
              action={
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link href="/sale">Вся распродажа <ArrowRight className="h-4 w-4" /></Link>
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
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" step={0.09} y={22}>
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/articles/${m.slug}`}
                  className="group overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:ring-brand-200"
                >
                  <div className="overflow-hidden">
                    <SmartImage src={m.coverImage} alt={m.title} ratio="16/9" rounded="rounded-none" label="Обложка статьи" spec="1200×675" imgClassName="transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.05]" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold leading-tight group-hover:text-brand-700">{m.title}</h3>
                    {m.excerpt ? <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{m.excerpt}</p> : null}
                  </div>
                </Link>
              ))}
            </Stagger>
          </Container>
        </Section>
      ) : null}

      {/* ── О компании ── */}
      <Section>
        <Container>
          <Reveal className="relative overflow-hidden rounded-3xl bg-brand-600 text-white" y={28}>
            {/* фирменный градиентный арт вместо пустой заглушки */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(90% 120% at 100% 0%, #3a9447 0%, transparent 55%), radial-gradient(80% 120% at 0% 100%, #1c3f24 0%, transparent 60%)",
              }}
            />
            <div className="relative grid items-center gap-6 p-8 lg:grid-cols-2 lg:p-12">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Компания «ХАЯТ»</h2>
                <p className="mt-3 max-w-prose text-white/90">
                  Мы производим и продаём натуральную фитопродукцию и биологически активные
                  добавки, основанные на знаниях, рецептах и принципах, проверенных временем.
                  Продукция изготавливается из натурального сырья.
                </p>
                <div className="mt-5 grid max-w-md grid-cols-3 gap-3">
                  <Stat value={30} suffix="+" label="лет рецептам" />
                  <Stat value={119} label="товаров в каталоге" />
                  <Stat value={100} suffix="%" label="натуральный состав" />
                </div>
                <Magnetic className="mt-6 inline-block">
                  <Button asChild variant="secondary" className="bg-white text-brand-700 shadow-lg hover:bg-white/90">
                    <Link href="/about">Подробнее о нас</Link>
                  </Button>
                </Magnetic>
              </div>
              <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm lg:min-h-[280px]">
                <Leaf className="h-24 w-24 text-white/70" strokeWidth={1.2} />
                <span className="absolute bottom-4 left-4 text-sm font-semibold text-white/80">
                  Производство ООО «Восток», Россия
                </span>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
    </>
  );
}

function Stat({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold leading-none tracking-tight sm:text-3xl">
        <CountUp to={value} suffix={suffix} />
      </div>
      <div className="mt-1 text-xs leading-tight text-white/75">{label}</div>
    </div>
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
