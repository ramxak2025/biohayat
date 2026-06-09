import { CartProvider } from "@/components/cart/cart-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileNav } from "@/components/site/mobile-nav";
import { MobileSearch } from "@/components/site/mobile-search";
import { BackToTop } from "@/components/site/back-to-top";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
import { getNavCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";

// Публичные страницы рендерятся на лету (контент управляется из админки),
// поэтому сборка не требует доступа к базе данных.
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings, session] = await Promise.all([
    getNavCategories(),
    getSettings(),
    getCustomerSession(),
  ]);
  const navCats = categories.map((c) => ({ slug: c.slug, name: c.name }));

  // Избранное не запрашиваем в layout (это БД-запрос на каждый просмотр любой
  // страницы): FavoritesProvider сам подтянет id через server action после
  // монтирования. getCustomerSession — только проверка JWT из cookie, без БД.
  return (
    <CartProvider>
      <FavoritesProvider loggedIn={!!session}>
        {/* Шапка только на десктопе — на мобильном навигация снизу */}
        <div className="hidden lg:block">
          <Header phone={settings.phone} loggedIn={!!session} />
        </div>
        <MobileSearch />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} categories={navCats} />
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
