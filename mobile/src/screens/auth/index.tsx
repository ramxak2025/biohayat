import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Stack } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView, KeyboardController } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { sheetScreenOptions } from "@/components/ui/sheet-header";
import { useSettings } from "@/hooks/use-settings";
import { isValidPhone } from "@/lib/format";
import { authSheetContentBottomInset } from "@/lib/auth-sheet-layout";
import { MIN_TAP_SIZE, spacing, useColors } from "@/theme";

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
  const { height, fontScale } = useWindowDimensions();

  const [mode, setMode] = useState<AuthMode>("login");
  const [contentHeight, setContentHeight] = useState(0);
  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.ceil(event.nativeEvent.layout.height);
    setContentHeight((previous) => previous === next ? previous : next);
  }, []);
  const sheetOptions = useMemo(() => sheetScreenOptions(height, fontScale, colors.surface, contentHeight, insets.top), [height, fontScale, colors.surface, contentHeight, insets.top]);
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

  const phoneComplete = useRef(isValidPhone(values.phone));
  const onPhoneChange = useCallback(
    (phone: string) => {
      patch({ phone });
      // у телефонной клавиатуры iOS нет Return — переводим фокус сами, когда номер собран
      const complete = isValidPhone(phone);
      if (!phoneComplete.current && complete) KeyboardController.setFocusTo("next");
      phoneComplete.current = complete;
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

  return (
    <View collapsable={false} style={[styles.root, { backgroundColor: colors.surface }]}>
      <Stack.Screen options={sheetOptions} />
      <KeyboardAwareScrollView
        bottomOffset={spacing["2xl"]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View onLayout={onContentLayout} style={[styles.content, { paddingBottom: authSheetContentBottomInset(Platform.OS, Platform.Version, insets.bottom, sheetOptions.sheetAllowedDetents?.[0] === 1) + spacing.lg }]}>
          <View style={styles.intro}>
            <Image source={require("../../../assets/brand/logo-mark.png")} style={styles.brandMark} contentFit="contain" accessible={false} />
            <AppText variant="title2" align="center" accessibilityRole="header">{isRegister ? "Регистрация" : "Вход в ХАЯТ"}</AppText>
            <AppText variant="callout" color="muted" align="center">
              {isRegister ? "Заказы, избранное, курсы приёма и консультации — в одном месте." : "Войти по номеру телефона и паролю"}
            </AppText>
          </View>

        {/* Видимые подписи сохраняют смысл поля после ввода; значения и валидация — в useAuthForm. */}
        <View style={styles.form} collapsable={false}>
          {isRegister ? (
            <View>
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
            </View>
          ) : null}

          <View>
            <PhoneInput
              label="Телефон"
              accessibilityLabel="Телефон"
              value={values.phone}
              onChangeText={onPhoneChange}
              error={fieldErrors.phone}
            />
          </View>

          <View>
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
          </View>
        </View>

        <View style={styles.actions}>
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
        </View>

        <View style={styles.footer}>
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
        </View>
        </View>
      </KeyboardAwareScrollView>
      <View style={styles.closeDock}>
        <IconButton name={{ ios: "xmark", android: "close", web: "close" }} label="Закрыть" variant="soft" onPress={close} style={styles.close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing["2xl"] },
  intro: { alignItems: "center", gap: spacing.md },
  closeDock: { position: "absolute", top: spacing.sm, right: spacing.sm },
  close: { minWidth: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE },
  brandMark: { width: 48, height: 48, flexShrink: 0 },
  form: { gap: spacing.xl, marginTop: spacing.xl },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  footer: { alignItems: "center", marginTop: spacing.base },
  textAction: { minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, justifyContent: "center", paddingHorizontal: spacing.sm },
});
