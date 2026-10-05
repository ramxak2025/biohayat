import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";

import type { Product } from "@/api/types";
import { AppText, Card } from "@/components/ui";
import { radii, spacing, useColors } from "@/theme";

export interface ProductTrackerCardProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/**
 * «Добавить в курс приёма» — наша функция, которой у маркетплейсов нет.
 *
 * Стоит отдельным блоком ПОСЛЕ характеристик и до описания: на линии покупки
 * (цена → характеристики → в корзину) второе заметное действие спорило бы с
 * главным, а здесь оно попадается уже принявшему решение читателю.
 */
export function ProductTrackerCard({ product, style }: ProductTrackerCardProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Card
      tone="brand"
      onPress={() =>
        router.push(
          `/tracker/new?productId=${encodeURIComponent(product.id)}&title=${encodeURIComponent(product.name)}` as Href,
        )
      }
      accessibilityLabel={`Добавить «${product.name}» в курс приёма`}
      style={[styles.card, style]}
    >
      <View style={[styles.icon, { backgroundColor: colors.brand }]}>
        <SymbolView name="pills.fill" size={18} tintColor={colors.textOnBrand} />
      </View>

      <View style={styles.text}>
        <AppText variant="headline">Добавить в курс приёма</AppText>
        <AppText variant="footnote" color="muted">
          Напомним принять вовремя и покажем прогресс курса
        </AppText>
      </View>

      <SymbolView name="chevron.right" size={13} tintColor={colors.brand} weight="semibold" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
});
