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
  /** Подпись на заглушке (что за изображение). */
  label?: string;
  /** Рекомендуемый размер для генерации, напр. "1000×1000". */
  spec?: string;
  rounded?: string;
}

/**
 * Универсальное изображение с «умной» заглушкой.
 *
 * Пока `src` не задан — рисует фирменную заглушку с подписью и рекомендованным
 * размером. Как только в БД появляется URL картинки (нужного соотношения сторон),
 * она встаёт на место заглушки без изменения вёрстки.
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
  rounded = "rounded-xl",
}: SmartImageProps) {
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
        <div className="img-placeholder absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center">
          <svg
            className="h-8 w-8 text-brand-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 3.75h16.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z"
            />
          </svg>
          {label ? (
            <span className="text-xs font-semibold text-brand-700/80 leading-tight">
              {label}
            </span>
          ) : null}
          {spec ? <span className="text-[10px] text-ink-faint">{spec}</span> : null}
        </div>
      )}
    </div>
  );
}
