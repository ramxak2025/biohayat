/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика скролла — штатный способ передать позицию на UI-поток. Правило
 * React Compiler про shared values не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import type { FlashListRef } from "@shopify/flash-list";
import { useSharedValue } from "react-native-reanimated";

import type { Product } from "@/api/types";
import {
  CatalogControlBar,
  CatalogFilterRail,
  CatalogFilterSheet,
  CatalogGrid,
  CONTROL_BAR_HEIGHT,
  openSortActionSheet,
  useCatalogFilters,
  useCatalogProducts,
} from "@/components/catalog";
import { GRID_EDGE_FIX } from "@/components/product-card";
import { BadDisclaimer, IconButton } from "@/components/ui";
import { useHeaderInset } from "@/components/ui/screen";
import { useCategories, useTaxonomy } from "@/hooks/use-products";
import { spacing, useColors, useTheme } from "@/theme";

/**
 * Каталог — ядро магазина: одна бесконечная сетка закрывает все разделы
 * (все товары, категория, «кому», «зачем», распродажа, поисковый запрос).
 *
 * РАСКЛАДКА. Сверху — нативная шапка, под ней закреплённая панель управления
 * (сколько нашлось · сортировка · фильтры), дальше сетка в две колонки. Панель
 * плавает поверх списка, а место под неё держит распорка в шапке списка: так
 * она остаётся на экране на любой глубине прокрутки, а UIKit продолжает считать
 * инсеты сам.
 *
 * КРУПНОГО ЗАГОЛОВКА ЗДЕСЬ НЕТ СОЗНАТЕЛЬНО, и это не экономия на стиле.
 * Во-первых, плотность: крупный заголовок плюс панель — это ~110 pt до первой
 * карточки, то есть пол-ряда товаров, а плотная выдача и есть то, ради чего
 * экран переделан. Во-вторых, техника: высота крупного заголовка меняется по
 * ходу прокрутки и приезжает в JS с задержкой, так что закреплённая под ним
 * панель дёргалась бы на каждом кадре. Компактная шапка отдаёт постоянную
 * высоту — панель стоит намертво. Ориентироваться помогает сама панель: на ней
 * всегда видно, сколько найдено и что выбрано.
 */
