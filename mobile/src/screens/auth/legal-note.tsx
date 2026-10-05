import { StyleSheet, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { LEGAL_URL } from "@/components/account";
import { AppText, PressableScale } from "@/components/ui";
import { MIN_TAP_SIZE, spacing, useColors } from "@/theme";

export interface LegalNoteProps {
  /** Подпись кнопки: текст согласия обязан называть её дословно. */
  action: string;
}

/**
 * Согласие 152-ФЗ без чекбокса.
 *
 * Юридически значимым действием считается нажатие кнопки, а строка рядом с ней
 * говорит, на что человек соглашается, — так оформляют согласие Apple, банки и
 * маркетплейсы. Чекбокс ничего не добавляет к доказуемости, зато добавляет шаг
 * и ошибку «вы не поставили галочку» в самый неподходящий момент.
 * В запрос на регистрацию по-прежнему уходит `consent: true`.
 */
export function LegalNote({ action }: LegalNoteProps) {
  const colors = useColors();

  // Документы открываем системным браузером поверх листа, а не вторым листом
  // (HIG: одновременно показываем только один лист).
  const open = (url: string) => {
    void WebBrowser.openBrowserAsync(url, { controlsColor: colors.brand });
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="footnote" color="faint" align="center">
        {`Нажимая «${action}», вы соглашаетесь на обработку персональных данных.`}
      </AppText>

      <View style={styles.links}>
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel="Открыть политику конфиденциальности"
          haptic="none"
          onPress={() => open(LEGAL_URL.privacy)}
          style={styles.link}
        >
          <AppText variant="footnote" color="brand" weight="600">
            Политика конфиденциальности
          </AppText>
        </PressableScale>

        <AppText variant="footnote" color="faint" accessibilityElementsHidden>
          ·
        </AppText>

        <PressableScale
          accessibilityRole="link"
          accessibilityLabel="Открыть оферту"
          haptic="none"
          onPress={() => open(LEGAL_URL.offer)}
          style={styles.link}
        >
          <AppText variant="footnote" color="brand" weight="600">
            Оферта
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  links: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  // 44 pt на ссылку: мелкий текст мелкой зоной нажатия быть не обязан
  link: { minHeight: MIN_TAP_SIZE, justifyContent: "center" },
});
