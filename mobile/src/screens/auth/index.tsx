import { useCallback, useState } from "react";
import { Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
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
  Input,
  PasswordInput,
  PhoneInput,
  PressableScale,
} from "@/components/ui";
import { SheetHeader } from "@/components/ui/sheet-header";
import { useSettings } from "@/hooks/use-settings";
import { isValidPhone } from "@/lib/format";
import { Duration, Ease, MIN_TAP_SIZE, spacing, useColors } from "@/theme";

import { FormMessage } from "./form-message";
import { LegalNote } from "./legal-note";
import { useAuthForm } from "./use-auth-form";
import { useAuthDismiss } from "./use-auth-dismiss";
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
  const close = useAuthDismiss();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const [mode, setMode] = useState<AuthMode>("login");
  const [headerHeight, setHeaderHeight] = useState(72);
  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setHeaderHeight((previous) => previous === next ? previous : next);
  }, []);
  const isRegister = mode === "register";

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
    <View collapsable={false} style={[styles.root, { backgroundColor: colors.surface }]}>
      <KeyboardAwareScrollView
        bottomOffset={spacing["2xl"]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + spacing.md, paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <AppText variant="callout" color="muted">
          {isRegister ? "Заказы, избранное, курсы приёма и консультации — в одном месте." : "Войти по номеру телефона и паролю"}
        </AppText>

        {/* Видимые подписи сохраняют смысл поля после ввода; значения и валидация — в useAuthForm. */}
        <View style={styles.form} collapsable={false}>
          {isRegister ? (
            <Animated.View entering={appear} exiting={vanish} layout={flow}>
              <Input
                label="Имя"
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
              label="Телефон"
              accessibilityLabel="Телефон"
              value={values.phone}
              onChangeText={onPhoneChange}
              error={fieldErrors.phone}
            />
          </Animated.View>

          <Animated.View layout={flow}>
            <PasswordInput
              label="Пароль"
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
              <AppText variant="footnote" style={{ color: colors.brandText }} weight="600">
                Не помните пароль?
              </AppText>
            </PressableScale>
          ) : null}
        </Animated.View>

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
              <AppText variant="subhead" style={{ color: colors.brandText }} weight="600">
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
      <View style={styles.headerDock}>
        <SheetHeader
          title={isRegister ? "Регистрация" : "Вход в ХАЯТ"}
          onClose={close}
          onLayout={onHeaderLayout}
          leading={<Image source={require("../../../assets/brand/logo-mark.png")} style={styles.brandMark} contentFit="contain" accessible={false} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.base },
  headerDock: { position: "absolute", top: 0, left: 0, right: 0 },
  brandMark: { width: 36, height: 36, flexShrink: 0 },
  form: { gap: spacing.base, marginTop: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.lg },
  footer: { alignItems: "center", marginTop: spacing.base },
  textAction: { minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, justifyContent: "center", paddingHorizontal: spacing.sm },
});
