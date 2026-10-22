import { Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import type { NativeStackNavigationOptions } from "expo-router";
import { SymbolView } from "expo-symbols";

import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";
import { PressableScale } from "./press-scale";

/** Native detents leave context visible; compact/large-text layouts get all available height. */
export function sheetScreenOptions(height: number, fontScale: number, backgroundColor: string): NativeStackNavigationOptions {
  const needsFullHeight = height < 700 || fontScale >= 1.3;
  return {
    presentation: "formSheet",
    headerShown: false,
    sheetAllowedDetents: needsFullHeight ? [1] : [0.8, 1],
    sheetInitialDetentIndex: 0,
    sheetGrabberVisible: true,
    sheetExpandsWhenScrolledToEdge: true,
    contentStyle: { backgroundColor },
  };
}

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  leading?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}

/** Short, wrapping sheet title and an independent reachable close target. */
export function SheetHeader({ title, onClose, closeLabel = "Закрыть", leading, onLayout, style }: SheetHeaderProps) {
  const colors = useColors();
  return (
    <View onLayout={onLayout} style={[styles.header, { backgroundColor: colors.surface }, style]}>
      {leading}
      <AppText variant="headline" accessibilityRole="header" style={styles.title}>{title}</AppText>
      <PressableScale
        onPress={onClose}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        style={styles.close}
      >
        <View style={[styles.closeDisc, { backgroundColor: colors.surfaceSunken }]}>
          <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} size={16} tintColor={colors.textMuted} weight="semibold" />
        </View>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.base, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { flex: 1, minWidth: 0 },
  close: { minWidth: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  closeDisc: { width: 32, height: 32, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
});