export function CatalogScreen() {
  const router = useRouter();
  const colors = useColors();
  const theme = useTheme();
  const headerInset = useHeaderInset();

  const {
    filters,
    query,
    activeCount,
    isDirty,
    revision,
    setSort,
    toggleAxis,
    toggleFlag,
    clearSearch,
    applyFilters,
    reset,
  } = useCatalogFilters();

  const products = useCatalogProducts(query);
  const categories = useCategories();
  const taxonomy = useTaxonomy();

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [controlBarHeight, setControlBarHeight] = useState(CONTROL_BAR_HEIGHT);
  const onControlBarHeight = useCallback((height: number) => {
    setControlBarHeight((previous) => previous === height ? previous : height);
  }, []);
  const listRef = useRef<FlashListRef<Product>>(null);
  const railOffset = useRef(0);

  /**
   * Насколько список уехал от точки покоя.
   *
   * Значение читает только UI-поток (панель интерполирует из него высоту и
   * прозрачность). Сэмплируем в JS не от лени: FlashList перехватывает onScroll
   * и вызывает пользовательский обработчик сам, из JS, — воркет здесь всё равно
   * не получил бы нативную привязку. Зато запись в shared value стоит копейки, а
   * вся анимация дальше живёт на UI-потоке и не зависит от загруженности JS.
   *
   * Слагаемое headerInset: под прозрачной шапкой точка покоя — это
   * contentOffset.y === -высота шапки, а не ноль.
   */
  const scrolled = useSharedValue(0);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrolled.value = event.nativeEvent.contentOffset.y + headerInset;
    },
    [scrolled, headerInset],
  );

  const items = products.data?.items ?? [];
  const total = products.data?.total ?? 0;

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = products;

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refetchProducts = useCallback(() => {
    void refetch();
  }, [refetch]);

  /**
   * Смена фильтра или сортировки возвращает выдачу к началу: под новым набором
   * позиция в списке ничего не значит, а человек, листавший сороковой товар,
   * иначе оказался бы в середине незнакомого списка. Анимированно и без
   * пересборки — сам список на месте, меняется только его содержимое.
   */
  useEffect(() => {
    if (revision === 0) return;
    listRef.current?.scrollToOffset({ offset: -headerInset, animated: true });
    // scrolled обнуляем сами: события скролла придут позже анимации, и панель
    // до них оставалась бы ужатой над уже прокрученным к началу списком
    scrolled.value = 0;
  }, [revision, headerInset, scrolled]);

  const openFilters = useCallback(() => setFiltersVisible(true), []);
  const closeFilters = useCallback(() => setFiltersVisible(false), []);

  const openSort = useCallback(() => {
    const shown = openSortActionSheet(filters.sort, setSort, theme.dark ? "dark" : "light");
    // системного листа нет (не iOS) — те же варианты лежат секцией в фильтрах
    if (!shown) setFiltersVisible(true);
  }, [filters.sort, setSort, theme.dark]);

  const goSearch = useCallback(() => router.push("/search"), [router]);

  const headerRight = useCallback(
    () => <IconButton name="magnifyingglass" label="Поиск по каталогу" onPress={goSearch} />,
    [goSearch],
  );

  /**
   * Опции шапки — одним объектом с фиксированной ссылкой: навигатор сравнивает
   * их по идентичности и на новом литерале каждый рендер переставлял бы бар.
   */
  const screenOptions = useMemo(
    () => ({ title: "Каталог", headerLargeTitleEnabled: false, headerRight }),
    [headerRight],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        {/* распорка под плавающую панель: она перекрывает верх списка */}
        <View style={{ height: controlBarHeight }} />
        <CatalogFilterRail
          filters={filters}
          categories={categories.data ?? []}
          categoriesLoading={categories.isLoading}
          onToggleAxis={toggleAxis}
          onToggleFlag={toggleFlag}
          onClearSearch={clearSearch}
          offsetRef={railOffset}
        />
      </View>
    ),
    [controlBarHeight, filters, categories.data, categories.isLoading, toggleAxis, toggleFlag, clearSearch],
  );

  // плашка про БАД обязательна в каталоге — показываем в хвосте списка
  const listFooter = useMemo(
    () => (
      <View style={styles.footer}>
        <BadDisclaimer />
      </View>
    ),
    [],
  );

  const emptyTitle = filters.q ? `Ничего не нашлось по «${filters.q}»` : "Ничего не нашлось";
  const emptySubtitle = !isDirty
    ? "Каталог сейчас пуст. Загляните чуть позже."
    : filters.q && activeCount === 0
      ? "Попробуйте другой запрос — поиск ищет по названию и описанию."
      : "Снимите часть фильтров — подборка станет шире.";

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={screenOptions} />

      {/* Порядок детей важен: react-native-screens ищет скролл-вью для scroll
          edge effect, обходя только первого потомка на каждом уровне. Панель
          обязана оставаться вторым ребёнком. */}
      <CatalogGrid
        products={items}
        listRef={listRef}
        isLoading={products.isLoading}
        isStale={products.isPlaceholderData}
        error={products.error}
        onRetry={refetchProducts}
        refreshing={products.isRefetching && !products.isFetchingNextPage}
        onRefresh={refetchProducts}
        onEndReached={loadMore}
        isFetchingNextPage={products.isFetchingNextPage}
        onScroll={onScroll}
        headerInset={headerInset}
        barHeight={controlBarHeight}
        bottomPadding={spacing["2xl"]}
        ListHeaderComponent={listHeader}
        ListFooterComponent={items.length > 0 ? listFooter : null}
        emptyIcon={filters.q ? "magnifyingglass" : "square.grid.2x2"}
        emptyTitle={emptyTitle}
        emptySubtitle={emptySubtitle}
        emptyActionLabel={isDirty ? "Сбросить фильтры" : undefined}
        onEmptyAction={isDirty ? reset : undefined}
      />

      <CatalogControlBar
        total={total}
        isCounting={products.isLoading || products.isPlaceholderData}
        sort={filters.sort}
        activeCount={activeCount}
        onOpenSort={openSort}
        onOpenFilters={openFilters}
        scrolled={scrolled}
        top={headerInset}
        onHeightChange={onControlBarHeight}
      />

      <CatalogFilterSheet
        visible={filtersVisible}
        onClose={closeFilters}
        applied={filters}
        onApply={applyFilters}
        categories={categories.data ?? []}
        categoriesLoading={categories.isLoading}
        categoriesError={categories.error}
        onRetryCategories={() => void categories.refetch()}
        taxonomy={taxonomy.data}
        taxonomyLoading={taxonomy.isLoading}
        taxonomyError={taxonomy.error}
        onRetryTaxonomy={() => void taxonomy.refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // шапка списка живёт в контейнере сетки — добираем её поле до поля карточек
  header: { paddingHorizontal: GRID_EDGE_FIX },
  footer: { paddingHorizontal: GRID_EDGE_FIX, paddingTop: spacing.lg },
});
