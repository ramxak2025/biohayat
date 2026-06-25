import { Container } from "@/components/ui/container";

/** Серый прямоугольник-плейсхолдер с пульсацией. */
function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-sunken ${className ?? ""}`} />;
}

/** Карточка-заглушка. */
function CardSkeleton({ children }: { children?: React.ReactNode }) {
  return <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">{children}</div>;
}

/**
 * Каркас экрана ЛК на время загрузки: повторяет сетку AccountShell
 * (боковое меню + контент), но контент задаётся через children.
 */
function ShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
            <div className="h-11 w-11 animate-pulse rounded-full bg-surface-sunken" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-2/3" />
              <Bar className="h-3 w-1/2" />
            </div>
          </div>
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 7 }).map((_, i) => (
              <Bar key={i} className="h-10 w-full" />
            ))}
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

/** Базовый скелет: заголовок + несколько карточек. */
export function AccountSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <ShellSkeleton>
      <Bar className="mb-6 h-8 w-48" />
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i}>
            <div className="flex items-center justify-between gap-3">
              <Bar className="h-5 w-40" />
              <Bar className="h-5 w-24" />
            </div>
            <Bar className="mt-4 h-1.5 w-full" />
            <div className="mt-4 space-y-2">
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-5/6" />
            </div>
          </CardSkeleton>
        ))}
      </div>
    </ShellSkeleton>
  );
}

/** Скелет сетки товаров (избранное). */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ShellSkeleton>
      <Bar className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            <Bar className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3.5">
              <Bar className="h-3 w-1/3" />
              <Bar className="h-4 w-5/6" />
              <Bar className="mt-2 h-9 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </ShellSkeleton>
  );
}

/** Скелет формы (профиль). */
export function FormSkeleton() {
  return (
    <ShellSkeleton>
      <Bar className="mb-6 h-8 w-48" />
      <div className="max-w-lg space-y-4">
        <CardSkeleton>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3.5 w-24" />
                <Bar className="h-11 w-full rounded-xl" />
              </div>
            ))}
            <Bar className="h-12 w-40 rounded-full" />
          </div>
        </CardSkeleton>
      </div>
    </ShellSkeleton>
  );
}
