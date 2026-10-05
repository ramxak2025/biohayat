/** Типы формы входа/регистрации. Вынесены отдельно, чтобы не было цикла импортов. */

export type AuthMode = "login" | "register";

/**
 * Полей ровно три. E-mail с экрана убран сознательно: сервер его не требует
 * (`email?` в RegisterBody), а дописать почту можно в профиле — просить её
 * в момент, когда человек хочет просто войти, значит терять этого человека.
 */
export type AuthField = "name" | "phone" | "password";

export interface AuthValues {
  name: string;
  /** Нормализованный "+7XXXXXXXXXX" — ровно в таком виде его ждёт API. */
  phone: string;
  password: string;
}

export type AuthFieldErrors = Partial<Record<AuthField, string>>;

/**
 * Тон общей ошибки. "info" — это не авария, а объяснение: например, на старой
 * сборке сервера маршрутов /auth нет вовсе, и красная плашка тут врёт.
 */
export type AuthMessageTone = "error" | "info";

/** Ошибка всей отправки: одна компактная строка над кнопкой. */
export interface AuthFormError {
  message: string;
  tone: AuthMessageTone;
  /** Какое поле подсветить, если это удалось понять. Тогда строку над кнопкой не рисуем. */
  field?: AuthField;
  /** 409: номер занят — под кнопкой показываем ссылку «Войти с этим номером». */
  offerLogin?: boolean;
}
