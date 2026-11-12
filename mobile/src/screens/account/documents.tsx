import { Stack } from "expo-router";

import { LEGAL_URL, useOpenBrowser } from "@/components/account/links";
import { MenuGroup } from "@/components/account/menu-group";
import { MenuRow } from "@/components/account/menu-row";
import { ErrorState, Screen, useDetailScreenOptions } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";

/** Public documents keep using the shared canonical URLs and actual legal details. */
export function DocumentsScreen() {
  const options = useDetailScreenOptions();
  const openBrowser = useOpenBrowser();
  const settings = useSettings();
  const legal = settings.data?.legal;
  const copyright = [
    `© ${new Date().getFullYear()} ${legal?.name ?? "ХАЯТ"}`,
    legal?.inn ? `ИНН ${legal.inn}` : null,
    legal?.ogrn ? `ОГРН ${legal.ogrn}` : null,
    legal?.address,
  ].filter(Boolean).join(" · ");
  return <>
    <Stack.Screen options={{ ...options, title: "Документы" }} />
    <Screen scroll onRefresh={() => void settings.refetch()} refreshing={settings.isRefetching}>
      <MenuGroup footer={copyright}>
        <MenuRow icon={{ ios: "doc.plaintext", android: "description", web: "description" }} tone="neutral" title="Публичная оферта" onPress={() => void openBrowser(LEGAL_URL.offer)} />
        <MenuRow icon={{ ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" }} tone="neutral" title="Политика конфиденциальности" onPress={() => void openBrowser(LEGAL_URL.privacy)} />
        <MenuRow icon={{ ios: "checkmark.shield", android: "verified_user", web: "verified_user" }} tone="neutral" title="Согласие на обработку данных" onPress={() => void openBrowser(LEGAL_URL.consent)} />
        <MenuRow icon={{ ios: "box.truck", android: "local_shipping", web: "local_shipping" }} tone="neutral" title="Доставка и оплата" onPress={() => void openBrowser(LEGAL_URL.delivery)} />
        <MenuRow icon={{ ios: "photo", android: "image", web: "image" }} tone="neutral" title="Авторы фотографий" onPress={() => void openBrowser(LEGAL_URL.photoCredits)} />
      </MenuGroup>
      {settings.isError ? <ErrorState error={settings.error} title="Не удалось обновить реквизиты" onRetry={() => void settings.refetch()} compact /> : null}
    </Screen>
  </>;
}
