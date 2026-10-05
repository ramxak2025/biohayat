import { useCallback, useState } from "react";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";

import { qk } from "@/api/keys";
import { mergeGuestFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/store/auth";

import { mapAuthError, validateAuth } from "./errors";
import type { AuthFieldErrors, AuthFormError, AuthMode, AuthValues } from "./types";

const EMPTY: AuthValues = { name: "", phone: "", password: "" };

/** Запросы, привязанные к покупателю: после входа их кэш относится к «прошлой жизни». */
const userScopedKeys = () => [qk.me, qk.favorites, qk.orders, qk.intakePlans, qk.consultations];

export interface AuthFormApi {
  values: AuthValues;
  fieldErrors: AuthFieldErrors;
  formError: AuthFormError | null;
  pending: boolean;
  /** Правка любого поля: чистит его ошибку и общее сообщение. */
  patch: (next: Partial<AuthValues>) => void;
  clearErrors: () => void;
  submit: () => void;
}

/**
 * Состояние формы входа/регистрации. Значения общие для обоих режимов — телефон
 * и пароль не сбрасываются при переключении, это сэкономленный ввод, а не баг.
 */
export function useAuthForm(mode: AuthMode, onSuccess: () => void): AuthFormApi {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const queryClient = useQueryClient();

  const [values, setValues] = useState<AuthValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<AuthFormError | null>(null);
  const [pending, setPending] = useState(false);

  const patch = useCallback((next: Partial<AuthValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
    setFieldErrors((prev) => {
      const touched = Object.keys(next) as (keyof AuthValues)[];
      if (!touched.some((key) => prev[key])) return prev;
      const rest = { ...prev };
      for (const key of touched) delete rest[key];
      return rest;
    });
    setFormError((prev) => (prev ? null : prev));
  }, []);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const submit = useCallback(() => {
    // защита от двойной отправки: /auth/* не идемпотентен и не имеет rate-limit
    if (pending) return;

    const errors = validateAuth(mode, values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    clearErrors();
    setPending(true);

    void (async () => {
      try {
        if (mode === "login") {
          await login({ phone: values.phone, password: values.password });
        } else {
          await register({
            name: values.name.trim(),
            phone: values.phone,
            password: values.password,
            // Согласие 152-ФЗ даётся нажатием кнопки — текст об этом стоит рядом
            // с ней (LegalNote). Сервер ждёт ровно `true` (`z.literal(true)`).
            consent: true,
          });
        }
      } catch (error) {
        const mapped = mapAuthError(error, mode);
        setFormError(mapped);
        if (mapped.field) setFieldErrors({ [mapped.field]: mapped.message });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPending(false);
        return;
      }

      // Вход уже состоялся: что бы ни случилось дальше, это не повод показывать
      // ошибку формы. Избранное гостя переносим ДО закрытия листа, иначе экран
      // «Избранное» откроется пустым.
      try {
        await mergeGuestFavorites();
        await Promise.all(
          userScopedKeys().map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      } catch {
        // не критично: список подтянется при следующем открытии экрана
      }

      setPending(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    })();
  }, [pending, mode, values, login, register, queryClient, onSuccess, clearErrors]);

  return { values, fieldErrors, formError, pending, patch, clearErrors, submit };
}
