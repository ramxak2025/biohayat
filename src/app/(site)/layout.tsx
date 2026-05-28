import { CartProvider } from "@/components/cart/cart-provider";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileNav } from "@/components/site/mobile-nav";
import { ChatWidget } from "@/components/site/chat-widget";
import { CookieConsent } from "@/components/site/cookie-consent";
import { getNavCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, settings] = await Promise.all([getNavCategories(), getSettings()]);
  const navCats = categories.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <CartProvider>
      <Header categories={navCats} phone={settings.phone} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} categories={navCats} />
      <MobileNav />
      <CookieConsent />
      {settings.bitrixEnabled && settings.bitrixChatCode ? (
        <ChatWidget code={settings.bitrixChatCode} />
      ) : null}
    </CartProvider>
  );
}
