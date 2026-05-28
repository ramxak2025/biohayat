import { Container } from "./container";
import { cn } from "@/lib/utils";

export function PageHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-line bg-surface-soft py-8 sm:py-12">
      <Container>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-ink-muted">{subtitle}</p> : null}
      </Container>
    </div>
  );
}

/** Типографика для статей и юридических текстов. */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl leading-relaxed text-ink-muted",
        "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink",
        "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink",
        "[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1.5",
        "[&_a]:text-brand-700 [&_a]:underline",
        className,
      )}
    >
      {children}
    </div>
  );
}
