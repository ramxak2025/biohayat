import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Paged, Product, ProductsQuery } from "@/api/types";

export const PAGE_SIZE = 24;

/** Бесконечная лента каталога: API отдаёт take/skip/total. */
export function useProductsInfinite(query: Omit<ProductsQuery, "take" | "skip"> = {}) {
  return useInfiniteQuery({
    queryKey: qk.products(query),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.catalog.products({ ...query, take: PAGE_SIZE, skip: pageParam as number }, signal),
    getNextPageParam: (last: Paged<Product>) => {
      const loaded = last.skip + last.items.length;
      return loaded < last.total ? loaded : undefined;
    },
    select: (data) => ({ ...data, items: data.pages.flatMap((p) => p.items) }),
  });
}

/** Короткая подборка для главной (хиты, акции, «для вас»). */
export function useProductStrip(query: Omit<ProductsQuery, "take" | "skip">, take = 10) {
  return useQuery({
    queryKey: qk.products({ ...query, take }),
    queryFn: ({ signal }) => api.catalog.products({ ...query, take }, signal),
    select: (page) => page.items,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: ({ signal }) => api.catalog.categories(signal),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTaxonomy() {
  return useQuery({
    queryKey: qk.taxonomy,
    queryFn: ({ signal }) => api.catalog.taxonomy(signal),
    staleTime: 60 * 60 * 1000,
  });
}
