import { Stack } from "expo-router";
import { useStackScreenOptions } from "@/components/ui/stack-options";

export default function Layout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
