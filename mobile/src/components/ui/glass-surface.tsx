import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";

import { useColors, useTheme } from "@/theme";

/**
 * Настройка «Уменьшение прозрачности». Читаем при старте и слушаем изменения:
 * пользователь может переключить её, не убивая приложение.
 */
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
  /** Цветное «витражное» стекло. По HIG — не больше одного на экран. */
  tint?: string;
  /** Стекло реагирует на касание (только iOS 26+). */
  interactive?: boolean;
  /** Сила размытия для отката на expo-blur (1..100). */
  intensity?: number;
  glassStyle?: "regular" | "clear";
}

/**
 * Плавающая «стеклянная» подложка для навигационной хромы: нижняя панель
 * «В корзину», рейка фильтров, кнопки поверх фото.
 *
 * НИКОГДА не ставить под контент — HIG прямо запрещает стекло в контентном слое.
 *
 * Три уровня деградации:
 *   1. iOS 26 + API доступен → настоящий Liquid Glass (GlassView);
 *   2. iOS < 26 → expo-blur;
 *   3. включено «Уменьшение прозрачности» → сплошная подложка.
 */
export function GlassSurface({
  children,
  style,
  tint,
  interactive = false,
  intensity = 32,
  glassStyle = "regular",
}: GlassSurfaceProps) {
  const colors = useColors();
  const theme = useTheme();
  const reduceTransparency = useReduceTransparency();

  if (reduceTransparency) {
    return <View style={[styles.base, { backgroundColor: colors.surface }, style]}>{children}</View>;
  }

  // isGlassEffectAPIAvailable(), а не проверка версии: в части бет iOS 26 API нет и рендер падает
  if (isGlassEffectAPIAvailable() && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={[styles.base, style]}
        glassEffectStyle={glassStyle}
        isInteractive={interactive}
        tintColor={tint}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={theme.dark ? "systemThickMaterialDark" : "systemThickMaterialLight"}
      style={[styles.base, styles.clipped, style]}
    >
      {tint ? <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} /> : null}
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
  // BlurView без overflow:hidden пропускает размытие за скруглённые углы
  clipped: { overflow: "hidden" },
});
