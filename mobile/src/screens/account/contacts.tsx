import { Stack } from "expo-router";

import { ContactsCard } from "@/components/account/contacts-card";
import { ErrorState, Screen, useDetailScreenOptions } from "@/components/ui";
import { useSettings } from "@/hooks/use-settings";

/** Public store contacts: available without signing in, including direct links. */
export function ContactsScreen() {
  const options = useDetailScreenOptions();
  const settings = useSettings();
  return <>
    <Stack.Screen options={{ ...options, title: "Контакты" }} />
    <Screen scroll onRefresh={() => void settings.refetch()} refreshing={settings.isRefetching}>
      {settings.isError ? <ErrorState error={settings.error} title="Не удалось загрузить контакты" onRetry={() => void settings.refetch()} compact /> : null}
      {settings.data || !settings.isError ? <ContactsCard settings={settings.data} /> : null}
    </Screen>
  </>;
}
