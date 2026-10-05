import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { AppText, Button, GlassSurface } from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { radii, spacing } from "@/theme";

export interface CheckoutBarProps {
  /** Подпись над суммой: «3 товара» в корзине, «Итого» на оформлении. */
  caption: string;
  totalKopecks: number;
  actionTitle: string;
  onAction: () => void;
  actionIcon?: SFSymbol;
  loading?: boolean;
  disabled?: boolean;
  actionHint?: string;
  /** Мелкая строка под кнопкой — например согласие 152-ФЗ. */
  note?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Липкая нижняя панель «итог + главное действие». Одна и та же в корзине и на
 * оформлении: кнопка всегда на виду, и человеку не приходится искать её заново
 * на следующем шаге.
 *
 * Материал — системное стекло, поэтому по HIG внутри нет ни своих фонов, ни
 * рамок: оно рисует себя само и обязано оставаться в навигационном слое.
 */
export function CheckoutBar({
  caption,
  totalKopecks,
  actionTitle,
  onAction,
  actionIcon,
  loading,
  disabled,
  actionHint,
  note,
  style,
}: CheckoutBarProps) {
  return (
    <GlassSurface style={[styles.glass, style]}>
      <View style={styles.row}>
        <View style={styles.total}>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {caption}
          </AppText>
          <AppText
            variant="title3"
            weight="800"
            numberOfLines={1}
            maxScale={1.3}
            // на узких экранах сумма ужимается, но не превращается в «12 40…»
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {formatKopecks(totalKopecks)}
          </AppText>
        </View>

        <Button
          title={actionTitle}
          size="lg"
          rightIcon={actionIcon}
          loading={loading}
          disabled={disabled}
          onPress={onAction}
          accessibilityHint={actionHint}
          style={styles.cta}
        />
      </View>

      {note ? <View style={styles.note}>{note}</View> : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: radii["3xl"],
    marginHorizontal: spacing.base,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  total: { flex: 1, gap: 2 },
  // кнопка уступает место сумме, а не выдавливает её за край
  cta: { flexShrink: 1 },
  note: { marginTop: spacing.sm, paddingHorizontal: spacing.xs },
});
