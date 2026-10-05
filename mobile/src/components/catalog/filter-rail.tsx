import { useCallback, useRef, type RefObject } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import type { Category } from "@/api/types";
import { GRID_SIDE } from "@/components/product-card";
import { Chip, Skeleton } from "@/components/ui";
import { radii, spacing } from "@/theme";

import type { CatalogAxis, CatalogFilters, CatalogFlag } from "./use-catalog-filters";

const SKELETON_WIDTHS = [96, 132, 110, 88, 124];

export interface CatalogFilterRailProps {
  filters: CatalogFilters;
  categories: Category[];
  categoriesLoading: boolean;
  onToggleAxis: (axis: CatalogAxis, slug: string) => void;
  onToggleFlag: (flag: CatalogFlag) => void;
  onClearSearch: () => void;
  /**
   * Смещение ленты, переживающее пересборку списка: при первой загрузке
   * FlashList подменяется скелетоном, и шапка со своим ScrollView монтируется
   * заново. Без восстановления лента прыгала бы в начало, унося из виду тот
   * самый чипс, по которому только что нажали.
   */
  offsetRef: RefObject<number>;
}

/**
 * Лента быстрых фильтров: активный запрос, две подборки и категории.
 *
 * Живёт в шапке СПИСКА и уезжает вместе с контентом — в отличие от панели
 * управления, которая закреплена. Это сознательное разделение: на панели
 * остаётся то, что нужно в любой момент прокрутки (сортировка, фильтры, счёт),
 * а лента — это «начать заново с другой категории», и такое желание возникает
 * наверху выдачи. Полный набор осей (17 категорий, 3 аудитории, 9 целей) сюда
 * не помещается и живёт в листе фильтров — здесь только самое частое.
 *
 * Кнопки «Фильтры» в ленте нет намеренно: она переехала в закреплённую панель,
 * и две одинаковые кнопки в двух сантиметрах друг от друга сбивали бы с толку.
 */
export function CatalogFilterRail({
  filters,
  categories,
  categoriesLoading,
  onToggleAxis,
  onToggleFlag,
  onClearSearch,
  offsetRef,
}: CatalogFilterRailProps) {
  const scrollRef = useRef<ScrollView>(null);
  const restored = useRef(false);

  // восстанавливаем прокрутку, когда контент дорос до сохранённого смещения:
  // первый замер может прийти ещё на скелетонах, по нему прыгать некуда
  const handleContentSizeChange = useCallback(
    (width: number) => {
      if (restored.current) return;
      const x = offsetRef.current;
      if (x <= 0) {
        restored.current = true;
        return;
      }
      if (width <= x) return;
      restored.current = true;
      scrollRef.current?.scrollTo({ x, animated: false });
    },
    [offsetRef],
  );

  /**
   * Первый вход по ссылке вида /catalog?category=masla: сохранённого смещения
   * ещё нет, а выбранная категория может стоять двенадцатым чипсом и в кадр не
   * попасть. Подкручиваем ленту к ней, оставив слева «хвост» предыдущего чипса,
   * чтобы было видно: лента прокручена, слева есть ещё варианты.
   */
  const handleSelectedLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (restored.current || offsetRef.current > 0) return;
      restored.current = true;
      const x = Math.max(0, event.nativeEvent.layout.x - spacing.xl);
      if (x > 0) scrollRef.current?.scrollTo({ x, animated: false });
    },
    [offsetRef],
  );

  // хватает двух событий на жест: пишем в ref, перерисовки нет, JS-поток чист
  const rememberOffset = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = event.nativeEvent.contentOffset.x;
    },
    [offsetRef],
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScrollEndDrag={rememberOffset}
      onMomentumScrollEnd={rememberOffset}
      onContentSizeChange={handleContentSizeChange}
      style={styles.rail}
      contentContainerStyle={styles.content}
    >
      {filters.q ? (
        <Chip
          label={`Поиск: ${filters.q}`}
          icon="magnifyingglass"
          selected
          onPress={onClearSearch}
        />
      ) : null}

      <Chip
        label="Акции"
        icon="tag"
        selected={filters.onSale}
        onPress={() => onToggleFlag("onSale")}
      />
      <Chip
        label="Хиты"
        icon="star"
        selected={filters.featured}
        onPress={() => onToggleFlag("featured")}
      />

      {categoriesLoading && categories.length === 0
        ? SKELETON_WIDTHS.map((width, index) => (
            <Skeleton key={index} width={width} height={38} radius={radii.pill} />
          ))
        : categories.map((category) => {
            const selected = filters.category === category.slug;
            return (
              <View key={category.slug} onLayout={selected ? handleSelectedLayout : undefined}>
                <Chip
                  label={category.name}
                  selected={selected}
                  onPress={() => onToggleAxis("category", category.slug)}
                />
              </View>
            );
          })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // выходим за поле контейнера списка, чтобы лента уезжала под самый край экрана
  // шапка списка стоит на боковом поле карточек; уводим ленту на столько же
  // влево и вправо, чтобы чипсы уезжали под самый край экрана
  rail: { marginHorizontal: -GRID_SIDE },
  content: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: GRID_SIDE,
    paddingVertical: spacing.xs,
  },
});
