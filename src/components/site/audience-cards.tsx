import Link from "next/link";
import { Mars, Venus, Baby, ArrowRight } from "lucide-react";
import { Stagger } from "@/components/motion/reveal";

/**
 * Блок «Для кого» — крупные карточки по аудитории с формулировкой выгоды
 * (приём из психологии продаж: клиент сразу узнаёт «это для меня»).
 */
const AUDIENCE_CARDS = [
  { slug: "men", name: "Мужчинам", benefit: "Сила, энергия, тонус", icon: Mars },
  { slug: "women", name: "Женщинам", benefit: "Красота, баланс, лёгкость", icon: Venus },
  { slug: "kids", name: "Детям", benefit: "Рост, иммунитет, развитие", icon: Baby },
];

export function AudienceCards() {
  return (
    <Stagger className="grid gap-3 sm:grid-cols-3 sm:gap-4" step={0.09} y={22}>
      {AUDIENCE_CARDS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.slug}
            href={`/for/${a.slug}`}
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-surface p-4 shadow-xs ring-1 ring-line transition duration-300 ease-out hover:-translate-y-1 hover:ring-brand-300 hover:shadow-lg sm:flex-col sm:items-start sm:p-5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition duration-300 group-hover:bg-brand-500 group-hover:text-white motion-safe:group-hover:scale-110">
              <Icon className="h-7 w-7" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-lg font-extrabold text-ink">
                {a.name}
                <ArrowRight className="h-4 w-4 text-brand-500 transition group-hover:translate-x-0.5" />
              </span>
              <span className="mt-0.5 block text-sm text-ink-muted">{a.benefit}</span>
            </span>
          </Link>
        );
      })}
    </Stagger>
  );
}
