import { useEffect } from "react";
import { Keyboard, StyleSheet, View } from "react-native";

import type { Product, SearchResult } from "@/api/types";
import { ProductGrid } from "@/components/product-card";
import { AppText } from "@/components/ui";
import { plural } from "@/lib/format";
import { spacing } from "@/theme";

import { SEARCH_LIMIT } from "./constants";

export interface SearchResultsProps {
  /** Запрос, который отправили на сервер. */
  query: string;
  result: SearchResult | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onPressProduct: (product: Product) => void;
  onOpenCatalog: () => void;
  bottomInset: number;
}

/**
 * Выдача поиска — та же плотная сетка в две колонки, что и в каталоге: те же
 * карточки с ценой-героем и кнопкой «в корзину» прямо из сетки, без перехода
 * в товар. Пользователю не нужно переучиваться между экранами.
 *
 * Счётчик пишем «Показано N», а не «Найдено N»: `SearchResult.total` равен длине
 * выданного списка, обрезанного по limit, а не числу совпадений (api-contract §8 N5).
 * Писать «Найдено» значило бы врать, когда совпадений больше лимита.
 */
export function SearchResults({
  query,
  result,
  isLoading,
  error,
  onRetry,
  onPressProduct,
  onOpenCatalog,
  bottomInset,
}: SearchResultsProps) {
  const items = result?.items ?? [];
  // Показываем именно тот запрос, который применил сервер (он обрезает пробелы).
  const applied = result?.query.trim() || query;
  const capped = items.length >= SEARCH_LIMIT;

  useEffect(() => {
    // Выдача занимает весь экран — клавиатура над ней только мешает. Новый запрос
    // (и первое появление сетки) всегда опускает её; вернуть можно тапом по полю.
    if (query.length > 0) Keyboard.dismiss();
  }, [query]);

  const header =
    items.length > 0 ? (
      <View style={styles.header}>
        <AppText variant="footnote" color="muted" numberOfLines={2}>
          {capped
            ? `Показаны ${SEARCH_LIMIT} самых подходящих по запросу «${applied}» — уточните его, чтобы сузить`
            : `Показано ${items.length} ${plural(items.length, "товар", "товара", "товаров")} по запросу «${applied}»`}
        </AppText>
      </View>
    ) : null;

  return (
    <ProductGrid
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      products={items}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      ListHeaderComponent={header}
      emptyIcon="magnifyingglass"
      emptyTitle={`По запросу «${applied}» ничего не нашлось`}
      emptySubtitle="Проверьте раскладку клавиатуры и опечатки. Короткий запрос работает лучше: «омега» вместо «омега 3 1000 мг»."
      emptyActionLabel="Весь каталог"
      onEmptyAction={onOpenCatalog}
      onPressProduct={onPressProduct}
      bottomPadding={bottomInset + spacing["2xl"]}
    />
  );
}

const styles = StyleSheet.create({
  // сетка держит поля сама (16 pt минус половина зазора), добираем разницу
  header: { paddingHorizontal: spacing.xs + 2, paddingTop: spacing.xs, paddingBottom: spacing.md },
});
