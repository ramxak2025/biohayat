import { cn } from "@/lib/utils";

/**
 * Логотип ХАЯТ — текстовый знак с листом.
 * Знак — лист на мягком градиентном «сквиркле», подпись biohayat с аккуратным
 * разрядным трекингом. tone="inverted" — для тёмных подложек (футер).
 * Заглушка до получения фирменного логотипа (SVG/PNG, прозрачный фон, ~160×40).
 */
export function Logo({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverted";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-600 to-brand-500 text-white shadow-brand">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
          <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight",
            tone === "inverted" ? "text-white" : "text-ink",
          )}
        >
          ХАЯТ
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-medium lowercase tracking-[0.18em]",
            tone === "inverted" ? "text-brand-200" : "text-brand-600",
          )}
        >
          biohayat
        </span>
      </span>
    </span>
  );
}
