import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { Product } from "@/api/types";
import { AppText } from "@/components/ui/app-text";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { spacing } from "@/theme";

import { ProductCard } from "./product-card";

const CARD_WIDTH = 168;
const GAP = spacing.md;

export interface ProductStripProps {
  products: Product[];
  isLoading?: boolean;
  cardWidth?: number;
  onPressProduct?: (product: Product) => void;
  /** Текст, когда подборка пуста. По умолчанию строка вовсе не рисуется. */
  emptyLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Горизонтальная подборка для главной. Короткие ленты держим на ScrollView —
 * FlashList здесь только добавляет накладные расходы.
 */
export function ProductStrip({
  products,
  isLoading,
  cardWidth = CARD_WIDTH,
  onPressProduct,
  emptyLabel,
  style,
}: ProductStripProps) {
  const interval = cardWidth + GAP;

  if (isLoading && products.length === 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={style}
      >
        {[0, 1, 2].map((index) => (
          <ProductCardSkeleton key={index} layout="grid" width={cardWidth} />
        ))}
      </ScrollView>
    );
  }

  if (products.length === 0) {
    return emptyLabel ? (
      <View style={styles.empty}>
        <AppText variant="subhead" color="faint">
          {emptyLabel}
        </AppText>
      </View>
    ) : null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // «карусельная» инерция iOS: карточки останавливаются по сетке
      snapToInterval={interval}
      decelerationRate="fast"
      snapToAlignment="start"
      contentContainerStyle={styles.content}
      style={style}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          layout="grid"
          index={index}
          width={cardWidth}
          onPress={onPressProduct}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.base, gap: GAP },
  empty: { paddingHorizontal: spacing.base, paddingVertical: spacing.lg },
});
