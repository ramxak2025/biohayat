import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useColors } from "@/theme";

export interface DividerProps {
  /** Отступ слева (как у inset-разделителей системных списков). */
  inset?: number;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ inset = 0, vertical, style }: DividerProps) {
  const colors = useColors();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: colors.line },
        vertical ? null : { marginLeft: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // StyleSheet.hairlineWidth — ровно одна физическая точка, как в системных списках
  horizontal: { height: StyleSheet.hairlineWidth, width: "100%" },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
});
