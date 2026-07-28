import Image from "next/image";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src?: string | null;
  alt: string;
  /** Соотношение сторон, напр. "1/1", "16/9", "4/5". */
  ratio?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Подпись на заглушке (что за изображение). Показывается при showLabel. */
  label?: string;
  /** Рекомендуемый размер для генерации, напр. "1000×1000". Виден только при debug. */
  spec?: string;
  /** Показать подпись label на заглушке (по умолчанию скрыта на витрине). */
  showLabel?: boolean;
  /** Режим админки: выводит spec-подсказку на заглушке. */
  debug?: boolean;
  rounded?: string;
}

/**
 * Дуэты фона заглушки (gradient 135deg) — только зелёная гамма бренда и
 * янтарь акцента. Раньше в наборе были лаванда и персик: сетка категорий без
 * фотографий получалась сиренево-розовой и к марке отношения не имела.
 * Заглушка не должна вводить в палитру цвета, которых у марки нет.
 */
const PLACEHOLDER_DUOS: ReadonlyArray<readonly [string, string]> = [
  ["#E7F0E4", "#D3E5CE"], // шалфей
  ["#F8EFD9", "#F0E0B8"], // мёд
  ["#E4F2EF", "#CBE6E0"], // мята
  ["#DFEBDD", "#C6DCC3"], // хвоя
  ["#F1F3EA", "#E1E7D6"], // лён
];

/** Фирменный лист — тот же path, что в логотипе (src/components/site/logo.tsx). */
const LEAF_PATH =
  "M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z";

/** Детерминированный хеш строки (djb2) — стабильный выбор дуэта по названию. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Универсальное изображение с «умной» заглушкой.
 *
 * Пока `src` не задан — рисует фирменную «этикетку»: мягкий природный градиент
 * (детерминированный по названию), крупный полупрозрачный лист из логотипа и
 * первую букву названия. Как только в БД появляется URL картинки, она встаёт
 * на место заглушки без изменения вёрстки.
 *
 * Соотношения сторон по типам контента описаны в `docs/image-spec.md`.
 */
export function SmartImage({
  src,
  alt,
  ratio = "1/1",
  className,
  imgClassName,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority,
  label,
  spec,
  showLabel = false,
  debug = false,
  rounded = "rounded-xl",
}: SmartImageProps) {
  const seed = (label || alt || "").trim();
  const [from, to] = PLACEHOLDER_DUOS[hashString(seed) % PLACEHOLDER_DUOS.length];
  // Буква — от первого значимого слова: «Для похудения» → «П», а не «Д» у
  // половины плиток подряд.
  const STOP_WORDS = new Set(["для", "и", "на", "по", "от", "из", "с", "в"]);
  const meaningful =
    seed
      .split(/\s+/)
      .find((w) => !STOP_WORDS.has(w.toLowerCase().replace(/[^а-яёa-z]/gi, ""))) || seed;
  const letter = meaningful.charAt(0).toUpperCase();

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-soft", rounded, className)}
      style={{ aspectRatio: ratio.replace("/", " / ") }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imgClassName)}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 -rotate-6"
            fill="var(--color-brand-900)"
            fillOpacity={0.12}
          >
            <path d={LEAF_PATH} />
          </svg>
          {letter ? (
            <span className="relative text-3xl font-extrabold leading-none text-ink/40 sm:text-4xl">
              {letter}
            </span>
          ) : null}
          {showLabel && label ? (
            <span className="relative max-w-full truncate text-xs font-semibold text-ink/55">
              {label}
            </span>
          ) : null}
          {debug && spec ? (
            <span className="relative text-[10px] font-medium text-ink/40">{spec}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
