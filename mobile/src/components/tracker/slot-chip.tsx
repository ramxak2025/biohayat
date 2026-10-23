import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { AppText, PressableScale } from "@/components/ui";
import { radii, spacing, useColors } from "@/theme";

export interface SlotChipProps { time: string; taken: boolean; pending?: boolean; disabled?: boolean; unknown?: boolean; onPress: () => void }
/** The check follows durable controller state, never the initial tap. */
export function SlotChip({ time, taken, pending = false, disabled = false, unknown = false, onPress }: SlotChipProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const fill = useSharedValue(taken ? 1 : 0);
  useEffect(() => { fill.value = withTiming(taken ? 1 : 0, { duration: reduced ? 0 : 180 }); }, [taken, reduced, fill]);
  const feedback = useAnimatedStyle(() => ({ opacity: 0.55 + fill.value * 0.45 }));
  const uncertain = unknown && !taken;
  return <PressableScale onPress={onPress} disabled={disabled || pending} haptic="none" scale={reduced ? 1 : 0.985}
    accessibilityRole={uncertain ? "button" : "checkbox"}
    accessibilityState={{ ...(uncertain ? {} : { checked: taken }), disabled: disabled || pending, busy: pending }}
    accessibilityLabel={uncertain ? `Отметить на телефоне приём в ${time}` : `Приём в ${time}, ${taken ? "отмечен" : "не отмечен"}`}
    style={[styles.control, { borderColor: taken ? colors.brandBorder : colors.line, backgroundColor: taken ? colors.brandSoft : colors.surfaceSunken }]}>
    {pending ? <ActivityIndicator color={colors.brandText} /> : <Animated.View style={feedback}>
      <SymbolView name={taken ? { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } : { ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" }} size={22} tintColor={taken ? colors.success : colors.textMuted} />
    </Animated.View>}
    <AppText variant="footnote" weight="600">{pending ? "Сохраняем…" : uncertain ? "Отметить на телефоне" : taken ? "Принято" : "Отметить"}</AppText>
  </PressableScale>;
}
const styles = StyleSheet.create({ control: { minHeight: Platform.OS === "android" ? 48 : 44, minWidth: 44, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm } });
