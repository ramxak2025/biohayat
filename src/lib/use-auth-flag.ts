"use client";

import { useSyncExternalStore } from "react";

// Имя должно совпадать с AUTH_FLAG_COOKIE в src/lib/customer-auth.ts.
const AUTH_FLAG_COOKIE = "hayat_auth";

function subscribe(onChange: () => void): () => void {
  // Cookie-события в браузере отсутствуют, поэтому перечитываем флаг при
  // возврате на вкладку/страницу. Кроме того, useSyncExternalStore сверяет
  // снимок при каждом рендере — после login/logout навигация или
  // router.refresh() сами подхватят новое значение.
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function getSnapshot(): boolean {
  return document.cookie
    .split("; ")
    .some((part) => part.startsWith(`${AUTH_FLAG_COOKIE}=`));
}

// На сервере (и в момент гидрации) — нейтральное состояние «не вошёл»:
// HTML одинаков для всех, страницы можно отдавать статически.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Клиентский признак «покупатель вошёл», читаемый из не-httpOnly cookie-флага
 * `hayat_auth` (его ставит/удаляет src/lib/customer-auth.ts вместе с сессией).
 * До гидрации возвращает false — UI показывает нейтральное «Войти».
 */
export function useAuthFlag(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
