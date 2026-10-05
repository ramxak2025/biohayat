import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { ApiError } from "@/api/client";
import { api } from "@/api/endpoints";
import { AppText, Button, Card, errorMessage, PasswordInput } from "@/components/ui";
import { Duration, spacing } from "@/theme";

const MIN_LENGTH = 6;

/** Смена пароля. Экрана восстановления в API нет, поэтому это единственный способ. */
export function PasswordSection() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => api.auth.changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      setOldPassword("");
      setNewPassword("");
      setOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Пароль изменён", "Используйте новый пароль при следующем входе.");
    },
    onError: (mutationError: unknown) => {
      const wrongPassword = mutationError instanceof ApiError && mutationError.status === 403;
      setError(wrongPassword ? "Текущий пароль указан неверно" : errorMessage(mutationError));
    },
  });

  const submit = () => {
    if (newPassword.length < MIN_LENGTH) {
      setError(`Новый пароль — не короче ${MIN_LENGTH} символов`);
      return;
    }
    if (newPassword === oldPassword) {
      setError("Новый пароль совпадает с текущим");
      return;
    }
    setError(null);
    change.mutate();
  };

  if (!open) {
    return (
      <Card>
        <View style={styles.row}>
          <View style={styles.titles}>
            <AppText variant="headline">Пароль</AppText>
            <AppText variant="footnote" color="muted">
              Меняйте его, если кто-то мог его узнать.
            </AppText>
          </View>
          <Button title="Изменить" variant="secondary" size="sm" onPress={() => setOpen(true)} />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <AppText variant="headline" style={styles.title}>
        Смена пароля
      </AppText>

      <PasswordInput
        label="Текущий пароль"
        value={oldPassword}
        onChangeText={(value) => {
          setOldPassword(value);
          setError(null);
        }}
        textContentType="password"
        containerStyle={styles.field}
      />

      <PasswordInput
        label="Новый пароль"
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          setError(null);
        }}
        textContentType="newPassword"
        hint={`Не короче ${MIN_LENGTH} символов`}
        error={error}
        containerStyle={styles.field}
      />

      <Animated.View entering={reduced ? undefined : FadeIn.duration(Duration.fast)} style={styles.actions}>
        <Button
          title="Сохранить пароль"
          onPress={submit}
          loading={change.isPending}
          disabled={!oldPassword || !newPassword}
          fullWidth
        />
        <Button
          title="Отмена"
          variant="ghost"
          size="sm"
          onPress={() => {
            setOpen(false);
            setError(null);
            setOldPassword("");
            setNewPassword("");
          }}
          style={styles.cancel}
        />
      </Animated.View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  titles: { flex: 1, gap: 2 },
  title: { marginBottom: spacing.base },
  field: { marginBottom: spacing.base },
  actions: { gap: spacing.sm },
  cancel: { alignSelf: "center" },
});
