import { sessionGeneration } from "@/lib/session-generation";
import type { ProductsQuery } from "./types";

/** Ключи кэша TanStack Query. Все в одном месте — иначе инвалидация разъезжается. */
export const qk = {
  settings: ["settings"] as const,
  taxonomy: ["taxonomy"] as const,
  categories: ["categories"] as const,
  category: (slug: string) => ["category", slug] as const,
  banners: (placement?: string) => ["banners", placement ?? "all"] as const,

  products: (query: ProductsQuery) => ["products", query] as const,
  productsByIds: (ids: readonly string[]) => ["products", "by-id", ids] as const,
  product: (slug: string) => ["product", slug] as const,
  related: (slug: string) => ["product", slug, "related"] as const,

  search: (q: string) => ["search", q] as const,
  suggestions: (q: string) => ["suggestions", q] as const,

  materials: ["materials"] as const,
  material: (slug: string) => ["material", slug] as const,

  compatibilityRules: ["compatibility", "rules"] as const,
  compatibilityComponents: ["compatibility", "components"] as const,

  get me() { return ["me", sessionGeneration()] as const; },
  get favorites() { return ["favorites", sessionGeneration()] as const; },
  get orders() { return ["orders", sessionGeneration()] as const; },
  order: (number: number | string) => ["order", String(number), sessionGeneration()] as const,

  get intakePlans() { return ["intake", "plans", sessionGeneration()] as const; },
  intakeLogs: (planId: string, from: string, to: string) => ["intake", "logs", planId, from, to, sessionGeneration()] as const,

  get consultations() { return ["consultations", sessionGeneration()] as const; },
} as const;
