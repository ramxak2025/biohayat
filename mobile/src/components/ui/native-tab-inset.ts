/**
 * Expo Router 57: iOS NativeTabs supplies a tab-local SafeAreaProvider, whose
 * bottom inset includes UIKit's tab bar. Android already pads the whole tab
 * screen with RN Screens SafeAreaView. Outside tabs only the device inset applies.
 */
export function nativeTabBottomInset(platform: string, safeBottom: number, withTabBar = true): number {
  return withTabBar && platform === "android" ? 0 : safeBottom;
}
