import type { Metadata } from "next";
import { OptHeader } from "@/components/opt/opt-header";
import { OptFooter } from "@/components/opt/opt-footer";
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

  return (
    <>
      <OptHeader
        phone={settings.phone}
        account={
          account
            ? { company: account.company, approved: account.status === "APPROVED" }
            : null
        }
      />
      <main className="flex-1 bg-bg">{children}</main>
      <OptFooter settings={settings} />
    </>
  );
}
