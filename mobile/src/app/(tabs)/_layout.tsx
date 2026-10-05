import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useCartCount } from "@/store/cart";
import { useColors } from "@/theme";

/**
 * Нативный таб-бар iOS 26: настоящий UITabBar, поэтому Liquid Glass, размытие,
 * сворачивание при скролле и хаптика — системные, а не нарисованные.
 *
 * Цвета задаём только для содержимого (иконки, подписи, бейдж). backgroundColor
 * НЕ трогаем: сплошной фон отключает стекло и панель становится плоской.
 *
 * Цвет невыбранных элементов задаём явно нейтральным серым (colors.tabInactive):
 * системный по умолчанию поверх стекла читается почти чёрным и «жирным», а наш
 * textFaint — тёплый оливковый и выглядит грязно. Символы выбраны из лёгких
 * начертаний (pill вместо pills, person вместо person.crop.circle,
 * rectangle.grid вместо square.grid) — плотные глифы в таб-баре тяжелят экран.
 */
export default function TabsLayout() {
  const colors = useColors();
  const cartCount = useCartCount();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={colors.brand}
      iconColor={colors.tabInactive}
      labelStyle={{ color: colors.tabInactive, selected: { color: colors.brand } }}
      badgeBackgroundColor={colors.brand}
      badgeTextColor={colors.textOnBrand}
    >
      <NativeTabs.Trigger name="(home)">
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
