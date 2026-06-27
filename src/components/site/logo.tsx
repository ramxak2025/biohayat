import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Логотип ХАЯТ — фирменный знак (дерево с качелями в круге) + текстовый
 * вордмарк. Знак — растровый PNG из брендбука; «ХАЯТ» рендерится текстом,
 * чтобы оставаться идеально чётким на любом размере.
 *
 * variant="white" — для тёмных подложек (текст белый, знак белый).
 */
export function Logo({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "white";
}) {
  const white = variant === "white";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={white ? "/brand/logo-mark-white.png" : "/brand/logo-mark.png"}
        alt="ХАЯТ"
        width={40}
        height={40}
        className="h-9 w-9 shrink-0"
        priority
      />
      <span className="flex flex-col leading-none">
        <span className={cn("text-xl font-bold tracking-tight", white ? "text-white" : "text-ink")}>
          ХАЯТ
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.22em]",
            white ? "text-white/70" : "text-brand-600",
          )}
        >
          biohayat
        </span>
      </span>
    </span>
  );
}
