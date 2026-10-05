import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView, KeyboardController } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import { openExternalUrl, telHref } from "@/components/account";
import {
  AppText,
  Button,
  IconButton,
  Input,
  PasswordInput,
  PhoneInput,
  PressableScale,
} from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";
import { isValidPhone } from "@/lib/format";
import { Duration, Ease, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

import { FormMessage } from "./form-message";
import { LegalNote } from "./legal-note";
import { useAuthForm } from "./use-auth-form";
import type { AuthMode } from "./types";

/**
 * Вход и регистрация одним листом.
 *
 * Экран сознательно короткий: заголовок, поля, одна кнопка — и всё остальное
 * строками мелкого текста под ней. Смена режима не вкладками сверху, а ссылкой
 * внизу: вкладки заставляют выбирать до того, как человек понял, что ему нужно,
 * и удваивают видимый вес экрана.
 *
 * Лист показывается нативно (`presentation: "formSheet"`), навигационной панели
 * у него нет — заголовок и кнопку закрытия рисуем сами.
 */
export function AuthScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [mode, setMode] = useState<AuthMode>("login");
  const isRegister = mode === "register";

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const { patch, clearErrors, submit, values, fieldErrors, formError, pending } = useAuthForm(
    mode,
    close,
  );

  const switchTo = useCallback(
    (next: AuthMode) => {
      // «выбор» вместо удара: так звучит смена состояния в системных контролах
      void Haptics.selectionAsync();
      setMode(next);
      clearErrors();
    },
    [clearErrors],
  );

  const toggleMode = useCallback(
    () => switchTo(isRegister ? "login" : "register"),
    [isRegister, switchTo],
  );

  const goToLogin = useCallback(() => switchTo("login"), [switchTo]);

  const focusNext = useCallback(() => KeyboardController.setFocusTo("next"), []);

  const phoneComplete = isValidPhone(values.phone);
  const onPhoneChange = useCallback(
    (phone: string) => {
      patch({ phone });
      // у телефонной клавиатуры iOS нет Return — переводим фокус сами, когда номер собран
      if (!phoneComplete && isValidPhone(phone)) KeyboardController.setFocusTo("next");
    },
    [patch, phoneComplete],
  );

  // Восстановления пароля в API нет вовсе — единственный честный выход для
  // человека — позвонить в магазин. Поэтому не блок на пол-экрана, а одна ссылка.
  const supportPhone = useSettings().data?.phone;
  const callSupport = useCallback(() => {
    if (!supportPhone) return;
    void openExternalUrl(telHref(supportPhone), "Позвоните нам по номеру из раздела «Кабинет».");
  }, [supportPhone]);

  const action = isRegister ? "Создать аккаунт" : "Войти";

  const flow = reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2Out);
  const appear = reduced ? undefined : FadeIn.duration(Duration.base).easing(Ease.power2Out);
  const vanish = reduced ? undefined : FadeOut.duration(Duration.instant);

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <KeyboardAwareScrollView
        bottomOffset={spacing["2xl"]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <View style={styles.header}>
          <AppText variant="title1" style={styles.title}>
            {isRegister ? "Регистрация" : "Вход"}
          </AppText>
          <IconButton name="xmark" label="Закрыть" variant="soft" size={15} onPress={close} />
        </View>

        {/* Поля без подписей: в форме из трёх строк подпись над каждой — лишний
            шум, роль поля видна по placeholder'у, а VoiceOver читает
            accessibilityLabel. Пустой label — это осознанное «подписи нет».
            collapsable={false} — иначе exiting-анимация поля «Имя» не доигрывает. */}
        <View style={styles.form} collapsable={false}>
          {isRegister ? (
            <Animated.View entering={appear} exiting={vanish} layout={flow}>
              <Input
                label=""
                accessibilityLabel="Имя"
                placeholder="Имя"
                value={values.name}
                onChangeText={(name) => patch({ name })}
                error={fieldErrors.name}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={focusNext}
              />
            </Animated.View>
          ) : null}

          <Animated.View layout={flow}>
            <PhoneInput
              label=""
              accessibilityLabel="Телефон"
              value={values.phone}
              onChangeText={onPhoneChange}
              error={fieldErrors.phone}
            />
          </Animated.View>

          <Animated.View layout={flow}>
            <PasswordInput
              label=""
              accessibilityLabel="Пароль"
              placeholder={isRegister ? "Пароль от 6 символов" : "Пароль"}
              value={values.password}
              onChangeText={(password) => patch({ password })}
              error={fieldErrors.password}
              autoComplete={isRegister ? "new-password" : "current-password"}
              textContentType={isRegister ? "newPassword" : "password"}
              passwordRules={isRegister ? "minlength: 6;" : undefined}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          </Animated.View>
        </View>

        <Animated.View layout={flow} style={styles.actions}>
          {formError ? <FormMessage error={formError} onSwitchToLogin={goToLogin} /> : null}

          <Button
            title={action}
            size="lg"
            fullWidth
            loading={pending}
            onPress={submit}
            accessibilityHint={
              isRegister ? "Создать профиль по номеру телефона" : "Войти по номеру телефона и паролю"
            }
          />

          {isRegister ? (
            <LegalNote action={action} />
          ) : supportPhone ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Не помните пароль?"
              accessibilityHint={`Позвонить в магазин: ${supportPhone}`}
              haptic="none"
              onPress={callSupport}
              style={styles.textAction}
            >
              <AppText variant="footnote" color="brand" weight="600">
                Не помните пароль?
              </AppText>
            </PressableScale>
          ) : null}
        </Animated.View>

        {/* Подвал прижат к низу листа: на пустом месте между формой и краем он
            выглядел бы потерянным, а у самого края читается как второстепенный. */}
        <View style={styles.spacer} />

        <Animated.View layout={flow} style={styles.footer}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={
              isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"
            }
            haptic="none"
            onPress={toggleMode}
            style={styles.textAction}
          >
            <AppText variant="subhead" color="muted">
              {isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}
              <AppText variant="subhead" color="brand" weight="600">
                {isRegister ? "Войти" : "Зарегистрироваться"}
              </AppText>
            </AppText>
          </PressableScale>

          {/* Каталогом и заказом можно пользоваться без профиля — выход обязан быть на виду */}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Продолжить без входа"
            haptic="none"
            onPress={close}
            style={styles.textAction}
          >
            <AppText variant="subhead" color="faint">
              Продолжить без входа
            </AppText>
          </PressableScale>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // flexGrow — чтобы распорка ниже могла прижать подвал к краю листа
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: MIN_TAP_SIZE },
  title: { flex: 1 },
  form: { gap: spacing.md, marginTop: spacing.xl },
  actions: { gap: spacing.base, marginTop: spacing.xl },
  spacer: { flex: 1, minHeight: spacing.xl },
  footer: { alignItems: "center", marginTop: spacing.lg },
  textAction: { minHeight: MIN_TAP_SIZE, justifyContent: "center", paddingHorizontal: spacing.sm },
});
