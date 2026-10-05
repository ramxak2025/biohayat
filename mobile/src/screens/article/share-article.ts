import { Share } from "react-native";
import * as Haptics from "expo-haptics";

import { articleUrl } from "./links";

/**
 * Системный лист «Поделиться». Ссылку отдаём отдельным полем `url` — iOS тогда
 * показывает превью сайта, а не голый текст.
 */
export async function shareArticle(material: { title: string; slug: string }): Promise<void> {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share(
      { title: material.title, message: material.title, url: articleUrl(material.slug) },
      { subject: material.title },
    );
  } catch {
    // отмена листа или недоступный сервис — молча ничего не делаем
  }
}
