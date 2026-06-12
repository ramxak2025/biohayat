"use client";

import { useEffect } from "react";

const KEY = "hayat_ref";

/**
 * Перехватывает реферальный код из ссылки (?ref=КОД) при заходе на любую
 * страницу и сохраняет в localStorage, чтобы привязать друга позже —
 * при регистрации (скрытое поле в форме входа/регистрации).
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9]{4,20}$/.test(ref)) {
        localStorage.setItem(KEY, ref.toUpperCase());
      }
    } catch {
      // игнорируем
    }
  }, []);
  return null;
}

/** Прочитать сохранённый реферальный код (для скрытого поля формы). */
export function getStoredReferral(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}
