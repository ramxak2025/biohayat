import Link from "next/link";
import { Tag, LayoutGrid } from "lucide-react";
import { AUDIENCES, GOALS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import type { Category } from "@prisma/client";

/**
 * Левое боковое меню каталога (десктоп) — как в продвинутых интернет-магазинах:
 * категории + быстрые подборки «Кому» и «Зачем», с подсветкой активного раздела.
 */
export function CatalogSidebar({
  categories,
  activeHref,
}: {
  categories: Pick<Category, "slug" | "name">[];
  activeHref: string;
}) {
  return (
    <aside className="hidden w-[248px] shrink-0 lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
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
            <Item key={c.slug} href={`/category/${c.slug}`} active={activeHref === `/category/${c.slug}`}>
              {c.name}
            </Item>
          ))}
        </Group>

        <GroupTitle>Кому</GroupTitle>
        <Group>
          {AUDIENCES.map((a) => (
            <Item key={a.slug} href={`/for/${a.slug}`} active={activeHref === `/for/${a.slug}`}>
              {a.name}
            </Item>
          ))}
        </Group>

        <GroupTitle>Зачем</GroupTitle>
        <Group>
          {GOALS.map((g) => (
            <Item key={g.slug} href={`/goal/${g.slug}`} active={activeHref === `/goal/${g.slug}`}>
              {g.name}
            </Item>
          ))}
        </Group>
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
  children,
}: {
  href: string;
  active: boolean;
  icon?: React.ReactNode;
  tone?: "sale";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition",
        active
          ? "bg-brand-500 text-white shadow-sm"
          : cn("hover:bg-surface-soft", tone === "sale" ? "text-sale" : "text-ink-muted hover:text-ink"),
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}
