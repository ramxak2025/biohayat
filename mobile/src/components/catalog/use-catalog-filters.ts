import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import { findCatalogDirection, type CatalogDirectionId } from "../../../../shared/catalog-directions";
import type { ProductsQuery } from "@/api/types";

import { DEFAULT_SORT, isCatalogSort, type CatalogSort } from "./sort";

/** Оси, по которым сервер фильтрует одним значением (api-contract §4, GET /products). */
export type CatalogAxis = "category" | "audience" | "goal" | "direction";
/** Булевы переключатели того же эндпоинта. */
export type CatalogFlag = "onSale" | "featured" | "inStock";

export interface CatalogFilters {
  direction?: CatalogDirectionId;
  category?: string;
  audience?: string;
  goal?: string;
  onSale: boolean;
  featured: boolean;
  inStock: boolean;
  /** Нижняя граница цены в КОПЕЙКАХ, включительно. undefined — не задана. */
  priceFrom?: number;
  /** Верхняя граница цены в КОПЕЙКАХ, включительно. */
  priceTo?: number;
  /** Приходит извне: /catalog?q=коллаген с экрана поиска. */
  q?: string;
  sort: CatalogSort;
}

export type CatalogQuery = Omit<ProductsQuery, "take" | "skip">;

export interface CatalogFiltersApi {
  filters: CatalogFilters;
  /** Готовый запрос для списка: только выставленные поля, без undefined. */
  query: CatalogQuery;
  /** Сколько фильтров из листа включено — для точки на кнопке «Фильтры». */
  activeCount: number;
  /** Пришли с экрана поиска: запрос показывается отдельным чипсом. */
  hasSearch: boolean;
  /** Хоть что-то отличается от чистого каталога — включая поиск и сортировку. */
  isDirty: boolean;
  /**
   * Номер поколения набора. Растёт на КАЖДОЕ применение (тап по чипсу, выбор
   * сортировки, «Показать N товаров», новый переход по ссылке). Экран по нему
   * понимает, что выдача сменилась, и отправляет список наверх — сравнивать
   * объекты фильтров ради этого не нужно.
   */
  revision: number;
  setSort: (sort: CatalogSort) => void;
  toggleAxis: (axis: CatalogAxis, slug: string) => void;
  toggleFlag: (flag: CatalogFlag) => void;
  clearSearch: () => void;
  /** Применить набор целиком — так закрывается лист фильтров. */
  applyFilters: (next: CatalogFilters) => void;
  reset: () => void;
}

export const EMPTY_FILTERS: CatalogFilters = {
  onSale: false,
  featured: false,
  inStock: false,
  sort: DEFAULT_SORT,
};

/** Сколько фильтров из листа выбрано. Цена считается одним, как один диапазон. */
export function countActiveFilters(filters: CatalogFilters): number {
  return (
    (filters.category ? 1 : 0) +
    (filters.direction ? 1 : 0) +
    (filters.audience ? 1 : 0) +
    (filters.goal ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.priceFrom !== undefined || filters.priceTo !== undefined ? 1 : 0)
  );
}

/**
 * Фильтры → параметры запроса.
 *
 * Пустые поля не отправляем вовсе: они попали бы в ключ кэша и развели бы
 * одинаковые по смыслу выдачи по разным записям. По той же причине "popular"
 * не шлём — это поведение сервера по умолчанию, и запрос без `sort` обязан
 * читаться из кэша так же, как запрос с `sort=popular`.
 */
export function buildCatalogQuery(filters: CatalogFilters): CatalogQuery {
  const query: CatalogQuery = {};
  if (filters.direction) query.direction = filters.direction;
  if (filters.category) query.category = filters.category;
  if (filters.audience) query.audience = filters.audience;
  if (filters.goal) query.goal = filters.goal;
  if (filters.onSale) query.onSale = "true";
  if (filters.featured) query.featured = "true";
  if (filters.inStock) query.inStock = "true";
  if (filters.priceFrom !== undefined) query.priceFrom = filters.priceFrom;
  if (filters.priceTo !== undefined) query.priceTo = filters.priceTo;
  if (filters.q) query.q = filters.q;
  if (filters.sort !== DEFAULT_SORT) query.sort = filters.sort;
  return query;
}

