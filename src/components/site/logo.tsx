import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Логотип ХАЯТ — фирменный знак (дерево с качелями в круге) + текстовый вордмарк.
 * Знак — растровый PNG из брендбука; «ХАЯТ» рендерится текстом для идеальной
 * чёткости на любом размере. tone="inverted" — для тёмных подложек (футер).
 */
export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverted";
}) {
  const inverted = tone === "inverted";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={inverted ? "/brand/logo-mark-white.png" : "/brand/logo-mark.png"}
        alt="ХАЯТ"
        width={56}
        height={56}
        className="h-11 w-11 shrink-0"
        // priority только у знака в шапке. Инвертированный вариант живёт в
        // футере, до него ещё нужно долистать — его предзагрузка отнимала
        // канал у первого экрана.
        priority={!inverted}
        loading={inverted ? "lazy" : undefined}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-xl font-extrabold tracking-tight",
            inverted ? "text-white" : "text-ink",
          )}
        >
          ХАЯТ
        </span>
        <span
          className={cn(
            "mt-0.5 text-xs font-medium lowercase tracking-[0.16em]",
            inverted ? "text-brand-200" : "text-brand-600",
          )}
        >
          biohayat
        </span>
      </span>
    </span>
  );
}
