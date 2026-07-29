import { ListLink as Link } from "@/components/ui/list-link";
import { ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";

/**
 * Текстовая часть героя.
 *
 * Появление сделано на CSS (keyframes hero-in в globals.css), а не на GSAP, и
 * без изменения прозрачности — только сдвиг. Причина конкретная: заголовок
 * героя — самый крупный элемент первого экрана, по нему браузер считает LCP.
 * Скрытый элемент в LCP не засчитывается, поэтому прежний вариант с
 * opacity: 0 из JS откладывал метрику до загрузки и выполнения 72 КБ GSAP —
 * на медленной сети это около 700 мс пустого ожидания.
 *
 * Заодно компонент перестал быть клиентским: анимация не требует JS,
 * «магнитная» кнопка живёт в собственном клиентском компоненте.
 */
export function HeroIntro({
  title,
  subtitle,
  ctaLabel,
  link,
}: {
  title?: string | null;
  subtitle?: string | null;
  ctaLabel?: string | null;
  link?: string | null;
}) {
  return (
    <div className="max-w-xl">
      <span
        data-hero-item
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur"
      >
        <Leaf className="h-3.5 w-3.5" aria-hidden /> Натурально · Проверено временем
      </span>

      <h1
        data-hero-item
        className="mt-3 text-[28px] font-extrabold leading-tight sm:text-4xl lg:text-5xl"
      >
        {title || "Витамины и фитопродукция для всей семьи"}
      </h1>

      {/* Подзаголовок сплошным белым, без прозрачности: за текстом лежит
          светлый лист-водяной знак, и на его светлых участках white/85 падал
          до 1.4:1. Сплошной белый держит 6.4:1 на всей площади. */}
      <p data-hero-item className="mt-2.5 max-w-md text-sm text-white sm:text-base lg:text-lg">
        {subtitle || "Свой состав, свои стандарты, своё производство в России — с 2005 года"}
      </p>

      <div data-hero-item className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7 sm:gap-3">
        {/* «Магнитная» кнопка — только для мыши, на тач-устройствах не мешает тапу */}
        <Magnetic>
          <Button
            asChild
            variant="secondary"
            className="bg-white text-brand-700 shadow-sm hover:bg-white/90"
          >
            <Link href={link || "/catalog"}>
              {ctaLabel || "Подобрать средство"} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </Magnetic>
        <Link
          href="/sale"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white/90 ring-1 ring-white/30 transition hover:bg-white/10 hover:text-white"
        >
          Со скидкой до −40% <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
