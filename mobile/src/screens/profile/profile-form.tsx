import { sessionGeneration } from "@/lib/session-generation";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Customer, UpdateProfileBody } from "@/api/types";
import { sendSupportRequest } from "@/components/account";
import { AppText, Button, Card, errorMessage, Input, PressableScale } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { HIT_SLOP, spacing, useColors } from "@/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ProfileFormProps {
  customer: Customer;
}

interface FieldErrors {
  name?: string;
  email?: string;
  city?: string;
}

/**
 * Личные данные. Монтируется с key={customer.id}, поэтому начальное состояние
 * берётся из props — фоновое обновление профиля не затирает то, что человек набрал.
 */
export function ProfileForm({ customer }: ProfileFormProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const epoch = sessionGeneration();
  const setCustomer = useAuth((state) => state.setCustomer);

  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [city, setCity] = useState(customer.city ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);

  const dirty = useMemo(
    () =>
      name.trim() !== customer.name ||
      email.trim() !== (customer.email ?? "") ||
      city.trim() !== (customer.city ?? ""),
    [name, email, city, customer],
  );

  const save = useMutation({
    mutationFn: (body: UpdateProfileBody) => api.auth.updateMe(body),
    onSuccess: (updated) => {
      if (epoch !== sessionGeneration()) return;
      // кладём профиль и в стор (он же кэш в Keychain), и в кэш запросов
      setCustomer(updated);
      queryClient.setQueryData(qk.me, updated);
      setSaved(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: unknown) => {
      Alert.alert("Не удалось сохранить", errorMessage(error));
    },
  });

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setSaved(false);
    setErrors({});
  };

  const submit = () => {
    const next: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCity = city.trim();

    if (trimmedName.length < 2) next.name = "Введите имя — минимум 2 символа";
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) next.email = "Проверьте адрес электронной почты";
    if (trimmedCity.length > 120) next.city = "Слишком длинное название";

    setErrors(next);
    if (Object.keys(next).length) return;

    save.mutate({ name: trimmedName, email: trimmedEmail, city: trimmedCity });
  };

  const requestPhoneChange = () => {
    Alert.alert(
      "Сменить номер телефона",
      "Номер — это ваш логин, поэтому меняет его только менеджер. Отправить заявку в поддержку?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Отправить",
          onPress: () => {
            void (async () => {
              try {
                await sendSupportRequest(
                  "Смена номера телефона",
                  `Прошу сменить номер телефона в аккаунте. Текущий номер: ${customer.phone}.`,
                );
                Alert.alert("Заявка отправлена", "Менеджер свяжется с вами по текущему номеру.");
              } catch (error) {
                Alert.alert("Не удалось отправить заявку", errorMessage(error));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Card>
      <Input
        label="Телефон"
        value={formatPhone(customer.phone)}
        editable={false}
        leftIcon="phone.fill"
        hint="Телефон — ваш логин, изменить его в приложении нельзя."
        containerStyle={styles.field}
      />

      <PressableScale
        onPress={requestPhoneChange}
        haptic="none"
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Сменить номер телефона через поддержку"
        style={styles.phoneLink}
      >
        <AppText variant="footnote" color="brand" weight="600">
          Сменить номер
        </AppText>
      </PressableScale>

      <Input
        label="Имя"
        value={name}
        onChangeText={update(setName)}
        error={errors.name}
        placeholder="Как к вам обращаться"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        containerStyle={styles.field}
      />

      <Input
        label="E-mail"
        value={email}
        onChangeText={update(setEmail)}
        error={errors.email}
        placeholder="Необязательно"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.field}
      />

      <Input
        label="Город"
        value={city}
        onChangeText={update(setCity)}
        error={errors.city}
        placeholder="Например, Грозный"
        textContentType="addressCity"
        autoCapitalize="words"
        containerStyle={styles.field}
      />

      <Button
        title="Сохранить"
        onPress={submit}
        loading={save.isPending}
        disabled={!dirty}
        fullWidth
        style={styles.submit}
      />

      {saved && !dirty ? (
        <View style={styles.saved} accessibilityLiveRegion="polite">
          <SymbolView name="checkmark.circle.fill" size={15} tintColor={colors.success} />
          <AppText variant="footnote" color="success" weight="600">
            Профиль обновлён
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.base },
  phoneLink: { alignSelf: "flex-start", marginTop: -spacing.sm, marginBottom: spacing.base },
  submit: { marginTop: spacing.xs },
  saved: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    marginTop: spacing.md,
  },
});
