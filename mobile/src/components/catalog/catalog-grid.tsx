import { type ReactElement, type RefObject } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { SFSymbol } from "expo-symbols";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import type { Product } from "@/api/types";
import {
  GRID_CONTENT_INSET,
  GRID_GUTTER,
  GRID_SIDE,
  ProductCard,
} from "@/components/product-card";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui";
import { Duration, Ease, spacing } from "@/theme";

export interface CatalogGridProps {
  products: Product[];
  /**
   * Нужен, чтобы отправить выдачу наверх при смене фильтров. Именно из-за него
   * каталог не использует общий `ProductGrid`: тот ref наружу не отдаёт, а без
   * ref человек после смены сортировки остаётся на 400-й точке чужого списка.
   * Метрику сетки берём из тех же констант, что и `ProductGrid`, — плотность
   * у каталога и у остальных экранов обязана совпадать.
   */
  listRef: RefObject<FlashListRef<Product> | null>;
  isLoading: boolean;
  /** Выдача на экране уже не соответствует фильтрам — едет новая. */
  isStale: boolean;
  error: unknown;
  onRetry: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Высота нативной шапки: у состояний без скролла системного инсета нет. */
  headerInset: number;
  /** Высота закреплённой панели управления. */
  barHeight: number;
  bottomPadding: number;
  ListHeaderComponent: ReactElement | null;
  ListFooterComponent: ReactElement | null;
  emptyIcon: SFSymbol;
  emptyTitle: string;
  emptySubtitle: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onPressProduct?: (product: Product) => void;
}

/**
 * Сетка каталога: две колонки, крупные фото, бесконечная подгрузка.
 *
 * Пока едет новая выдача, старая остаётся на месте и лишь слегка гаснет — это
 * честнее скелетонов: человек видит, что запрос принят, но не теряет контекст и
 * не получает «прыжок» вёрстки. Скелетоны остаются там, где показывать нечего:
 * самый первый вход в каталог.
 */
export function CatalogGrid({
  products,
  listRef,
  isLoading,
  isStale,
  error,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  isFetchingNextPage,
  onScroll,
  headerInset,
  barHeight,
  bottomPadding,
  ListHeaderComponent,
  ListFooterComponent,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  onPressProduct,
}: CatalogGridProps) {
  const reduced = useReducedMotion();
  const empty = products.length === 0;

  const dim = useAnimatedStyle(
    () => ({
      opacity: withTiming(isStale && !reduced ? 0.6 : 1, {
        duration: Duration.fast,
        easing: Ease.power2Out,
      }),
    }),
    [isStale, reduced],
  );

  /**
   * Состояния без списка. Скролл-вью здесь нет, поэтому системный верхний инсет
   * под прозрачной шапкой никто не добавит — считаем его сами. Шапку списка
   * (место под панель и ленту категорий) показываем и тут: экран не должен
   * перестраиваться, когда товары доедут.
   */
  if (empty && (isLoading || error)) {
    return (
      <View style={[styles.flex, { paddingTop: headerInset }]}>
        <View style={styles.stateHeader}>{ListHeaderComponent}</View>
        <View style={styles.stateBody}>
          {error ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : (
            <ListSkeleton variant="grid" count={6} />
          )}
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.flex, dim]}>
      <FlashList
        ref={listRef}
        data={products}
        numColumns={2}
        keyExtractor={(item) => item.id}
        // обязательно: именно этим UIKit добавляет верхний инсет под прозрачной
        // шапкой и нижний — под нативным таб-баром
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: GRID_CONTENT_INSET,
          paddingBottom: bottomPadding,
        }}
        renderItem={({ item, index }) => (
          <View style={styles.cell}>
            <ProductCard product={item} layout="grid" index={index} onPress={onPressProduct} />
          </View>
        )}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            subtitle={emptySubtitle}
            actionLabel={emptyActionLabel}
            onAction={onEmptyAction}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator />
            </View>
          ) : (
            ListFooterComponent
          )
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshing={refreshing}
        onRefresh={onRefresh}
        // иначе индикатор обновления крутится под стеклом панели
        progressViewOffset={barHeight}
        showsVerticalScrollIndicator
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stateHeader: { paddingHorizontal: GRID_CONTENT_INSET },
  stateBody: { flex: 1, paddingHorizontal: GRID_SIDE },
  cell: { paddingHorizontal: GRID_GUTTER / 2, paddingBottom: GRID_GUTTER },
  footer: { paddingVertical: spacing.xl },
});
