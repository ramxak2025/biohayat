import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { useColors, vysota } from "@/theme";

/** Системная настройка применяется и к уже открытому экрану. */
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Материал применяется только в слое поверх фотографии. */
  photo?: boolean;
  dark?: boolean;
}

export function GlassSurface({ children, style, photo = false, dark = false }: GlassSurfaceProps) {
  const colors = useColors();
  const reduceTransparency = useReduceTransparency();

  if (!photo || reduceTransparency || Platform.OS !== "ios") {
    return (
      <View style={[styles.base, { backgroundColor: photo ? vysota.pine : colors.surface }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={52} tint="dark" style={[styles.base, style]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          backgroundColor: dark ? "rgba(11,22,16,.42)" : "rgba(238,241,234,.13)",
        }]}
      />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
});
