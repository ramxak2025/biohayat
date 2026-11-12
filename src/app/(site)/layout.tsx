import { CartProvider } from "@/components/cart/cart-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { FooterVisibility } from "@/components/site/footer-visibility";
import { IOSViewportFix } from "@/components/site/ios-viewport-fix";
import { ScrollManager } from "@/components/site/scroll-manager";
import { ReferralCapture } from "@/components/site/referral-capture";
import { PrefetchOnIntent } from "@/components/site/prefetch-on-intent";
import { MobileNav } from "@/components/site/mobile-nav";
import { BackToTop } from "@/components/site/back-to-top";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
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
  const settings = await getSettings();

  return (
    <CartProvider>
      <FavoritesProvider>
        <div id="app-scroll" className="flex min-h-0 flex-1 flex-col lg:contents">
          <Header phone={settings.phone} wildberries={settings.wildberries} />
          <main className="flex-1">{children}</main>
          {/* В ЛК на мобильном футера нет — ощущение нативного приложения */}
          <FooterVisibility>
            <Footer settings={settings} />
          </FooterVisibility>
        </div>
        <ScrollManager />
        <ReferralCapture />
        {/* Списочные ссылки грузятся по наведению/касанию, а не пачкой при
            появлении на экране (см. ListLink) */}
        <PrefetchOnIntent />
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
