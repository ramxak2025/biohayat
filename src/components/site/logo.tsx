import { cn } from "@/lib/utils";

/**
 * Логотип ХАЯТ — текстовый знак с листом.
 * Заглушка до получения фирменного логотипа (SVG/PNG, прозрачный фон, ~160×40).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-brand">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-xl font-extrabold tracking-tight text-ink">ХАЯТ</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-600">
          biohayat
        </span>
      </span>
    </span>
  );
}
