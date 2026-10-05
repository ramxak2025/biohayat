import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, Divider } from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { radii, spacing, useColors } from "@/theme";

import type { CartTotals } from "./pricing";

export interface CartSummaryProps {
  totals: CartTotals;
  style?: StyleProp<ViewStyle>;
}

/**
 * Итоговый блок корзины в привычном порядке: «Товары», «Скидка», «Итого».
 *
 * Строка «Скидка» появляется, только если экономия реально есть — иначе это
 * был бы нарисованный ноль. Отдельной строки «Доставка» с суммой быть не
 * может: сервер её не считает и в заказ не пишет, поэтому вместо цифры пишем,
 * кто её назовёт.
 */
export function CartSummary({ totals, style }: CartSummaryProps) {
  const colors = useColors();
  const hasDiscount = totals.discountKopecks > 0;

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.line }, style]}
    >
      <View style={styles.row}>
        <AppText variant="subhead" color="muted">
          Товары ({totals.count})
        </AppText>
        <AppText variant="subhead" weight="600">
          {formatKopecks(totals.itemsKopecks)}
        </AppText>
      </View>

      {hasDiscount ? (
        <View style={styles.row}>
          <AppText variant="subhead" color="muted">
            Скидка
          </AppText>
          <AppText variant="subhead" weight="600" style={{ color: colors.sale }}>
            −{formatKopecks(totals.discountKopecks)}
          </AppText>
        </View>
      ) : null}

      <View style={styles.row}>
        <AppText variant="subhead" color="muted">
          Доставка
        </AppText>
        <AppText variant="subhead" color="muted">
          рассчитает менеджер
        </AppText>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.row}>
        <AppText variant="headline">Итого</AppText>
        <AppText variant="title2" weight="800" maxScale={1.4}>
          {formatKopecks(totals.totalKopecks)}
        </AppText>
      </View>

      <View style={[styles.note, { backgroundColor: colors.brandSoft }]}>
        <SymbolView name="creditcard" size={15} tintColor={colors.brand} style={styles.noteIcon} />
        <AppText variant="footnote" color="muted" style={styles.noteText}>
          Оплата при получении. Заказ — это заявка, предоплата не нужна: менеджер свяжется и
          подтвердит состав, адрес и доставку.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.base,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  divider: { marginVertical: spacing.xs },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.xs,
  },
  noteIcon: { marginTop: 1 },
  noteText: { flex: 1 },
});
