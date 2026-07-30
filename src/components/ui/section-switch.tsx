import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Переключатель раздела: «Розница | Опт».
 *
 * Один компонент на оба сайта, на одинаковом месте — в начале верхней полосы.
 * Раньше вход в опт был единственной ссылкой 13px в служебном ряду розничной
 * шапки, между «Доставкой» и «Контактами», а обратной дороги на десктопе опта
 * не было вовсе — только строка в подвале.
 *
 * Почему парная форма, а не просто заметная ссылка: одиночная ссылка
 * «Оптовым покупателям» называет только пункт назначения. Переключатель
 * заодно показывает, где ты сейчас, — и поэтому решает обе задачи разом,
 * в обе стороны, одной и той же деталью на том же месте.
 *
 * Подписи короткие: полная формулировка живёт в title, иначе пара не
 * помещается в полосу на 1024px. Кегль 13px — тот же, что у всей полосы
 * доверия; заметность даёт форма и заливка активного сегмента, а не размер.
 */
export function SectionSwitch({
  active,
  retailUrl,
  tone = "dark",
  className,
}: {
  active: "retail" | "opt";
  /** Абсолютный адрес розницы: на поддомене опта «/» ведёт обратно в опт. */
  retailUrl: string;
  /** dark — на тёмной полосе доверия, light — на светлой мобильной шапке. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  // 24px — минимальный размер цели по WCAG 2.2 (Target Size, Minimum).
  // Выше поднимать нельзя: полоса доверия 36px, и переключатель на 32px
  // упирался бы в её края (аудит: cramped-padding).
  const seg = "flex h-6 items-center rounded-full px-3.5 text-[13px] font-bold leading-none transition";
  const on = dark ? "bg-white text-brand-900" : "bg-brand-500 text-white";
  const off = dark
    ? "text-brand-100/80 hover:text-white"
    : "text-ink-muted hover:text-ink";

  return (
    <nav
      aria-label="Раздел сайта"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full p-0.5",
        dark ? "h-7 bg-white/10 ring-1 ring-white/15" : "h-8 bg-surface-soft",
        className,
      )}
    >
      <a
        href={retailUrl}
        data-to-retail={active === "opt" ? "" : undefined}
        aria-current={active === "retail" ? "page" : undefined}
        title="Розничный магазин — купить поштучно"
        className={cn(seg, !dark && "h-7", active === "retail" ? on : off)}
      >
        Розница
      </a>
      <Link
        href="/opt"
        data-to-opt={active === "retail" ? "" : undefined}
        aria-current={active === "opt" ? "page" : undefined}
        title="Оптовый отдел — цены производителя от 10 шт"
        className={cn(seg, !dark && "h-7", active === "opt" ? on : off)}
      >
        Опт
      </Link>
    </nav>
  );
}
