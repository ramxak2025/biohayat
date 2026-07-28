import Link from "next/link";
import { Mars, Venus, Baby, type LucideIcon } from "lucide-react";
import { Stagger } from "@/components/motion/reveal";

/**
 * Блок «Для кого» — три компактные мини-плитки в ряд: клиент сразу узнаёт
 * «это для меня», не теряя целый экран на навигацию (mobile-first).
 * Экспортируется и для хаба каталога (единый паттерн).
 */
export const AUDIENCE_CARDS: ReadonlyArray<{
  slug: string;
  name: string;
  benefit: string;
  icon: LucideIcon;
}> = [
  { slug: "men", name: "Мужчинам", benefit: "Сила, энергия, тонус", icon: Mars },
  { slug: "women", name: "Женщинам", benefit: "Красота, баланс, лёгкость", icon: Venus },
  { slug: "kids", name: "Детям", benefit: "Рост, иммунитет, развитие", icon: Baby },
];

export function AudienceCards() {
  return (
    <Stagger className="grid grid-cols-3 gap-2.5 sm:gap-4" step={0.09} y={22}>
      {AUDIENCE_CARDS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.slug}
            href={`/for/${a.slug}`}
            className="group flex flex-col items-center gap-1 rounded-2xl bg-surface px-2 py-3.5 text-center shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md active:bg-brand-50 sm:py-5"
          >
            <span className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white sm:h-12 sm:w-12 sm:rounded-2xl">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="text-sm font-bold leading-tight text-ink">{a.name}</span>
            <span className="line-clamp-1 max-w-full text-[11px] leading-tight text-ink-muted">
              {a.benefit}
            </span>
          </Link>
        );
      })}
    </Stagger>
  );
}
