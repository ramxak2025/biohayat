import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { AppText } from "@/components/ui";
import { spacing, useColors } from "@/theme";

/** Нейтральная заглушка на время загрузки обложки. */
const COVER_BLURHASH = "L6Pj0^i_.AyE_3t7t7R**0o#DgR4";

export interface ArticleHeroProps {
  uri: string | null;
  title: string;
  height: number;
  scrollY: SharedValue<number>;
  /** При Reduce Motion параллакс выключаем — картинка стоит на месте. */
  reducedMotion: boolean;
}

/**
 * Обложка статьи с параллаксом: при прокрутке уезжает медленнее текста, при
 * оттягивании вниз — увеличивается (нативное поведение iOS-героев).
 */
export function ArticleHero({ uri, title, height, scrollY, reducedMotion }: ArticleHeroProps) {
  const colors = useColors();

  const parallax = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-height, 0, height],
            [-height / 2, 0, height * 0.35],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(scrollY.value, [-height, 0], [1.6, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={[styles.wrap, { height, backgroundColor: colors.brandSoft }]}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={280}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: COVER_BLURHASH }}
            placeholderContentFit="cover"
            accessibilityIgnoresInvertColors
            alt={title}
          />
        ) : (
          // без обложки — брендовая подложка вместо пустого серого прямоугольника
          <LinearGradient
            colors={[colors.brandSoft, colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.fallback]}
          >
            <SymbolView name="newspaper.fill" size={34} tintColor={colors.brand} weight="regular" />
            <AppText variant="caption2" color="brand" weight="700">
              ХАЯТ · ПОЛЕЗНОЕ
            </AppText>
          </LinearGradient>
        )}
      </Animated.View>

      {/* мягкий стык обложки с текстом — иначе край фотографии режет полосой */}
      <LinearGradient
        colors={["transparent", colors.background]}
        style={styles.fade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden" },
  fallback: { alignItems: "center", justifyContent: "center", gap: spacing.sm },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 72 },
});
