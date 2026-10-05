import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView } from "expo-symbols";

import { ApiError } from "@/api/client";
import { radii, spacing, useColors } from "@/theme";

import { AppText } from "./app-text";
import { Button } from "./button";

/** Человеческий русский текст из чего угодно, что прилетело в catch. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetwork) return "Нет соединения";
    if (error.status === 404) return "Ничего не нашлось";
    if (error.status === 401) return "Нужно войти заново";
    if (error.status >= 500) return "Сервер не отвечает";
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Что-то пошло не так";
}

/** Подсказка «что делать», когда сама ошибка её не объясняет. */
function errorHint(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    if (error.isNetwork) return "Проверьте интернет и попробуйте ещё раз.";
    if (error.status >= 500) return "Мы уже знаем о проблеме. Попробуйте чуть позже.";
  }
  return undefined;
}

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Заголовок вместо автоматического. */
  title?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({ error, onRetry, title, compact, style }: ErrorStateProps) {
  const colors = useColors();
  const message = title ?? errorMessage(error);
  const hint = errorHint(error);
  const offline = error instanceof ApiError && error.isNetwork;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.wrap, compact ? styles.compact : null, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
        <SymbolView
          name={offline ? "wifi.slash" : "exclamationmark.triangle"}
          size={compact ? 22 : 28}
          tintColor={colors.danger}
        />
      </View>

      <AppText variant={compact ? "headline" : "title3"} align="center" style={styles.title}>
        {message}
      </AppText>

      {hint ? (
        <AppText variant="subhead" color="muted" align="center" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}

      {onRetry ? (
        <Button
          title="Повторить"
          onPress={onRetry}
          variant="secondary"
          size={compact ? "sm" : "md"}
          leftIcon="arrow.clockwise"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing["3xl"], paddingHorizontal: spacing.lg },
  compact: { paddingVertical: spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.xs },
  hint: { maxWidth: 300 },
  action: { marginTop: spacing.base },
});
