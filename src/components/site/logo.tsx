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
        width={40}
        height={40}
        className="h-9 w-9 shrink-0"
        priority
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight",
            inverted ? "text-white" : "text-ink",
          )}
        >
          ХАЯТ
        </span>
        <span
          className={cn(
            "mt-0.5 text-[11px] font-medium lowercase tracking-[0.18em]",
            inverted ? "text-brand-200" : "text-brand-600",
          )}
        >
          biohayat
        </span>
      </span>
    </span>
  );
}
