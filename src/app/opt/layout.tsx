import type { Metadata } from "next";
import { OptHeader } from "@/components/opt/opt-header";
import { OptFooter } from "@/components/opt/opt-footer";
import { OptMobileNav } from "@/components/opt/opt-mobile-nav";
import { B2BCartProvider } from "@/components/opt/b2b-cart-provider";
import { getB2BAccount } from "@/lib/b2b-auth";
import { getSettings } from "@/lib/settings";

/**
 * Layout оптового поддомена (opt.biohayat.ru → route-группа /opt, см. proxy.ts).
 * Полностью независим от розницы: без корзины, избранного и мобильной
 * навигации — только шапка, контент и футер. Шапка показывает состояние
 * B2B-сессии (cookie), поэтому всё поддерево рендерится динамически.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Оптовые поставки БАД ХАЯТ — прямые цены производителя",
    template: "%s — ХАЯТ Опт",
  },
  description:
    "Оптовые поставки натуральных витаминов и БАД ХАЯТ от производителя ООО «Восток»: 119+ позиций по спец-ценам для партнёров и частников, отгрузка небольшими партиями, доставка по всей России.",
};

export default async function OptLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, account] = await Promise.all([getSettings(), getB2BAccount()]);

  const retailUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

  return (
    <B2BCartProvider>
      <OptHeader
        phone={settings.phone}
        account={
          account
            ? { company: account.company, approved: account.status === "APPROVED" }
            : null
        }
      />
      {/* Нижний отступ на мобильном — под фиксированный бар */}
      <main className="flex-1 bg-bg pb-[calc(var(--spacing-mobnav)+1rem)] lg:pb-0">{children}</main>
      <OptFooter settings={settings} />
      <OptMobileNav
        loggedIn={Boolean(account)}
        approved={account?.status === "APPROVED"}
        phone={settings.phone}
        retailUrl={retailUrl}
      />
    </B2BCartProvider>
  );
}
