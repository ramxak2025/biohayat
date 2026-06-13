import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Умный поиск товаров с учётом опечаток.
 * Использует pg_trgm: точное вхождение (ILIKE) + триграммную близость
 * (word_similarity) — находит товар даже при ошибках и неполном вводе.
 */
export async function smartSearchProducts(query: string, limit = 48) {
  const q = query.trim();
  if (q.length < 2) return { items: [], total: 0, query: q };

  // Ранжируем id: сначала прямые вхождения, затем по близости.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "Product"
    WHERE "isActive" = true
      AND (
        name ILIKE ${"%" + q + "%"}
        OR "shortDescription" ILIKE ${"%" + q + "%"}
        OR word_similarity(${q}, name) > 0.25
      )
    ORDER BY
      (name ILIKE ${"%" + q + "%"}) DESC,
      word_similarity(${q}, name) DESC,
      "isFeatured" DESC
    LIMIT ${limit}
  `;

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { items: [], total: 0, query: q };

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true, brand: true },
  });
  // сохраняем порядок ранжирования
  const order = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));

  return { items: products, total: products.length, query: q };
}

/** Подсказки по началу слова (для живого поиска). */
export async function searchSuggestions(query: string, limit = 6) {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.$queryRaw<{ slug: string; name: string }[]>`
    SELECT slug, name FROM "Product"
    WHERE "isActive" = true
      AND (name ILIKE ${"%" + q + "%"} OR word_similarity(${q}, name) > 0.3)
    ORDER BY (name ILIKE ${q + "%"}) DESC, word_similarity(${q}, name) DESC
    LIMIT ${limit}
  `;
  return rows;
}

// гарантируем, что Prisma импортирован (для типобезопасности raw-запросов)
void Prisma;
