import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { useCartCount } from "@/store/cart";
import { useColors, vysota } from "@/theme";
import { appFont } from "@/theme/fonts";

/** Нативная панель вкладок сохраняет системные материалы и развёрнутый режим. */
export default function TabsLayout() {
  const colors = useColors();
  const cartCount = useCartCount();

  return (
    <NativeTabs
      minimizeBehavior="never"
      tintColor={colors.brand}
      iconColor={colors.tabInactive}
      labelStyle={{
        color: colors.tabInactive,
        fontFamily: appFont("500"),
        selected: { color: colors.brand, fontFamily: appFont("600") },
      }}
      badgeBackgroundColor={vysota.grass}
      badgeTextColor={vysota.ink}
    >
      {/* Герой сам учитывает iOS inset; Android сохраняет нативный SafeAreaView. */}
      <NativeTabs.Trigger name="(home)" disableAutomaticContentInsets={Platform.OS === "ios"}>
        <NativeTabs.Trigger.Label>Главная</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="catalog">
        <NativeTabs.Trigger.Label>Каталог</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "rectangle.grid.2x2", selected: "rectangle.grid.2x2.fill" }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tracker">
        <NativeTabs.Trigger.Label>Приём</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "pill", selected: "pill.fill" }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Корзина</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bag", selected: "bag.fill" }} />
        {cartCount > 0 ? <NativeTabs.Trigger.Badge>{String(cartCount)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Кабинет</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
