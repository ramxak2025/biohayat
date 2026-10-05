import { StyleSheet, type StyleProp, type TextStyle } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { AppText } from "@/components/ui";
import { useColors } from "@/theme";

/** Политика конфиденциальности — обязательная ссылка рядом с согласием по 152-ФЗ. */
const PRIVACY_URL = "https://biohayat.ru/privacy-policy";

export interface ConsentNoteProps {
  /** Подпись кнопки, ради честности повторяем её дословно. */
  actionLabel: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Согласие на обработку персональных данных строкой у кнопки — так это сделано
 * почти во всех знакомых покупателю магазинах, и так меньше шагов: отдельная
 * галочка была ещё одним препятствием перед отправкой заявки.
 *
 * На сервер по-прежнему уходит `consent: true` — без него `POST /orders` заказ
 * не примет. Формулировка обязана называть действие, которое даёт согласие,
 * поэтому подпись кнопки подставляется, а не пишется отдельно.
 */
export function ConsentNote({ actionLabel, style }: ConsentNoteProps) {
  const colors = useColors();

  const openPolicy = () => {
    void WebBrowser.openBrowserAsync(PRIVACY_URL);
  };

  return (
    <AppText variant="caption" color="faint" style={style}>
      Нажимая «{actionLabel}», вы соглашаетесь на обработку персональных данных (152-ФЗ) и
      принимаете{" "}
      <AppText
        variant="caption"
        weight="600"
        onPress={openPolicy}
        accessibilityRole="link"
        accessibilityLabel="Политика конфиденциальности"
        accessibilityHint="Откроется в браузере"
        style={[styles.link, { color: colors.brandText }]}
      >
        Политику конфиденциальности
      </AppText>
      .
    </AppText>
  );
}

const styles = StyleSheet.create({
  link: { textDecorationLine: "underline" },
});
