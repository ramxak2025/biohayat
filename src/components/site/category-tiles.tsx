import Link from "next/link";
import {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical, Leaf,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@prisma/client";

const ICONS: Record<string, LucideIcon> = {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical, Leaf,
};

export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {categories.map((c) => {
        const Icon = (c.icon && ICONS[c.icon]) || Leaf;
        return (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group flex items-center gap-3.5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span className="text-[15px] font-bold leading-tight text-ink">{c.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
