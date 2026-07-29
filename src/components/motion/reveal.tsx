import { cn } from "@/lib/utils";

type As = "div" | "section" | "ul" | "ol";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Тег-обёртка (по умолчанию div). */
  as?: As;
  /** Анимировать прямых детей каскадом (stagger) вместо блока целиком. */
  stagger?: boolean;
  /** Оставлены для совместимости вызовов: шаг и сдвиг теперь заданы в CSS. */
  step?: number;
  y?: number;
  trigger?: "scroll" | "load";
  delay?: number;
}

/**
 * Плавное появление секции или каскад по её детям — на CSS.
 *
 * Раньше это делал GSAP: в layout-эффекте элементам ставилась
 * opacity: 0, и оттуда они выводились. Два дорогих следствия:
 *
 * 1. До загрузки и выполнения JS контент был невидим. Ровно так на телефонах
 *    однажды пропали все секции ниже первого экрана: заголовок и пустота под
 *    ним. Скрытый контент в магазине хуже, чем отсутствие эффекта.
 * 2. Скрытый элемент не засчитывается в LCP, а под Reveal попадали и крупные
 *    блоки первого экрана — метрика ждала 72 КБ GSAP.
 *
 * CSS-анимация запускается вместе с первой отрисовкой, ничего не ждёт и не
 * может «не сработать». Это же снимает клиентский компонент: обёртка теперь
 * серверная и не добавляет ни байта JS.
 *
 * prefers-reduced-motion уважается правилом в globals.css.
 */
export function Reveal({ children, className, as = "div", stagger = false }: RevealProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag className={cn(stagger ? "reveal-stagger" : "reveal", className)}>{children}</Tag>
  );
}

/** Каскадная сетка: обёртка сама является grid-контейнером, дети появляются волной. */
export function Stagger({ children, className }: Omit<RevealProps, "stagger" | "as">) {
  return (
    <Reveal stagger className={className}>
      {children}
    </Reveal>
  );
}
