import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";

import type { Money } from "@/api/types";
import { AppText, Card } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { formatKopecks } from "@/lib/format";
import { radii, spacing, useColors } from "@/theme";

export interface ProductAssuranceProps {
  /** Цена товара: от неё зависит, бесплатна ли доставка именно этого товара. */
  price: Money;
  style?: StyleProp<ViewStyle>;
}

interface Line {
  icon: SFSymbol;
  text: string;
}

/**
 * Блок «как это работает» под ценой — там же, где покупатель Wildberries привык
 * видеть условия доставки и оплаты.
 *
 * Главное здесь — честность, а не бодрость: сроков доставки, способов и слотов
 * у нас в API нет, зато есть факт, к которому человек с маркетплейса не готов —
 * заказ уходит заявкой, менеджер перезванивает, оплата при получении. Лучше
 * прочитать это до корзины, чем удивиться после.
 */
export function ProductAssurance({ price, style }: ProductAssuranceProps) {
  const colors = useColors();
  const { data: settings } = useSettings();

  const threshold = settings?.freeDeliveryThreshold?.kopecks ?? null;
  const freeNow = threshold !== null && price.kopecks >= threshold;

  const lines: Line[] = [
    {
      icon: "shippingbox",
      text: freeNow
        ? "Бесплатная доставка этого товара по России"
        : threshold !== null
          ? `Бесплатная доставка от ${formatKopecks(threshold)}`
          : "Доставка по всей России",
    },
    {
      icon: "phone",
      text: "Заказ — это заявка: менеджер перезвонит, подтвердит состав и доставку",
    },
    {
      icon: "creditcard",
      text: "Оплата при получении. Онлайн-оплаты в приложении пока нет",
    },
  ];

  return (
    <Card tone="soft" elevated={false} padded={spacing.base} style={style}>
      <View style={styles.list}>
        {lines.map((line) => (
          <View key={line.icon} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <SymbolView name={line.icon} size={15} tintColor={colors.brand} weight="medium" />
            </View>
            <AppText variant="footnote" color="muted" style={styles.text}>
              {line.text}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
});
