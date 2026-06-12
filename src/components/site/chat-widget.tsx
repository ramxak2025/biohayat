"use client";

import { useEffect } from "react";

/**
 * Виджет онлайн-чата Битрикс24 (Открытые линии).
 * В админке (Настройки → Битрикс24) вставляется код виджета — здесь он
 * безопасно исполняется (script-теги из innerHTML сами не запускаются,
 * поэтому используем createContextualFragment).
 *
 * БЕЗОПАСНОСТЬ: `code` — доверенный произвольный JS-виджет, его НЕЛЬЗЯ
 * санитизировать (сломается скрипт). Источник доверия — RBAC: значение
 * задаётся только из настроек, доступных ADMIN (requireAdmin в
 * src/app/admin/(panel)/settings/actions.ts). Не передавать сюда
 * пользовательский ввод.
 */
export function ChatWidget({ code }: { code?: string | null }) {
  useEffect(() => {
    if (!code) return;
    const id = "b24-chat-widget";
    if (document.getElementById(id)) return;
    const container = document.createElement("div");
    container.id = id;
    try {
      const fragment = document.createRange().createContextualFragment(code);
      container.appendChild(fragment);
      document.body.appendChild(container);
    } catch {
      /* некорректный код виджета — игнорируем */
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [code]);

  return null;
}
