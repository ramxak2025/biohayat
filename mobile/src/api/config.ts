/**
 * Адрес бэкенда. Задаётся через EXPO_PUBLIC_API_URL в eas.json / .env.local,
 * По умолчанию все сборки используют общий API сайта; локальный сервер
 * выбирается явно через переменную окружения.
 */
const DEFAULT_API = "https://new.biohayat.ru/api/v2";

export const API_BASE = (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API).replace(/\/+$/, "");

/** Origin бэкенда — база для относительных ссылок на изображения. */
export const API_ORIGIN = new URL(API_BASE).origin;

/** Таймаут одного запроса. Мобильная сеть: лучше упасть и показать ретрай. */
export const REQUEST_TIMEOUT_MS = 15_000;
