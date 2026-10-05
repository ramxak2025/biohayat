import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { Order } from "@/api/types";
import { AppText, Badge, Card, Divider } from "@/components/ui";
import { formatDateRelative, formatKopecks, plural } from "@/lib/format";
import { Duration, Ease, spacing, staggerDelay } from "@/theme";

import { OrderProgress } from "./order-progress";
import { ORDER_STATUS_TONE, orderStatusLabel } from "./order-status";

/** Сколько позиций показываем в карточке до «и ещё N». */
const PREVIEW_ITEMS = 3;

export interface OrderCardProps {
  order: Order;
  index?: number;
  onPress: (order: Order) => void;
}

export function OrderCard({ order, index = 0, onPress }: OrderCardProps) {
  const reduced = useReducedMotion();
  const preview = order.items.slice(0, PREVIEW_ITEMS);
  const rest = order.items.length - preview.length;
  const label = orderStatusLabel(order);

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index)).duration(Duration.reveal).easing(Ease.power3Out)
      }
    >
      <Card
        onPress={() => onPress(order)}
        accessibilityLabel={`Заказ номер ${order.number} от ${formatDateRelative(order.createdAt)}, ${label}, ${formatKopecks(order.total.kopecks)}`}
        padded={spacing.base}
      >
        <View style={styles.header}>
          <View style={styles.headerTitles}>
            <AppText variant="headline">{`Заказ №${order.number}`}</AppText>
            <AppText variant="footnote" color="muted">
              {formatDateRelative(order.createdAt)}
            </AppText>
          </View>
          <Badge label={label} tone={ORDER_STATUS_TONE[order.status]} size="sm" />
        </View>

        {order.status === "CANCELLED" ? null : (
          <View style={styles.progress}>
            <OrderProgress status={order.status} compact />
          </View>
        )}

        <View style={styles.items}>
          {preview.map((item, itemIndex) => (
            <AppText
              key={`${item.name}-${itemIndex}`}
              variant="footnote"
              color="muted"
              numberOfLines={1}
            >
              {`${item.name} × ${item.qty}`}
            </AppText>
          ))}
          {rest > 0 ? (
            <AppText variant="footnote" color="faint">
              {`и ещё ${rest} ${plural(rest, "позиция", "позиции", "позиций")}`}
            </AppText>
          ) : null}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.footer}>
          <AppText variant="subhead" color="muted">
            Итого
          </AppText>
          <AppText variant="headline" weight="800" maxScale={1.4}>
            {formatKopecks(order.total.kopecks)}
          </AppText>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerTitles: { flex: 1, gap: 1 },
  progress: { marginTop: spacing.base },
  items: { marginTop: spacing.md, gap: 2 },
  divider: { marginTop: spacing.md },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
  },
});
