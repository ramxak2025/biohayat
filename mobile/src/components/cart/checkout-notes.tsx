import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";

import { AppText, Divider } from "@/components/ui";
import { radii, spacing, useColors } from "@/theme";

interface Note {
  icon: SFSymbol;
  title: string;
  text: string;
}

/**
 * Что происходит после отправки заявки.
 *
 * В знакомых покупателю магазинах на этом месте стоят способ оплаты и дата
 * доставки. У нас их нет: онлайн-оплаты не существует, доставку сервер не
 * считает, а заказ — это заявка (см. контракт `POST /orders`). Поэтому ожидание
 * проговорено прямо и заметно, а не оставлено на догадки.
 */
const NOTES: Note[] = [
  {
    icon: "creditcard",
    title: "Оплата при получении",
    text: "Онлайн-оплаты нет, предоплата не нужна.",
  },
  {
    icon: "shippingbox",
    title: "Доставку рассчитает менеджер",
    text: "Способ, сроки и стоимость согласуем по телефону.",
  },
  {
    icon: "phone.badge.checkmark",
    title: "Это заявка — менеджер свяжется для подтверждения",
    text: "Он проверит состав заказа и адрес, прежде чем мы соберём его.",
  },
];

export interface CheckoutNotesProps {
  style?: StyleProp<ViewStyle>;
}

export function CheckoutNotes({ style }: CheckoutNotesProps) {
  const colors = useColors();

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder }, style]}
    >
      {NOTES.map((note, index) => (
        <View key={note.title}>
          {index > 0 ? <Divider style={styles.divider} /> : null}
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
              <SymbolView name={note.icon} size={15} tintColor={colors.brand} />
            </View>
            <View style={styles.body}>
              <AppText variant="subhead" weight="600">
                {note.title}
              </AppText>
              <AppText variant="footnote" color="muted">
                {note.text}
              </AppText>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.base,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: { marginVertical: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
});
