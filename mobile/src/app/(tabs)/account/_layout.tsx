import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/components/ui/stack-options";

/** Direct public contacts/documents links retain a native Back destination. */
export const unstable_settings = { initialRouteName: "index" };

export default function Layout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
