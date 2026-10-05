import { Share } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Публичный адрес сайта. Константа, а не API_ORIGIN: в дев-сборке бэкенд — это
 * localhost, а по ссылке из «Поделиться» человек должен попасть на живой сайт.
 * Такая же константа есть у экрана статьи — при появлении третьей её стоит
 * поднять в общий конфиг.
 */
export const SITE_ORIGIN = "https://new.biohayat.ru";

/** Адрес карточки товара на сайте — маршрут `/product/[slug]`. */
export function productUrl(slug: string): string {
  return `${SITE_ORIGIN}/product/${encodeURIComponent(slug)}`;
}

/**
 * Системный лист «Поделиться». Ссылку отдаём отдельным полем `url` — iOS тогда
 * показывает превью сайта, а не голый текст. Цену в сообщение не кладём: она
 * меняется, а пересланное сообщение — нет.
 */
export async function shareProduct(product: { name: string; slug: string }): Promise<void> {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share(
      { title: product.name, message: product.name, url: productUrl(product.slug) },
      { subject: product.name },
    );
  } catch {
    // отмена листа или недоступный сервис — молча ничего не делаем
  }
}
