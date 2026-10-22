/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из обработчика/эффекта — штатный и единственный способ анимировать на UI-потоке.
 * Правило React Compiler про них не знает и даёт ложное срабатывание; в рендере
 * `.value` мы не читаем, поэтому компилятору эта мутация не мешает. */
import { useEffect, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { normalizePhoneSubscriberInput, phoneSubscriberDisplay, PHONE_MASK } from "@/lib/phone-input";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, typography, useColors } from "@/theme";

import { AppText } from "./app-text";
import { IconButton } from "./icon-button";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  /** Текст ошибки. Появление объявляется VoiceOver. */
  error?: string | null;
  hint?: string;
  leftIcon?: SFSymbol;
  leftSlot?: ReactNode;
  /** Произвольный узел справа внутри поля (кнопка «показать пароль» и т.п.). */
  rightSlot?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  leftSlot,
  rightSlot,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}: InputProps) {
  const colors = useColors();
  const focus = useSharedValue(0);

  useEffect(() => {
    // ошибку нужно не только показать, но и произнести — иначе поле «молча» не проходит
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const idle = error ? colors.danger : colors.line;
  const active = error ? colors.danger : colors.brand;

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [idle, active]),
  }));

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="footnote" color="muted" weight="600" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <Animated.View
        style={[
          styles.field,
          { backgroundColor: editable ? colors.surface : colors.surfaceSunken },
          borderStyle,
        ]}
      >
        {leftSlot}
        {leftIcon ? <SymbolView name={leftIcon} size={17} tintColor={colors.textFaint} /> : null}
        <TextInput
          editable={editable}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.brand}
          // системная «очистка» вместо самодельного крестика — это iOS-путь
          clearButtonMode={rightSlot ? "never" : "while-editing"}
          accessibilityLabel={label}
          onFocus={(event) => {
            focus.value = withTiming(1, { duration: Duration.fast, easing: Ease.power2Out });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, { duration: Duration.fast, easing: Ease.power2Out });
            onBlur?.(event);
          }}
          style={[styles.input, { color: colors.text }, inputStyle]}
          {...rest}
        />
        {rightSlot}
      </Animated.View>

      {error ? (
        <AppText variant="footnote" color="danger" style={styles.helper} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="footnote" color="faint" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export interface PhoneInputProps extends Omit<InputProps, "value" | "onChangeText" | "keyboardType"> {
  /** Нормализованный номер "+7XXXXXXXXXX" — ровно в таком виде его ждёт API. */
  value: string;
  onChangeText: (normalized: string) => void;
}

/** Fixed country code, editable subscriber digits; never truncates pasted invalid numbers. */
export function PhoneInput({ value, onChangeText, label = "Телефон", ...rest }: PhoneInputProps) {
  return (
    <Input
      label={label}
      leftSlot={!value || value.startsWith("+7") ? <AppText variant="body" accessible={false}>+7</AppText> : undefined}
      value={phoneSubscriberDisplay(value)}
      onChangeText={(raw) => onChangeText(normalizePhoneSubscriberInput(raw))}
      clearButtonMode="never"
      keyboardType="phone-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      placeholder={PHONE_MASK}
      maxLength={64}
      {...rest}
    />
  );
}

export type PasswordInputProps = Omit<InputProps, "secureTextEntry" | "rightSlot">;

/** Пароль с переключателем показа — без него на телефоне не набрать сложный пароль. */
export function PasswordInput({ label = "Пароль", ...rest }: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Input
      label={label}
      secureTextEntry={!revealed}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      rightSlot={
        <IconButton
          name={revealed ? "eye.slash" : "eye"}
          label={revealed ? "Скрыть пароль" : "Показать пароль"}
          size={18}
          haptic="none"
          onPress={() => setRevealed((prev) => !prev)}
          style={styles.reveal}
        />
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs + 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: MIN_TAP_SIZE + 6,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  reveal: { minWidth: MIN_TAP_SIZE - 8, marginRight: -spacing.sm },
  helper: { marginTop: spacing.xs + 2, marginLeft: spacing.xs },
});
