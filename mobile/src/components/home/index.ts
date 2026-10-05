/** Блоки главной. Экран собирает их сверху вниз и ничего не рисует сам. */
export { HomeSection, type HomeSectionProps } from "./home-section";
export { HomeChroma, type HomeChromaProps } from "./home-chroma";
export { HeroCarousel, useHeroHeight, type HeroCarouselProps } from "./hero-carousel";
export { CategoryRail, type CategoryRailProps } from "./category-rail";
export { TaxonomyRail, type TaxonomyRailProps } from "./taxonomy-rail";
export { PromoStrip, type PromoStripProps } from "./promo-strip";
export { ArticlesRail, type ArticlesRailProps } from "./articles-rail";
export { TrustBlock, type TrustBlockProps } from "./trust-block";
export { useBannerNavigate, openExternal, type BannerNavigate } from "./banner-link";
export { sfSymbolFor, FALLBACK_SYMBOL } from "./icon-map";
