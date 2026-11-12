import { useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { normalizePhone } from "@/lib/format";
import { useColors } from "@/theme";

/**
 * Юридические страницы живут на публичном сайте, а не на хосте API: в дев-сборке
 * API смотрит в localhost, и ссылка на оферту оттуда открыла бы пустую страницу.
 */
export const LEGAL_URL = {
  offer: "https://new.biohayat.ru/oferta",
  privacy: "https://new.biohayat.ru/privacy-policy",
  consent: "https://new.biohayat.ru/personal-data-consent",
  delivery: "https://new.biohayat.ru/delivery",
  photoCredits: "https://biohayat.ru/photo-credits",
} as const;

export const telHref = (phone: string): string => `tel:${normalizePhone(phone) || phone}`;
export const mailHref = (email: string): string => `mailto:${email}`;

/** Внешняя ссылка (звонок, почта, WhatsApp, Telegram). Молча не падаем. */
export async function openExternalUrl(url: string, failureHint?: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Не удалось открыть", failureHint ?? "На устройстве нет подходящего приложения.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Не удалось открыть", failureHint ?? "Попробуйте ещё раз чуть позже.");
  }
}

/**
 * Документы открываем во встроенном Safari-контроллере, а не наружу: пользователь
 * остаётся в приложении, а лист закрывается свайпом — так это делают системные приложения.
 */
export function useOpenBrowser(): (url: string) => Promise<void> {
  const colors = useColors();

  return useCallback(
    async (url: string) => {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: colors.brand,
          toolbarColor: colors.background,
          dismissButtonStyle: "close",
          enableBarCollapsing: true,
        });
      } catch {
        Alert.alert("Не удалось открыть страницу", "Проверьте соединение и попробуйте ещё раз.");
      }
    },
    [colors.background, colors.brand],
  );
}
