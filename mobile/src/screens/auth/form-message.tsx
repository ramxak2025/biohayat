import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { AppText, PressableScale } from "@/components/ui";
import { Duration, Ease, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

import type { AuthFormError } from "./types";

export interface FormMessageProps {
  error: AuthFormError;
  /** 409: номер занят — одной ссылкой уводим во «Вход» с тем же номером. */
  onSwitchToLogin: () => void;
}

/**
 * Ошибка всей отправки — строкой, а не баннером: плашка в пол-экрана читается
 * как авария, хотя почти всегда это опечатка в пароле.
 *
 * Если ошибку удалось привязать к полю, она уже написана под этим полем —
 * здесь текст не повторяем, остаётся только предложение перейти ко входу.
 */
export function FormMessage({ error, onSwitchToLogin }: FormMessageProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const isInfo = error.tone === "info";
  const showText = !error.field;

  if (!showText && !error.offerLogin) return null;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(Duration.fast).easing(Ease.power2Out)}
      exiting={reduced ? undefined : FadeOut.duration(Duration.instant)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.wrap}
    >
      {showText ? (
        <View style={styles.row}>
          <SymbolView
            name={isInfo ? "info.circle" : "exclamationmark.circle.fill"}
            size={14}
            weight="semibold"
            tintColor={isInfo ? colors.textMuted : colors.danger}
            style={styles.icon}
          />
          <AppText variant="footnote" color={isInfo ? "muted" : "danger"} style={styles.text}>
            {error.message}
          </AppText>
        </View>
      ) : null}

      {error.offerLogin ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Войти с этим номером"
          haptic="none"
          onPress={onSwitchToLogin}
          style={styles.link}
        >
          <AppText variant="footnote" color="brand" weight="600">
            Войти с этим номером
          </AppText>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs + 2 },
  icon: { marginTop: 2 },
  // flexShrink, а не flex: 1 — строка живёт в контейнере с alignItems: "center"
  text: { flexShrink: 1 },
  link: { minHeight: MIN_TAP_SIZE, justifyContent: "center" },
});
