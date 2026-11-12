import { ArrowRight, ArrowUpRight, BookOpen, ListChecks, Truck } from "lucide-react";
import { ListLink as Link } from "@/components/ui/list-link";
import { Container } from "@/components/ui/container";
import { SmartImage } from "@/components/ui/smart-image";
import { DirectionArches } from "@/components/site/direction-arches";
import { VysotaPhoto } from "@/components/site/vysota-photo";
import { BrandStrip } from "@/components/site/brand-strip";
import { Stories } from "@/components/site/stories";
import { ProductGrid } from "@/components/product/product-card";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { getActiveStories, getBanners, getProducts, getPublishedMaterials } from "@/lib/queries";
import { getFeaturedBrands } from "@/lib/brands";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [selection, sale, banners, articles, settings, stories, brands] = await Promise.all([
    getProducts({ inStock: true, take: 4 }),
    getProducts({ onSale: true, take: 4 }),
    getBanners("HERO"),
    getPublishedMaterials(3),
    getSettings(),
    getActiveStories(),
    getFeaturedBrands(),
  ]);

  return (
    <>
      <section className="vysota-dark vysota-hero home-hero">
        <VysotaPhoto scene="hero" primary />
        <Container className="home-hero-content">
          <h1>Природа —<br /> в точной дозе</h1>
          <div className="home-hero-panel glass">
            <p>Традиционные рецепты и точные дозировки в одном каталоге.</p>
            <ul>
              <li><Truck size={20} strokeWidth={1.6} aria-hidden="true" /> <Link href="/delivery">Доставка и оплата</Link></li>
              <li><ListChecks size={20} strokeWidth={1.6} aria-hidden="true" /> <Link href="/quiz">Подбор по вашим целям</Link></li>
              <li><BookOpen size={20} strokeWidth={1.6} aria-hidden="true" /> <Link href="/articles">Статьи о составе и применении</Link></li>
            </ul>
            <Link href="/catalog" className="vysota-button vysota-button-light">
              Перейти в каталог <ArrowRight size={19} strokeWidth={1.6} aria-hidden="true" />
            </Link>
            <Link href="/about" className="vysota-button vysota-button-outline">О компании</Link>
          </div>
        </Container>
      </section>

      <DirectionArches />

      {selection.items.length > 0 ? (
        <section className="lt vysota-section" aria-labelledby="home-catalog-heading">
          <Container>
            <div className="vysota-section-heading">
              <h2 id="home-catalog-heading" className="vysota-heading">Из каталога</h2>
              <Link href="/catalog" className="vysota-button vysota-button-plain">Весь каталог <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
            <ProductGrid products={selection.items} />
          </Container>
        </section>
      ) : null}

      <section className="vysota-dark vysota-section bg-night text-mist">
        <Container className="home-help">
          <h2 className="vysota-heading">Поможем с выбором</h2>
          <div>
            <p className="max-w-prose text-lg text-mist/80">Подберите товары по своим целям или задайте вопрос о составе и применении.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/quiz" className="vysota-button vysota-button-light">Пройти подбор <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/account/consultation" className="vysota-button vysota-button-outline">Консультация</Link>
            </div>
          </div>
        </Container>
      </section>

      {settings.wildberries ? (
        <section className="vysota-dark vysota-section marketplace-section">
          <VysotaPhoto scene="sport" className="marketplace-photo" />
          <Container className="relative z-10 home-help">
            <h2 className="vysota-heading">На маркетплейсе</h2>
            <div className="glass-dark rounded-[var(--r-xl)] p-6 sm:p-8">
              <p className="mb-4 text-lg">Цены и наличие указаны в карточках товаров.</p>
              <a href={settings.wildberries} target="_blank" rel="noreferrer" className="vysota-button vysota-button-light">
                Wildberries <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </Container>
        </section>
      ) : null}

      {banners.length || stories.length || sale.items.length ? (
        <section className="lt vysota-section border-b border-line">
          <Container>
            <div className="vysota-section-heading">
              <h2 className="vysota-heading">Предложения</h2>
              {sale.items.length ? <Link href="/sale" className="vysota-button vysota-button-plain">Все акции <ArrowRight size={18} aria-hidden="true" /></Link> : null}
            </div>
            {stories.length ? <div className="mb-6 lg:hidden"><Stories stories={stories} /></div> : null}
            {banners.length ? (
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {banners.map((banner) => (
                  <article key={banner.id} className="flex flex-col items-start rounded-[var(--r-lg)] border border-line bg-white p-5">
                    {banner.image ? <SmartImage src={banner.image} alt="" ratio="16/7" className="mb-4 w-full" /> : null}
                    <h3 className="text-lg font-semibold">{banner.title}</h3>
                    {banner.subtitle ? <p className="mt-1 text-ink-muted">{banner.subtitle}</p> : null}
                    {banner.link ? <Link href={banner.link} className="vysota-button vysota-button-plain mt-4">{banner.ctaLabel || "Подробнее"}</Link> : null}
                  </article>
                ))}
              </div>
            ) : null}
            {sale.items.length ? <ProductGrid products={sale.items} /> : null}
          </Container>
        </section>
      ) : null}

      <Container><RecentlyViewed className="py-8 sm:py-14" /></Container>

      {articles.length > 0 || brands.length > 0 ? (
        <section className="lt vysota-section bg-mist-2">
          <Container>
            {articles.length ? (
              <>
                <div className="vysota-section-heading">
                  <h2 className="vysota-heading">Статьи</h2>
                  <Link href="/articles" className="vysota-button vysota-button-plain">Все статьи <ArrowRight size={18} aria-hidden="true" /></Link>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.map((article) => (
                    <Link href={`/articles/${article.slug}`} key={article.id} className="vysota-article">
                      {article.coverImage ? <SmartImage src={article.coverImage} alt="" ratio="16/10" rounded="rounded-2xl" /> : null}
                      <h3>{article.title}</h3>
                      {article.excerpt ? <p>{article.excerpt}</p> : null}
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
            {brands.length ? <div className={articles.length ? "mt-12" : undefined}><BrandStrip brands={brands} /></div> : null}
          </Container>
        </section>
      ) : null}

      <section className="border-t border-line bg-white py-7">
        <Container className="flex flex-wrap items-center justify-between gap-3">
          <p>Бесплатная доставка при заказе от {formatMoney(settings.freeDeliveryThresholdKopecks)}</p>
          <Link href="/delivery" className="vysota-button vysota-button-plain">Условия доставки <ArrowRight size={18} aria-hidden="true" /></Link>
        </Container>
      </section>
    </>
  );
}
