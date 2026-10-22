/**
 * Валидация формы и перевод ответов /auth/* в человеческий текст.
 *
 * У /auth/login и /auth/register НЕТ кодов ошибок: сервер отдаёт только HTTP-статус
 * и русскую фразу (проверено на живом бэкенде: 401 «Неверный телефон или пароль»,
 * 409 «Пользователь с таким телефоном уже зарегистрирован»). Поэтому статус —
 * главный источник смысла, а поле, которое надо подсветить, угадываем по тексту.
 *
 * Тексты короткие: они живут под полем, а не в баннере, и второй строки у них нет.
 */
import { ApiError } from "@/api/client";
import { isValidPhone } from "@/lib/format";

import type { AuthFieldErrors, AuthFormError, AuthMode, AuthValues } from "./types";

/** Минимальная длина пароля на сервере (zod `.min(6)`). Больше правил нет. */
export const MIN_PASSWORD_LENGTH = 6;

/** Имя на сервере — `.min(2)`. */
const MIN_NAME_LENGTH = 2;

/** Свой фолбэк apiFetch: если он дошёл до нас — сервер текста не прислал. */
const CLIENT_FALLBACK = "Ошибка сервера";

export function validateAuth(mode: AuthMode, values: AuthValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const isRegister = mode === "register";

  if (isRegister && !values.consent) errors.consent = "Подтвердите согласие на обработку данных";
  if (isRegister && values.name.trim().length < MIN_NAME_LENGTH) errors.name = "Укажите имя";
  if (!isValidPhone(values.phone)) errors.phone = "Номер из 11 цифр";

  if (isRegister) {
    if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = "Минимум 6 символов";
  } else if (!values.password) {
    errors.password = "Введите пароль";
  }

  return errors;
}

function serverText(error: ApiError): string | undefined {
  const text = error.message.trim();
  return text && text !== CLIENT_FALLBACK ? text : undefined;
}

/** Порядок важен: «пароль» ищем после «телефона», иначе «Неверный телефон или пароль» уйдёт не туда. */
const FIELD_BY_TEXT: [RegExp, keyof AuthFieldErrors][] = [
  [/телефон|номер/i, "phone"],
  [/имя/i, "name"],
  [/парол/i, "password"],
];

function guessField(text: string | undefined): keyof AuthFieldErrors | undefined {
  if (!text) return undefined;
  return FIELD_BY_TEXT.find(([re]) => re.test(text))?.[1];
}

export function mapAuthError(error: unknown, mode: AuthMode): AuthFormError {
  const fallback = mode === "login" ? "Не удалось войти" : "Не удалось зарегистрироваться";

  if (!(error instanceof ApiError)) {
    const message = error instanceof Error && error.message ? error.message : fallback;
    return { message, tone: "error" };
  }

  // Старая сборка сервера: маршрутов /auth там нет вовсе. Это не поломка и не вина
  // человека — объясняем спокойно, серым, а не красным.
  if (error.legacyGap) {
    return {
      message: "Вход появится после обновления сервера. Каталог и заказ по телефону уже работают.",
      tone: "info",
    };
  }

  const text = serverText(error);

  if (error.isNetwork) {
    return { message: "Нет соединения. Проверьте интернет и попробуйте ещё раз.", tone: "error" };
  }

  switch (error.status) {
    case 400:
      // zod отдаёт общее «Проверьте данные», ручные проверки — конкретный текст
      return { message: text ?? "Проверьте данные", tone: "error", field: guessField(text) };

    case 401:
      // 401 БЕЗ code — это неверная пара телефон/пароль, а не протухшая сессия
      return { message: "Неверный телефон или пароль", tone: "error", field: "password", credentialsRejected: mode === "login" };

    case 404:
      return { message: text ?? "Вход временно недоступен", tone: "info" };

    case 409:
      return {
        message: "Этот номер уже зарегистрирован",
        tone: "error",
        field: "phone",
        offerLogin: true,
      };

    default:
      if (error.status >= 500) {
        return { message: "Сервер не отвечает. Попробуйте чуть позже.", tone: "error" };
      }
      return { message: text ?? fallback, tone: "error" };
  }
}
