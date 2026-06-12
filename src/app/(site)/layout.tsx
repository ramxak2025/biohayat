import { CartProvider } from "@/components/cart/cart-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { FooterVisibility } from "@/components/site/footer-visibility";
import { IOSViewportFix } from "@/components/site/ios-viewport-fix";
import { ScrollManager } from "@/components/site/scroll-manager";
import { ReferralCapture } from "@/components/site/referral-capture";
import { MobileNav } from "@/components/site/mobile-nav";
import { MobileHeader } from "@/components/site/mobile-header";
import { BackToTop } from "@/components/site/back-to-top";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
import { getNavCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

// Layout намеренно НЕ использует cookies()/headers() и не задаёт dynamic:
// данные берутся из unstable_cache (getNavCategories/getSettings), поэтому
// публичные страницы под этим layout могут отдаваться статически (ISR).
// Состояние «вошёл/не вошёл» Header и FavoritesProvider читают на клиенте
// из не-httpOnly cookie-флага hayat_auth (см. src/lib/customer-auth.ts).
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings] = await Promise.all([
    getNavCategories(),
    getSettings(),
  ]);
  const navCats = categories.map((c) => ({ slug: c.slug, name: c.name }));

  // Избранное не запрашиваем в layout (это БД-запрос на каждый просмотр любой
  // страницы): FavoritesProvider сам подтянет id через server action после
  // монтирования.
  return (
    <CartProvider>
      <FavoritesProvider>
        {/* Шапка только на десктопе (скрытие — на самом header, иначе
            обёртка ломает position: sticky) */}
        <Header phone={settings.phone} workingHours={settings.workingHours} categories={navCats} />
        {/* Мобайл: скроллится этот контейнер, а не body (стабильные бары);
            на десктопе lg:contents растворяет обёртку и скроллится body */}
        <div id="app-scroll" className="flex min-h-0 flex-1 flex-col lg:contents">
          <MobileHeader />
          <main className="flex-1">{children}</main>
          {/* В ЛК на мобильном футера нет — ощущение нативного приложения */}
          <FooterVisibility>
            <Footer settings={settings} categories={navCats} />
          </FooterVisibility>
        </div>
        <ScrollManager />
        <ReferralCapture />
        {/* Пере-привязка fixed/sticky после клавиатуры iOS */}
        <IOSViewportFix />
        <MobileNav />
        <BackToTop />
        <CookieConsent />
        {settings.bitrixEnabled && settings.bitrixChatCode ? (
          <ChatWidget code={settings.bitrixChatCode} />
        ) : null}
      </FavoritesProvider>
    </CartProvider>
  );
}
