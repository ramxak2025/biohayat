import { Platform, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import * as WebBrowser from "expo-web-browser";

import { LEGAL_URL } from "@/components/account";
import { AppText, PressableScale } from "@/components/ui";
import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

interface LegalNoteProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
}

/** A separate, initially unchecked choice. Reading a policy never checks consent. */
export function LegalNote({ checked, onChange, error, disabled }: LegalNoteProps) {
  const colors = useColors();
  const open = (url: string) => { void WebBrowser.openBrowserAsync(url, { controlsColor: colors.brand }); };
  return (
    <View style={styles.wrap}>
      <PressableScale
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel="Даю согласие на обработку персональных данных для регистрации и работы личного кабинета"
        disabled={disabled}
        onPress={() => onChange(!checked)}
        haptic="light"
        style={styles.choice}
      >
        <View style={[styles.box, { backgroundColor: checked ? colors.actionFill : colors.surface, borderColor: error ? colors.danger : checked ? colors.actionFill : colors.textFaint }]}>
          {checked ? <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={14} tintColor={colors.textOnBrand} /> : null}
        </View>
        <AppText variant="footnote" color="muted" style={styles.copy}>
          Даю согласие на обработку персональных данных для регистрации и работы личного кабинета.
        </AppText>
      </PressableScale>
      {error ? <AppText variant="footnote" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
      <PressableScale accessibilityRole="link" onPress={() => open(LEGAL_URL.consent)} haptic="none" style={styles.link}>
        <AppText variant="footnote" color="brand" weight="600">Прочитать согласие</AppText>
      </PressableScale>
      <PressableScale accessibilityRole="link" onPress={() => open(LEGAL_URL.privacy)} haptic="none" style={styles.link}>
        <AppText variant="footnote" color="brand">Политика обработки данных</AppText>
      </PressableScale>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  choice: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, paddingVertical: spacing.sm },
  box: { width: 24, height: 24, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  link: { minHeight: Platform.OS === "android" ? 48 : MIN_TAP_SIZE, justifyContent: "center", alignSelf: "flex-start" },
});
