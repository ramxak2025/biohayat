import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

/**
 * Публичный адрес сайта. Берём константой, а не из API_ORIGIN: в дев-сборке
 * бэкенд — это localhost, а ссылкой из «Поделиться» человек должен попасть
 * на живой сайт.
 */
export const SITE_ORIGIN = "https://new.biohayat.ru";

export function articleUrl(slug: string): string {
  return `${SITE_ORIGIN}/articles/${encodeURIComponent(slug)}`;
}

/** Схемы, которые разрешено открывать из контента статьи. */
const SAFE_SCHEME = /^(https?:|mailto:|tel:)/i;

/**
 * Белый список схем для ссылок из админки. `javascript:`, `data:` и прочее
 * молча выбрасываем — такая ссылка отрисуется обычным текстом.
 */
export function safeHref(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().replace(/&amp;/gi, "&");
  if (!value) return undefined;
  if (SAFE_SCHEME.test(value)) return value;
  // относительные ссылки админки («/catalog», «/articles/x») ведут на сайт
  if (value.startsWith("/")) return `${SITE_ORIGIN}${value}`;
  return undefined;
}

/**
 * Открыть ссылку из статьи. http(s) — в системном Safari-контроллере поверх
 * приложения (HIG: не выкидывать человека из приложения), tel/mailto — системным
 * обработчиком.
 */
export async function openExternalLink(href: string, tint?: string): Promise<void> {
  try {
    if (/^https?:/i.test(href)) {
      await WebBrowser.openBrowserAsync(href, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: tint,
        dismissButtonStyle: "close",
      });
      return;
    }
    await Linking.openURL(href);
  } catch {
    // нерабочая ссылка из админки — не повод падать экрану
  }
}
