import { Package } from "lucide-react";
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
        >
          <Package className="size-9 text-ink-muted" aria-hidden="true" strokeWidth={1.5} />
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
