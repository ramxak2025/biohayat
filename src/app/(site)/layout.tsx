import { CartProvider } from "@/components/cart/cart-provider";
import { FavoritesProvider } from "@/components/favorites/favorites-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileNav } from "@/components/site/mobile-nav";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
import { getNavCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

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

  const initialFavorites = session
    ? (await prisma.favorite.findMany({ where: { customerId: session.sub }, select: { productId: true } })).map((f) => f.productId)
    : [];

  return (
    <CartProvider>
      <FavoritesProvider loggedIn={!!session} initialIds={initialFavorites}>
        {/* Шапка только на десктопе — на мобильном навигация снизу */}
        <div className="hidden lg:block">
          <Header categories={navCats} phone={settings.phone} loggedIn={!!session} />
        </div>
        <main className="flex-1">{children}</main>
        <Footer settings={settings} categories={navCats} />
        <MobileNav />
        <CookieConsent />
        {settings.bitrixEnabled && settings.bitrixChatCode ? (
          <ChatWidget code={settings.bitrixChatCode} />
        ) : null}
      </FavoritesProvider>
    </CartProvider>
  );
}
