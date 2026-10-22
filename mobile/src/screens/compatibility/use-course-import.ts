import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { IntakePlan } from "@/api/types";
import { sessionGeneration } from "@/lib/session-generation";
import { localDay } from "@/lib/format";

import { normalizeComponent } from "./rules";

/**
 * Ключ вне `qk.*`: это не эндпоинт, а производная выжимка «id товара → состав».
 * Живёт в неймспейсе "compatibility", чтобы не смешиваться с кэшем каталога.
 */
const CATALOG_NUTRIENTS_KEY = ["compatibility", "catalog-nutrients"] as const;

const PAGE_SIZE = 100;
/** 4 × 100 товаров — потолок с запасом (в каталоге сейчас ~120): страховка от бесконечного цикла. */
const MAX_PAGES = 4;

/**
 * Эндпоинта «товар по id» нет — только по slug (api-contract §4.6), а в плане
 * приёма лежит именно id. Поэтому один раз проходим каталог страницами и
 * складываем компактную карту `id → nutrients`. Результат — обычный объект, а не
 * Map: кэш TanStack Query переживает перезапуск через JSON в AsyncStorage.
 */
async function fetchNutrientsByProductId(signal?: AbortSignal): Promise<Record<string, string[]>> {
  const byId: Record<string, string[]> = {};
  let skip = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const chunk = await api.catalog.products({ take: PAGE_SIZE, skip }, signal);
    for (const product of chunk.items) {
      if (product.nutrients.length > 0) byId[product.id] = product.nutrients;
    }
    skip += chunk.items.length;
    if (chunk.items.length === 0 || skip >= chunk.total) break;
  }

  return byId;
}

/**
 * Два источника состава, потому что курс бывает и «своим», без товара: состав
 * товара по `productId` плюс поиск известных компонентов прямо в названии курса
 * («Магний B6» → Магний).
 */
export function collectCourseComponents(
  plans: readonly IntakePlan[],
  nutrientsByProductId: Record<string, string[]>,
  baseComponents: readonly string[],
): string[] {
  const canonicalByKey = new Map(
    baseComponents.map((name) => [normalizeComponent(name), name] as const),
  );
  const found = new Set<string>();

  for (const plan of plans) {
    const nutrients = plan.productId ? (nutrientsByProductId[plan.productId] ?? []) : [];
    for (const nutrient of nutrients) {
      found.add(canonicalByKey.get(normalizeComponent(nutrient)) ?? nutrient.trim());
    }

    const title = normalizeComponent(plan.title);
    for (const [key, canonical] of canonicalByKey) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(title)) found.add(canonical);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b, "ru"));
}

export interface CourseImportResult {
  components: string[];
  /** Сколько активных курсов просмотрели — нужно для честного текста «из N курсов». */
  planCount: number;
  /** No verified full label composition is present in the current catalog. */
  unassessedPlans: string[];
  overlappingComponents: string[];
}

export interface CourseImport {
  importing: boolean;
  run: () => Promise<CourseImportResult>;
}

/**
 * «Взять из моих курсов». Запросы идут строго по нажатию, императивно через
 * `fetchQuery`: каталог тяжёлый, тянуть его при каждом заходе на экран незачем,
 * а кэш всё равно общий с остальными экранами.
 */
export function useCourseImport(baseComponents: readonly string[]): CourseImport {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);

  const run = useCallback(async (): Promise<CourseImportResult> => {
    const generation = sessionGeneration();
    const assertCurrent = () => { if (generation !== sessionGeneration()) throw new Error("Сессия изменилась"); };
    setImporting(true);
    try {
      const plans = await queryClient.fetchQuery({
        queryKey: qk.intakePlans,
        // день локальный: иначе сервер считает «сегодня» по UTC и до 3 ночи отдаёт вчерашнее
        queryFn: ({ signal }) => api.intake.plans(localDay(), signal),
        staleTime: 60 * 1000,
      });

      assertCurrent();
      const active = plans.filter((plan) => plan.isActive);
      const needsCatalog = active.some((plan) => !!plan.productId);

      const byId = needsCatalog
        ? await queryClient.fetchQuery({
            queryKey: CATALOG_NUTRIENTS_KEY,
            queryFn: ({ signal }) => fetchNutrientsByProductId(signal),
            staleTime: 10 * 60 * 1000,
          })
        : {};

      assertCurrent();
      const counts = new Map<string, number>();
      for (const plan of active) for (const component of collectCourseComponents([plan], byId, baseComponents)) counts.set(component, (counts.get(component) ?? 0) + 1);
      return {
        components: collectCourseComponents(active, byId, baseComponents),
        planCount: active.length,
        unassessedPlans: active.map(plan => plan.title),
        overlappingComponents: [...counts].filter(([, count]) => count > 1).map(([name]) => name),
      };
    } finally {
      if (generation === sessionGeneration()) setImporting(false);
    }
  }, [queryClient, baseComponents]);

  return { importing, run };
}
