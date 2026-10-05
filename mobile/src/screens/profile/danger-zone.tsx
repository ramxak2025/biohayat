import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { ApiError } from "@/api/client";
import { api } from "@/api/endpoints";
import { openExternalUrl, sendSupportRequest, telHref } from "@/components/account";
import {
  AppText,
  Button,
  Card,
  errorMessage,
  PasswordInput,
  PressableScale,
} from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/store/auth";
import { sessionGeneration } from "@/lib/session-generation";
import { Duration, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

/**
 * Удаление аккаунта прямо в приложении — требование App Store 5.1.1(v).
 * Сервер подтверждает операцию паролем; если развёрнута старая сборка API без
 * DELETE /auth/me, честно переключаемся на заявку менеджеру.
 */
export function DangerZone() {
  const colors = useColors();
  const router = useRouter();
  const reduced = useReducedMotion();

  const logout = useAuth((state) => state.logout);
  const { data: settings } = useSettings();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);

  const finishLogout = useCallback(async (epoch: number) => {
    if (epoch !== sessionGeneration()) return;
    await logout();
    if (sessionGeneration() !== epoch + 1) return;
    if (router.canGoBack()) router.back();
    else router.replace("/" as Href);
  }, [logout, router]);

  /** План Б: заявка в поддержку, если эндпоинт удаления недоступен на сервере. */
  const requestManualDeletion = useCallback(async () => {
    const epoch = sessionGeneration();
    try {
      await sendSupportRequest(
        "Удаление аккаунта",
        "Прошу удалить мой аккаунт и персональные данные из приложения ХАЯТ.",
      );
      if (epoch !== sessionGeneration()) return;
      Alert.alert(
        "Заявка отправлена",
        "Менеджер удалит аккаунт и подтвердит это по телефону в течение трёх рабочих дней.",
      );
      await finishLogout(epoch);
    } catch {
      if (epoch !== sessionGeneration()) return;
      Alert.alert(
        "Не удалось отправить заявку",
        settings
          ? "Позвоните нам — аккаунт удалят по вашему обращению."
          : "Проверьте соединение и попробуйте ещё раз.",
        settings
          ? [
              { text: "Закрыть", style: "cancel" },
              { text: "Позвонить", onPress: () => void openExternalUrl(telHref(settings.phone)) },
            ]
          : undefined,
      );
    }
  }, [finishLogout, settings]);

  const submit = useCallback(async () => {
    const epoch = sessionGeneration();
    if (!password) {
      setError("Введите пароль, чтобы подтвердить удаление");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await api.auth.deleteAccount(password);
      if (epoch !== sessionGeneration()) return;
      Alert.alert("Аккаунт удалён", "Данные стёрты. Спасибо, что были с нами.");
      await finishLogout(epoch);
    } catch (deleteError) {
      if (epoch !== sessionGeneration()) return;
      const apiError = deleteError instanceof ApiError ? deleteError : null;
      if (apiError?.status === 403) {
        setError("Неверный пароль");
      } else if (apiError?.status === 404) {
        // старая сборка API: маршрута ещё нет — уводим в поддержку, а не в тупик
        await requestManualDeletion();
      } else {
        setError(errorMessage(deleteError));
      }
    } finally {
      if (epoch === sessionGeneration()) setPending(false);
    }
  }, [password, finishLogout, requestManualDeletion]);

  const confirm = useCallback(() => {
    Alert.alert(
      "Удалить аккаунт?",
      "Профиль, избранное и курсы приёма будут удалены безвозвратно. Восстановить их нельзя.",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Продолжить", style: "destructive", onPress: () => setOpen(true) },
      ],
      { cancelable: true },
    );
  }, []);

  return (
    <Card>
      <View style={styles.header}>
        <SymbolView name="person.crop.circle.badge.xmark" size={19} tintColor={colors.danger} />
        <AppText variant="headline">Удаление аккаунта</AppText>
      </View>

      <AppText variant="footnote" color="muted" style={styles.note}>
        Удалим профиль, избранное и курсы приёма. Оформленные заказы останутся в
        бухгалтерии в обезличенном виде — этого требует закон.
      </AppText>

      {open ? (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(Duration.base)}>
          <PasswordInput
            label="Пароль для подтверждения"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            error={error}
            textContentType="password"
            containerStyle={styles.field}
          />
          <Button
            title="Удалить навсегда"
            variant="danger"
            fullWidth
            loading={isPending}
            onPress={() => void submit()}
          />
          <Button
            title="Отмена"
            variant="ghost"
            size="sm"
            onPress={() => {
              setOpen(false);
              setPassword("");
              setError(null);
            }}
            style={styles.cancel}
          />
        </Animated.View>
      ) : (
        <PressableScale
          onPress={confirm}
          haptic="medium"
          accessibilityRole="button"
          accessibilityLabel="Удалить аккаунт"
          accessibilityHint="Потребуется подтверждение паролем"
          style={styles.trigger}
        >
          {isPending ? <ActivityIndicator color={colors.danger} /> : null}
          <AppText variant="callout" color="danger" weight="600">
            Удалить аккаунт
          </AppText>
        </PressableScale>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  note: { marginTop: spacing.sm, marginBottom: spacing.base },
  field: { marginBottom: spacing.base },
  cancel: { alignSelf: "center", marginTop: spacing.xs },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: MIN_TAP_SIZE,
  },
});
