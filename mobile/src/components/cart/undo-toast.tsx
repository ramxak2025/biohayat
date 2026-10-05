import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, {
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from "react-native-reanimated";

import { AppText, PressableScale } from "@/components/ui";
import { Duration, Ease, HIT_SLOP, MIN_TAP_SIZE, radii, shadows, spacing, useColors } from "@/theme";

export interface UndoToastProps {
  title: string;
  actionLabel?: string;
  onAction: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Плашка отмены удаления. Материал специально НЕ стеклянный: под ней уже висит
 * стеклянная панель оформления, а стекло по стеклу HIG запрещает.
 */
export function UndoToast({ title, actionLabel = "Вернуть", onAction, style }: UndoToastProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(Duration.base).easing(Ease.power3Out)}
      exiting={reduced ? undefined : FadeOutDown.duration(Duration.fast)}
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        shadows.md,
        { backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      <SymbolView name="trash" size={16} tintColor={colors.textMuted} />
      <AppText variant="subhead" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <PressableScale
        onPress={onAction}
        haptic="none"
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}: ${title}`}
        style={styles.action}
      >
        <AppText variant="subhead" color="brand" weight="700">
          {actionLabel}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  title: { flex: 1 },
  action: {
    minHeight: MIN_TAP_SIZE - 8,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
