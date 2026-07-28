import Link from "next/link";
import { Mars, Venus, Baby, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

/**
 * Блок «Для кого» — переключатель на три сегмента в одной плашке.
 *
 * Было три одинаковые карточки «иконка + заголовок + подпись» — самый частый
 * способ занять экран, ничего им не сказав: три отдельные плашки читаются как
 * три раздела сайта, хотя это один выбор из трёх. Один блок с разделителями
 * говорит правду о механике (выберите одно) и занимает вдвое меньше высоты.
 *
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
  // Появляется целиком, а не каскадом по сегментам: это один элемент
  // управления, и разъезжающиеся по очереди сегменты читались бы как сбой.
  return (
    <Reveal className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl bg-surface shadow-xs ring-1 ring-line">
      {AUDIENCE_CARDS.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.slug}
            href={`/for/${a.slug}`}
            className="group flex min-h-14 items-center justify-center gap-2.5 px-2 py-3.5 text-center transition hover:bg-brand-50 active:bg-brand-100 sm:gap-3 sm:px-4"
          >
            <Icon
              className="h-5 w-5 shrink-0 text-brand-600 transition group-hover:text-brand-700"
              strokeWidth={1.9}
              aria-hidden
            />
            <span className="min-w-0 text-left">
              <span className="block text-sm font-bold leading-tight text-ink sm:text-[15px]">
                {a.name}
              </span>
              <span className="mt-0.5 hidden truncate text-xs leading-tight text-ink-muted sm:block">
                {a.benefit}
              </span>
            </span>
          </Link>
        );
      })}
    </Reveal>
  );
}
