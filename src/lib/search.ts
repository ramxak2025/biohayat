import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Поиск по каталогу.
 *
 * Прошлая версия искала запрос одной подстрокой и добирала результаты
 * триграммной близостью к названию. На реальных запросах это давало мусор:
 *
 *   «витамин д3»   → первым «Biotin 10000 мкг (витамин B7)», а настоящие D3
 *                    уходили ниже: кириллическая «д» не совпадает с латинской
 *                    «D», подстрока не находилась, и порядок решала близость
 *                    к слову «витамин»;
 *   «для суставов» → вместе с суставами «Мыло Костус — для состояния кожи»,
 *                    потому что совпал предлог «для».
 *
 * Здесь запрос разбирается на слова, предлоги и союзы отбрасываются, а
 * найденный товар обязан содержать КАЖДОЕ значимое слово — в названии,
 * описании, составе, категории или бренде. Для каждого слова проверяются
 * ещё два написания: транслитерация (витамин ↔ vitamin) и исправление
 * раскладки (rjkkfutz → коллаген) — в этом каталоге названия наполовину
 * латинские, а покупатель набирает кириллицей.
 */

/** Слова, которые ничего не сообщают о товаре и тянут за собой мусор. */
const STOP_WORDS = new Set([
  "для", "и", "с", "со", "от", "в", "во", "на", "по", "при", "к", "у", "о",
  "об", "из", "за", "до", "не", "или", "а", "но", "как", "что", "чем", "то",
  "the", "and", "for", "with", "of",
]);

/** Кириллица → латиница по звучанию: «витамин» → «vitamin». */
const TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Латиница → кириллица: «collagen» → «коллаген». */
const TO_CYR: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и",
  j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р",
  s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс", y: "й", z: "з",
};

/** Русские буквы на клавишах QWERTY: набрано «rjkkfutz» вместо «коллаген». */
const QWERTY_TO_RU: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ",
  p: "з", "[": "х", "]": "ъ", a: "ф", s: "ы", d: "в", f: "а", g: "п",
  h: "р", j: "о", k: "л", l: "д", ";": "ж", "'": "э", z: "я", x: "ч",
  c: "с", v: "м", b: "и", n: "т", m: "ь", ",": "б", ".": "ю",
};

const map = (s: string, table: Record<string, string>) =>
  [...s].map((ch) => table[ch] ?? ch).join("");

/**
 * Написания одного слова, по которым имеет смысл искать.
 * Всегда включает исходное; остальные добавляются, только если отличаются.
 */
function variants(token: string): string[] {
  const out = new Set([token]);
  const hasCyr = /[а-яё]/.test(token);
  const hasLat = /[a-z]/.test(token);
  if (hasCyr) out.add(map(token, TO_LAT));
  if (hasLat) {
    out.add(map(token, TO_CYR));
    // Раскладку исправляем только у слов без кириллицы: иначе «омега 3»
    // превратилась бы в бессмыслицу.
    if (!hasCyr) out.add(map(token, QWERTY_TO_RU));
  }
  return [...out].filter((v) => v.length >= 2);
}

/** Разбор запроса: нормализация, отбрасывание предлогов, варианты написания. */
export function parseQuery(raw: string) {
  const norm = raw.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const all = norm.split(/[^0-9a-zа-я]+/i).filter(Boolean);
  // Значимые слова: не предлог и длиннее одной буквы. Если после отсева не
  // осталось ничего (запрос «и» или «для»), возвращаем исходные — лучше
  // поискать хоть что-то, чем показать пустоту.
  const meaningful = all.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const tokens = meaningful.length > 0 ? meaningful : all;
  return { norm, tokens, groups: tokens.map(variants) };
}

/**
 * Поиск товаров. Возвращает найденное в порядке убывания уместности и
 * признак того, что точных совпадений не было и показаны похожие.
 */
export async function smartSearchProducts(query: string, limit = 48) {
  const { norm, tokens, groups } = parseQuery(query);
  if (norm.length < 2 || tokens.length === 0) {
    return { items: [], total: 0, query: query.trim(), fuzzy: false };
  }

  // Каждое слово должно найтись хотя бы в одном поле — в любом написании.
  const perToken = groups.map(
    (vs) =>
      Prisma.sql`(${Prisma.join(
        vs.map(
          (v) => Prisma.sql`(
            p.name ILIKE ${"%" + v + "%"}
            OR coalesce(p."shortDescription", '') ILIKE ${"%" + v + "%"}
            OR coalesce(p.description, '') ILIKE ${"%" + v + "%"}
            OR coalesce(p.composition, '') ILIKE ${"%" + v + "%"}
            OR c.name ILIKE ${"%" + v + "%"}
            OR coalesce(b.name, '') ILIKE ${"%" + v + "%"}
          )`,
        ),
        " OR ",
      )})`,
  );

  // Ранжирование: сначала запрос целиком в названии, затем все слова в
  // названии, затем хиты, затем близость названия к запросу.
  const nameHitsAll = Prisma.sql`(${Prisma.join(
    groups.map(
      (vs) =>
        Prisma.sql`(${Prisma.join(
          vs.map((v) => Prisma.sql`p.name ILIKE ${"%" + v + "%"}`),
          " OR ",
        )})::int`,
    ),
    " + ",
  )})`;

  const select = (where: Prisma.Sql) => Prisma.sql`
    SELECT p.id
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE p."isActive" = true AND ${where}
    ORDER BY
      (p.name ILIKE ${"%" + norm + "%"}) DESC,
      ${nameHitsAll} DESC,
      p."isFeatured" DESC,
      similarity(p.name, ${norm}) DESC
    LIMIT ${limit}
  `;

  let rows = await prisma.$queryRaw<{ id: string }[]>(
    select(Prisma.join(perToken, " AND ")),
  );
  let fuzzy = false;

  // Ничего не нашлось — пробуем близкие по написанию. Порог 0.35 вместо
  // прежних 0.25: на 0.25 в выдачу попадало почти любое название.
  if (rows.length === 0) {
    fuzzy = true;
    const near = Prisma.join(
      groups.flat().map((v) => Prisma.sql`word_similarity(${v}, p.name) > 0.35`),
      " OR ",
    );
    rows = await prisma.$queryRaw<{ id: string }[]>(select(Prisma.sql`(${near})`));
  }

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { items: [], total: 0, query: norm, fuzzy: false };

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: true, brand: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  return { items: products, total: products.length, query: query.trim(), fuzzy };
}

/** Подсказки по мере набора (живой поиск). */
export async function searchSuggestions(query: string, limit = 6) {
  const { norm, groups } = parseQuery(query);
  if (norm.length < 2) return [];
  const vs = groups.flat();
  if (vs.length === 0) return [];

  const like = Prisma.join(
    vs.map((v) => Prisma.sql`name ILIKE ${"%" + v + "%"}`),
    " OR ",
  );
  const starts = Prisma.join(
    vs.map((v) => Prisma.sql`(name ILIKE ${v + "%"})::int`),
    " + ",
  );

  const rows = await prisma.$queryRaw<{ slug: string; name: string }[]>(Prisma.sql`
    SELECT slug, name FROM "Product"
    WHERE "isActive" = true AND ((${like}) OR word_similarity(${norm}, name) > 0.4)
    ORDER BY ${starts} DESC, similarity(name, ${norm}) DESC
    LIMIT ${limit}
  `);
  return rows;
}
