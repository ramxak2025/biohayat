import { isLoaded } from "expo-font";
import type { TextStyle } from "react-native";

const fonts = {
  Golos400: require("../../assets/vysota/golos-text-400.ttf"),
  Golos500: require("../../assets/vysota/golos-text-500.ttf"),
  Golos600: require("../../assets/vysota/golos-text-600.ttf"),
  Golos700: require("../../assets/vysota/golos-text-700.ttf"),
  Unbounded500: require("../../assets/vysota/unbounded-500.ttf"),
  Unbounded600: require("../../assets/vysota/unbounded-600.ttf"),
} as const;

export const appFonts = fonts;

export function appFont(weight: TextStyle["fontWeight"] = "400", display = false) {
  const numeric = weight === "normal" ? 400 : weight === "bold" ? 700 : Number(weight);
  const family = display
    ? numeric >= 600 ? "Unbounded600" : "Unbounded500"
    : numeric >= 700 ? "Golos700" : numeric >= 600 ? "Golos600" : numeric >= 500 ? "Golos500" : "Golos400";
  return isLoaded(family) ? family : undefined;
}
