import { StyleSheet, View } from "react-native";

import type { Money, OrderItem } from "@/api/types";
import { AppText, Divider } from "@/components/ui";
import { formatKopecks, plural } from "@/lib/format";
import { spacing } from "@/theme";

export interface OrderItemsProps {
  items: OrderItem[];
  total: Money;
  /** Приписка про то, что доставку считает менеджер (нужна на экране заказа). */
  withDeliveryNote?: boolean;
}

/** Состав заказа: снимок названий и цен на момент оформления. */
export function OrderItems({ items, total, withDeliveryNote = false }: OrderItemsProps) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.row}>
          <View style={styles.titles}>
            <AppText variant="callout" numberOfLines={3}>
              {item.name}
            </AppText>
            <AppText variant="footnote" color="muted">
              {`${item.qty} × ${formatKopecks(item.price.kopecks)}`}
            </AppText>
          </View>
          <AppText variant="callout" weight="600" maxScale={1.4}>
            {formatKopecks(item.lineTotal.kopecks)}
          </AppText>
        </View>
      ))}

      <Divider style={styles.divider} />

      <View style={styles.totalRow}>
        <View>
          <AppText variant="headline">Итого</AppText>
          <AppText variant="footnote" color="muted">
            {`${items.length} ${plural(items.length, "позиция", "позиции", "позиций")}`}
          </AppText>
        </View>
        <AppText variant="title3" weight="800" maxScale={1.4}>
          {formatKopecks(total.kopecks)}
        </AppText>
      </View>

      {withDeliveryNote ? (
        <AppText variant="footnote" color="faint" style={styles.note}>
          Сумма — за товары. Доставку рассчитывает менеджер при подтверждении заказа.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  titles: { flex: 1, gap: 2 },
  divider: { marginTop: spacing.sm },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  note: { marginTop: spacing.sm },
});
