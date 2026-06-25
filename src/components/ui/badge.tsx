import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "sale" | "neutral" | "success";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent-100 text-accent-700",
  sale: "bg-sale text-white",
  neutral: "bg-surface-sunken text-ink-muted",
  success: "bg-brand-500 text-white",
};

export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
