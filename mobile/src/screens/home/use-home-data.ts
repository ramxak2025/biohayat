import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { Paged, Product } from "@/api/types";
import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import { useCategories, useProductStrip, useTaxonomy } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";

/** Сколько материалов показываем на главной — остальное живёт на экране «Статьи». */
const ARTICLES_ON_HOME = 3;
const STRIP_SIZE = 10;
const SELECTION_SIZE = 4;

/**
 * Все запросы главной в одном месте: экран получает готовые состояния, а
 * pull-to-refresh перезапрашивает их одной ручкой.
 */
export function useHomeData() {
  const hero = useQuery({
    queryKey: qk.banners("HERO"),
    queryFn: ({ signal }) => api.catalog.banners("HERO", signal),
    staleTime: 15 * 60 * 1000,
  });

  const promo = useQuery({
    queryKey: qk.banners("HOME_STRIP"),
    queryFn: ({ signal }) => api.catalog.banners("HOME_STRIP", signal),
    staleTime: 15 * 60 * 1000,
  });

  const materials = useQuery({
    queryKey: qk.materials,
    queryFn: ({ signal }) => api.catalog.materials(signal),
    staleTime: 30 * 60 * 1000,
    // /materials отдаёт ВСЕ опубликованные материалы — на главной режем список
    select: (items) => items.slice(0, ARTICLES_ON_HOME),
  });

  const categories = useCategories();
  const taxonomy = useTaxonomy();
  const selection = useProductStrip({ inStock: "true" }, SELECTION_SIZE);
  const sale = useProductStrip({ onSale: "true" }, STRIP_SIZE);
  const settings = useSettings();

  const queryClient = useQueryClient();
  const cachedHits = queryClient.getQueryData<Paged<Product>>(
    qk.products({ featured: "true", take: STRIP_SIZE }),
  )?.items.slice(0, SELECTION_SIZE);
  const selectionItems = selection.data ?? cachedHits;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // перезапрашиваем ИМЕННО запросы главной: `type: "active"` задел бы и
      // бесконечную ленту каталога — это перезагрузка всех её страниц разом
      await Promise.all([
        queryClient.refetchQueries({ queryKey: qk.banners("HERO") }),
        queryClient.refetchQueries({ queryKey: qk.banners("HOME_STRIP") }),
        queryClient.refetchQueries({ queryKey: qk.categories }),
        queryClient.refetchQueries({ queryKey: qk.taxonomy }),
        queryClient.refetchQueries({ queryKey: qk.materials }),
        queryClient.refetchQueries({ queryKey: qk.settings }),
        queryClient.refetchQueries({ queryKey: qk.products({ inStock: "true", take: SELECTION_SIZE }) }),
        queryClient.refetchQueries({ queryKey: qk.products({ onSale: "true", take: STRIP_SIZE }) }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  /**
   * Экран целиком пустой и сломанный (обычно — нет сети). Показываем один
   * честный экран ошибки вместо полудюжины плашек в каждой секции.
   */
  const hasAnything = Boolean(
    hero.data?.length || categories.data?.length || selectionItems?.length || sale.data?.length,
  );
  const fatalError =
    !hasAnything && (categories.isError || selection.isError) ? (categories.error ?? selection.error) : null;

  return {
    hero,
    promo,
    materials,
    categories,
    taxonomy,
    selection: { ...selection, data: selectionItems },
    sale,
    settings,
    isRefreshing,
    refresh,
    fatalError,
  };
}
