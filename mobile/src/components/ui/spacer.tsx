import { View } from "react-native";

import { spacing } from "@/theme";

export interface SpacerProps {
  /** Ключ шкалы отступов или число в pt. */
  size?: keyof typeof spacing | number;
  /** Распирает свободное место (для тулбаров и строк). */
  flex?: boolean;
  horizontal?: boolean;
}

export function Spacer({ size = "base", flex, horizontal }: SpacerProps) {
  if (flex) return <View style={{ flex: 1 }} />;
  const value = typeof size === "number" ? size : spacing[size];
  return <View style={horizontal ? { width: value } : { height: value }} />;
}
