import { Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, PressableScale } from "@/components/ui";
import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

export interface HistoryChipProps {
  query: string;
  onPress: () => void;
  onRemove: () => void;
}

/**
 * Чипс истории запросов: две разные цели нажатия в одной пилюле — сам запрос
 * (повторить поиск) и крестик (забыть). Вложенный Pressable перехватывает касание
 * раньше родителя, поэтому крестик не запускает поиск.
 *
 * Крестик рисуем мелким, но его зона — честный квадрат 44 × 44 pt: слоп за
 * границами пилюли iOS всё равно обрезает, поэтому место отводим самой вёрсткой.
 */
export function HistoryChip({ query, onPress, onRemove }: HistoryChipProps) {
  const colors = useColors();

  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`Повторить поиск: ${query}`}
      style={styles.hit}
    >
      <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <AppText variant="subhead" weight="600" numberOfLines={1} style={styles.label}>
          {query}
        </AppText>

        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Убрать «${query}» из истории поиска`}
          style={styles.remove}
        >
          <SymbolView name="xmark" size={11} tintColor={colors.textFaint} weight="bold" />
        </Pressable>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // длинный запрос обрезается по ширине ряда, а не выталкивает соседей
  hit: { maxWidth: "100%" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MIN_TAP_SIZE,
    paddingLeft: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { flexShrink: 1 },
  remove: {
    width: MIN_TAP_SIZE,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
});
