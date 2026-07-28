import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {/* Админка остаётся на гротеске: дисплейный сериф — голос витрины,
            в рабочем инструменте он только мешает быстрому сканированию. */}
        <h1 className="font-sans text-2xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface p-5 ring-1 ring-line", className)}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "rounded-2xl p-5 ring-1 transition",
        accent ? "bg-brand-500 text-white ring-brand-500" : "bg-surface ring-line hover:shadow-sm",
      )}
    >
      <div className={cn("text-sm font-medium", accent ? "text-white/80" : "text-ink-muted")}>
        {label}
      </div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-soft py-14 text-center text-ink-muted ring-1 ring-line">
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "amber" | "blue";
}) {
  const tones = {
    neutral: "bg-surface-sunken text-ink-muted",
    green: "bg-brand-50 text-brand-700",
    red: "bg-danger/10 text-danger",
    amber: "bg-accent-50 text-accent-600",
    blue: "bg-info/10 text-info",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>
      {children}
    </span>
  );
}
