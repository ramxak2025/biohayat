import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { Product } from "@/api/types";

/** Признак товара: id + slug + Money. Проверяем структурно — данные приходят из кэша. */
function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Product>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    !!candidate.price &&
    typeof candidate.price.kopecks === "number"
  );
}

/** Обходим данные запроса: массив, страница {items}, бесконечный список {pages}. */
function collect(node: unknown, wanted: Set<string>, found: Map<string, Product>, depth = 0): void {
  if (!node || depth > 4 || found.size === wanted.size) return;

  if (Array.isArray(node)) {
    for (const child of node) collect(child, wanted, found, depth + 1);
    return;
  }

  if (isProduct(node)) {
    if (wanted.has(node.id)) found.set(node.id, node);
    return;
  }

  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    for (const key of ["items", "pages", "data"] as const) {
      if (key in record) collect(record[key], wanted, found, depth + 1);
    }
  }
}

/**
 * Достаёт товары по id из уже загруженного кэша TanStack Query.
 *
 * Зачем: гостевое избранное хранит только id, а получить товар по id API не умеет
 * (есть только /products/{slug}). Кэш каталога персистится в AsyncStorage, поэтому
 * почти всегда содержит те карточки, с которых гость и нажимал сердечко.
 */
export function useCachedProducts(ids: string[]): Product[] {
  const client = useQueryClient();

  return useMemo(() => {
    if (!ids.length) return [];

    const wanted = new Set(ids);
    const found = new Map<string, Product>();
    for (const query of client.getQueryCache().getAll()) {
      collect(query.state.data, wanted, found);
      if (found.size === wanted.size) break;
    }

    return ids.flatMap((id) => {
      const product = found.get(id);
      return product ? [product] : [];
    });
  }, [ids, client]);
}