function readParam(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function readPrice(raw: string | string[] | undefined): number | undefined {
  const value = readParam(raw);
  if (!value || !/^\d+$/.test(value)) return undefined;
  return Math.min(Number(value), 2_147_483_647);
}

/** Слепок набора: по нему видно, что снаружи пришли ДРУГИЕ параметры маршрута. */
function fingerprint(filters: CatalogFilters): string {
  return [
    filters.category ?? "",
    filters.direction ?? "",
    filters.audience ?? "",
    filters.goal ?? "",
    filters.onSale ? "1" : "",
    filters.featured ? "1" : "",
    filters.inStock ? "1" : "",
    filters.priceFrom ?? "",
    filters.priceTo ?? "",
    filters.q ?? "",
    filters.sort,
  ].join("|");
}

/**
 * Состояние фильтров каталога.
 *
 * Первичное значение берём из параметров маршрута: с главной приходят ссылки
 * вида `/catalog?goal=immunity` и `/catalog?onSale=true`, они обязаны работать.
 * Дальше состояние живёт локально: вкладка каталога не размонтируется, а запись
 * в URL на каждый тап по чипсу дёргала бы навигатор без всякой пользы для
 * пользователя. Если снаружи придёт НОВЫЙ набор параметров (ещё один переход по
 * ссылке в уже открытую вкладку) — состояние пересеивается.
 *
 * Баннеры сайта могут передавать сортировку, наличие и цену: применяем их
 * вместе с остальными фильтрами, сохраняя общий контракт каталога.
 */
export function useCatalogFilters(): CatalogFiltersApi {
  const params = useLocalSearchParams();

  const incoming = useMemo<CatalogFilters>(
    () => ({
      ...EMPTY_FILTERS,
      category: readParam(params.category),
      direction: findCatalogDirection(readParam(params.direction))?.id,
      audience: readParam(params.audience),
      goal: readParam(params.goal),
      onSale: readParam(params.onSale) === "true",
      featured: readParam(params.featured) === "true",
      inStock: readParam(params.inStock) === "true",
      priceFrom: readPrice(params.priceFrom),
      priceTo: readPrice(params.priceTo),
      q: readParam(params.q),
      sort: (() => {
        const raw = readParam(params.sort);
        return raw && isCatalogSort(raw) ? raw : DEFAULT_SORT;
      })(),
    }),
    [
      params.category,
      params.direction,
      params.audience,
      params.goal,
      params.onSale,
      params.featured,
      params.inStock,
      params.priceFrom,
      params.priceTo,
      params.q,
      params.sort,
    ],
  );

  const [filters, setFilters] = useState<CatalogFilters>(incoming);
  const [revision, setRevision] = useState(0);
  const seededFrom = useRef(fingerprint(incoming));

  useEffect(() => {
    const next = fingerprint(incoming);
    if (seededFrom.current === next) return;
    seededFrom.current = next;
    setFilters(incoming);
    setRevision((value) => value + 1);
  }, [incoming]);

  /**
   * Единая точка записи. Revision двигаем только когда набор правда изменился:
   * иначе повторный выбор той же сортировки гонял бы список наверх на пустом месте.
   */
  const commit = useCallback(
    (next: CatalogFilters) => {
      if (fingerprint(filters) === fingerprint(next)) return;
      setFilters(next);
      setRevision((value) => value + 1);
    },
    [filters],
  );

  const toggleAxis = useCallback(
    (axis: CatalogAxis, slug: string) => {
      // ось одновыборная: повторный тап по выбранному чипсу снимает фильтр
      const value = filters[axis] === slug ? undefined : slug;
      if (axis === "direction") commit({ ...filters, direction: findCatalogDirection(value)?.id });
      else if (axis === "category") commit({ ...filters, category: value });
      else if (axis === "audience") commit({ ...filters, audience: value });
      else commit({ ...filters, goal: value });
    },
    [commit, filters],
  );

  const toggleFlag = useCallback(
    (flag: CatalogFlag) => {
      if (flag === "onSale") commit({ ...filters, onSale: !filters.onSale });
      else if (flag === "featured") commit({ ...filters, featured: !filters.featured });
      else commit({ ...filters, inStock: !filters.inStock });
    },
    [commit, filters],
  );

  const setSort = useCallback(
    (sort: CatalogSort) => commit({ ...filters, sort }),
    [commit, filters],
  );

  const clearSearch = useCallback(
    () => commit({ ...filters, q: undefined }),
    [commit, filters],
  );

  /** Применить набор целиком — так закрывается лист фильтров. */
  const applyFilters = useCallback((next: CatalogFilters) => commit(next), [commit]);

  const reset = useCallback(
    // поиск и сортировку сбрасываем тоже: кнопка называется «Сбросить», а не
    // «Сбросить часть» — оставлять что-то включённым было бы обманом ожидания
    () => commit(EMPTY_FILTERS),
    [commit],
  );

  const query = useMemo(() => buildCatalogQuery(filters), [filters]);
  const activeCount = countActiveFilters(filters);

  return {
    filters,
    query,
    activeCount,
    hasSearch: !!filters.q,
    isDirty: activeCount > 0 || !!filters.q || filters.sort !== DEFAULT_SORT,
    revision,
    setSort,
    toggleAxis,
    toggleFlag,
    clearSearch,
    applyFilters,
    reset,
  };
}
