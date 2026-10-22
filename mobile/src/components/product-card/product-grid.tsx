import { type ReactElement } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { FlashList } from "@shopify/flash-list";
import type { SFSymbol } from "expo-symbols";

import type { Product } from "@/api/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { spacing } from "@/theme";
import { useHeaderInset } from "@/components/ui/screen";

import { ProductCard } from "./product-card";

/**
 * Метрика сетки. Плотность здесь — сознательный выбор в пользу товара: у
 * маркетплейсов две колонки идут «на весь экран», поэтому зазор между
 * карточками ужат до 8 pt, а боковое поле — до 12 pt вместо стандартных 16 pt
 * по HIG. На iPhone это добавляет каждой карточке ~4 pt ширины и столько же
 * фотографии, при этом поле остаётся заметным и карточки не липнут к краю.
 *
 * Обе константы экспортируются: шапка и футер списка живут в том же
 * контейнере, что и ячейки, и должны считать своё поле от этих же чисел.
 */
export const GRID_GUTTER = spacing.sm; // расстояние между карточками
export const GRID_SIDE = spacing.md; // боковое поле экрана

/**
 * Боковой padding контейнера списка: половину зазора добирают сами ячейки,
 * поэтому карточки встают ровно на GRID_SIDE от края. Шапке и футеру этой
 * половины не хватает — им нужен ещё GRID_EDGE_FIX.
 */
export const GRID_CONTENT_INSET = GRID_SIDE - GRID_GUTTER / 2;
/** Сколько добрать шапке/футеру списка до бокового поля карточек. */
export const GRID_EDGE_FIX = GRID_SIDE - GRID_CONTENT_INSET;


export interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  ListHeaderComponent?: ReactElement | null;
  ListFooterComponent?: ReactElement | null;
  emptyIcon?: SFSymbol;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onPressProduct?: (product: Product) => void;
  numColumns?: number;
  /** Дополнительный нижний отступ, например под плавающую панель. */
  bottomPadding?: number;
  /** Как вести себя клавиатуре при скролле — нужно экрану поиска. */
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  style?: StyleProp<ViewStyle>;
}

/** Виртуализированная сетка каталога: 2 колонки, докрутка, пустое состояние и ошибка. */
export function ProductGrid({
  products,
  isLoading,
  error,
  onRetry,
  refreshing,
  onRefresh,
  onEndReached,
  isFetchingNextPage,
  ListHeaderComponent,
  ListFooterComponent,
  emptyIcon = "magnifyingglass",
  emptyTitle = "Ничего не нашлось",
  emptySubtitle = "Попробуйте изменить фильтры или поискать иначе.",
  emptyActionLabel,
  onEmptyAction,
  onPressProduct,
  numColumns = 2,
  bottomPadding = spacing["2xl"],
  keyboardDismissMode,
  keyboardShouldPersistTaps,
  style,
}: ProductGridProps) {
  const headerInset = useHeaderInset();
  const empty = products.length === 0;

  if (empty && isLoading) {
    return (
      <View style={[styles.stateWrap, { paddingTop: headerInset }, style]}>
        {ListHeaderComponent}
        <ListSkeleton variant="grid" count={numColumns * 3} />
      </View>
    );
  }

  if (empty && error) {
    return (
      <View style={[styles.stateWrap, { paddingTop: headerInset }, style]}>
        {ListHeaderComponent}
        <ErrorState error={error} onRetry={onRetry} />
      </View>
    );
  }

  return (
    <FlashList
      style={StyleSheet.flatten(style)}
      data={products}
      numColumns={numColumns}
      keyExtractor={(item) => item.id}
      // обязательно для сворачивающегося large title и корректных инсетов баров
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentContainerStyle={{ paddingHorizontal: GRID_CONTENT_INSET, paddingBottom: bottomPadding }}
      renderItem={({ item, index }) => (
        <View style={styles.cell}>
          <ProductCard
            product={item}
            layout="grid"
            index={index}
            onPress={onPressProduct}
          />
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
      refreshing={onRefresh ? !!refreshing : undefined}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator
    />
  );
}

const styles = StyleSheet.create({
  stateWrap: { flex: 1, paddingHorizontal: GRID_SIDE },
  cell: { paddingHorizontal: GRID_GUTTER / 2, paddingBottom: GRID_GUTTER },
  footer: { paddingVertical: spacing.xl },
});
