import Link from "next/link";
import {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical, Leaf,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@prisma/client";
import { Stagger } from "@/components/motion/reveal";

const ICONS: Record<string, LucideIcon> = {
  Pill, ShieldPlus, Flame, Mars, Venus, Baby, Dumbbell, BrainCircuit,
  Soup, Droplets, Bone, Activity, Sparkles, Droplet, Hexagon, FlaskConical, Leaf,
};

export function CategoryTiles({ categories }: { categories: Category[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" step={0.05} y={18}>
      {categories.map((c) => {
        const Icon = (c.icon && ICONS[c.icon]) || Leaf;
        return (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="group flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-xs ring-1 ring-line transition duration-300 ease-out hover:-translate-y-0.5 hover:ring-brand-300 hover:shadow-md sm:gap-3.5 sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-300 group-hover:bg-brand-500 group-hover:text-white motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110 sm:h-12 sm:w-12">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 text-[13px] font-bold leading-snug text-ink sm:text-[15px]">{c.name}</span>
          </Link>
        );
      })}
    </Stagger>
  );
}
