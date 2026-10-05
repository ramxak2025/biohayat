import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ColorScheme } from "./tokens";

export * from "./tokens";
export * from "./motion";

export interface Theme {
  colors: ColorScheme;
  dark: boolean;
}

export const lightTheme: Theme = { colors: lightColors, dark: false };
export const darkTheme: Theme = { colors: darkColors, dark: true };

/** Тема по системной настройке. Приложение не даёт ручного переключателя: iOS-путь — следовать системе. */
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

/** Цвета текущей темы — короткая форма, самый частый импорт. */
export function useColors(): ColorScheme {
  return useTheme().colors;
}
