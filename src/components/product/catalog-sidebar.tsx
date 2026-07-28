import Link from "next/link";
import { Tag, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@prisma/client";

/**
 * Левое боковое меню каталога (десктоп): только категории + быстрые пункты
 * «Все товары» и «Распродажа», с подсветкой активного раздела.
 *
 * Sticky-офсет учитывает суммарную высоту десктопной шапки
 * (см. src/components/site/header.tsx): 28px utility-полоса +
 * var(--spacing-header) (72px) основная строка + 36px полоса доверия + 1px
 * граница = 109px, плюс 16px воздуха → top = var(--spacing-header) + 53px = 125px.
 * max-h оставляет ещё 16px снизу, чтобы длинный список скроллился внутри.
 */
export function CatalogSidebar({
  categories,
  activeHref,
  brands = [],
}: {
  categories: (Pick<Category, "slug" | "name"> & { count?: number })[];
  activeHref: string;
  /** Бренды для блока-фильтра (опционально; пусто — блок скрыт). */
  brands?: (Pick<Category, "slug" | "name"> & { count?: number })[];
}) {
  return (
    <aside className="hidden w-[248px] shrink-0 lg:block">
      <div className="sticky top-[calc(var(--spacing-header)+53px)] max-h-[calc(100dvh-var(--spacing-header)-69px)] overflow-y-auto pr-1">
        <Group>
          <Item href="/catalog" active={activeHref === "/catalog"} icon={<LayoutGrid className="h-4 w-4" />}>
            Все товары
          </Item>
          <Item href="/sale" active={activeHref === "/sale"} icon={<Tag className="h-4 w-4" />} tone="sale">
            Распродажа
          </Item>
        </Group>

        <GroupTitle>Категории</GroupTitle>
        <Group>
          {categories.map((c) => (
            <Item
              key={c.slug}
              href={`/category/${c.slug}`}
              active={activeHref === `/category/${c.slug}`}
              count={c.count}
            >
              {c.name}
            </Item>
          ))}
        </Group>

        {brands.length > 0 ? (
          <>
            <GroupTitle>Бренды</GroupTitle>
            <Group>
              {brands.map((b) => (
                <Item
                  key={b.slug}
                  href={`/brand/${b.slug}`}
                  active={activeHref === `/brand/${b.slug}`}
                  count={b.count}
                >
                  {b.name}
                </Item>
              ))}
            </Group>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-5 px-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
      {children}
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <nav className="space-y-0.5">{children}</nav>;
}

function Item({
  href,
  active,
  icon,
  tone,
  count,
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  tone?: "sale";
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition",
        active
          ? "bg-brand-50 font-semibold text-brand-700"
          : cn("hover:bg-surface-soft", tone === "sale" ? "text-sale" : "text-ink-muted hover:text-ink"),
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {typeof count === "number" ? (
        <span className={cn("shrink-0 text-xs tabular-nums", active ? "text-brand-600" : "text-ink-faint")}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}
