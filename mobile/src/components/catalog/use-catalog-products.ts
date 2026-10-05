import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Paged, Product } from "@/api/types";
import { PAGE_SIZE } from "@/hooks/use-products";

import type { CatalogQuery } from "./use-catalog-filters";

/**
 * Бесконечная лента каталога.
 *
 * Отличие от общего `useProductsInfinite` ровно одно и оно принципиальное:
 * `placeholderData: keepPreviousData`. Без него смена сортировки или фильтра
 * меняет ключ кэша, `data` становится undefined, и экран на полсекунды
 * схлопывается в скелетоны — список «моргает» и теряет позицию. С ним прошлая
 * выдача остаётся на месте, пока едет новая, и подменяется целиком одним кадром.
 * Всё остальное (размер страницы, пагинация по take/skip/total) взято оттуда же,
 * поэтому PAGE_SIZE импортируем, а не дублируем числом.
 */
export function useCatalogProducts(query: CatalogQuery) {
  return useInfiniteQuery({
    queryKey: qk.products(query),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      // объект собираем переменной, а не литералом в аргументе: `CatalogQuery`
      // шире `ProductsQuery` на новые параметры сервера (sort, цена, наличие),
      // и литерал упёрся бы в проверку лишних полей
      const params = { ...query, take: PAGE_SIZE, skip: pageParam };
      return api.catalog.products(params, signal);
    },
    getNextPageParam: (last: Paged<Product>) => {
      const loaded = last.skip + last.items.length;
      return loaded < last.total ? loaded : undefined;
    },
    select: (data) => ({
      items: data.pages.flatMap((page) => page.items),
      // total одинаков на всех страницах — берём из первой
      total: data.pages[0]?.total ?? 0,
    }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Сколько товаров найдётся по НЕ применённому набору фильтров.
 *
 * Нужен ровно для подписи кнопки «Показать N товаров» в листе фильтров, поэтому
 * тянем страницу в один товар: сервер всё равно считает total по всей выборке,
 * а трафик и разбор JSON — по одной карточке вместо двадцати четырёх.
 *
 * `keepPreviousData` здесь тоже не косметика: без него число на кнопке мигало бы
 * в ноль на каждое переключение чипса.
 */
export function useCatalogCount(query: CatalogQuery, enabled: boolean) {
  const params = { ...query, take: 1 };

  return useQuery({
    queryKey: qk.products(params),
    queryFn: ({ signal }) => api.catalog.products(params, signal),
    enabled,
    select: (page: Paged<Product>) => page.total,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
