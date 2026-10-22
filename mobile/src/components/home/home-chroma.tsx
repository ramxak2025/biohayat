import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useIsFocused, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

import { AppText, GlassSurface, PressableScale, useReduceTransparency } from "@/components/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { MIN_TAP_SIZE, palette, radii, spacing, useColors, useTheme } from "@/theme";

import { withAlpha } from "./banner-color";
import { HOME_CHROMA_MIN_HEIGHT } from "@/lib/display-layout";

/**
 * Цвет обводки точки над фотографией. Вычисляется в модуле, а НЕ внутри
 * useAnimatedStyle: withAlpha — обычная JS-функция, и вызов её из worklet'а
 * падает с «Tried to synchronously call a Remote Function». Значение здесь
 * константное, так что считать его каждый кадр незачем.
 */
const DOT_BORDER_OVER_PHOTO = withAlpha(palette.surface, 0.9);

/**
 * Плавающая хрома главной: марка слева, поиск и избранное справа.
 *
 * Системной шапки на этом экране нет — она съедала пол-экрана и «прилипала»
 * плашкой при скролле. Вместо неё хрома лежит ПОВЕРХ героя на уровне safe-area
 * и ничего не двигает в контенте.
 *
 * Переключение состояний — один кроссфейд, без рывка:
 *   • герой на экране     → фона нет, марка и иконки светлые поверх фотографии;
 *   • герой ушёл вверх    → проявляется стеклянная полоса, краски темнеют.
 *
 * Всё считается из одного `scrollY` на UI-потоке: в JS уходит единственный
 * флаг — стиль строки статуса, и только в момент перехода.
 */

export interface HomeChromaProps {
  /** Вертикальное смещение главной (общий с героем shared value). */
  scrollY: SharedValue<number>;
  heroHeight: number;
  barHeight: number;
  onBarHeightChange: (height: number) => void;
}
/** Длина кроссфейда в пунктах скролла — чтобы переход читался, но не тянулся. */
const CROSSFADE = 72;

/**
 * 0 — хрома на фотографии, 1 — хрома на стекле.
 * При Reduce Motion — ступенька: смена мгновенная, без кроссфейда.
 */
function chromaProgress(y: number, switchAt: number, reduced: boolean): number {
  "worklet";
  if (reduced) return y >= switchAt ? 1 : 0;
  return interpolate(y, [switchAt - CROSSFADE, switchAt], [0, 1], Extrapolation.CLAMP);
}

export function HomeChroma({ scrollY, heroHeight, barHeight, onBarHeightChange }: HomeChromaProps) {
  const colors = useColors();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const { ids } = useFavorites();

  // точка, в которой низ героя догнал низ полосы: дальше под хромой уже контент
  const switchAt = Math.max(1, heroHeight - insets.top - barHeight);

  // Строка статуса — единственное, что нельзя анимировать на UI-потоке: это
  // системный вызов. Поэтому в JS уходит один boolean и только в момент смены.
  const [onGlass, setOnGlass] = useState(false);
  useAnimatedReaction(
    () => scrollY.value >= switchAt,
    (next, prev) => {
      if (next !== prev) runOnJS(setOnGlass)(next);
    },
    [switchAt],
  );

  const glassStyle = useAnimatedStyle(() => ({
    opacity: chromaProgress(scrollY.value, switchAt, reduced),
  }));
  const photoStyle = useAnimatedStyle(() => ({
    opacity: 1 - chromaProgress(scrollY.value, switchAt, reduced),
  }));
  const dotStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      chromaProgress(scrollY.value, switchAt, reduced),
      [0, 1],
      [DOT_BORDER_OVER_PHOTO, colors.background],
    ),
  }));

  const favoritesLabel = ids.size > 0 ? `Избранное, ${ids.size}` : "Избранное";

  return (
    <>
      {/* Поверх фотографии строка статуса всегда светлая; на стекле — по теме.
          Только пока экран в фокусе: нативные вкладки держат все экраны
          смонтированными, и без этой проверки главная красила бы строку статуса
          и на каталоге, и на карточке товара. */}
      {focused ? (
        <StatusBar style={onGlass ? (theme.dark ? "light" : "dark") : "light"} animated />
      ) : null}

      <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top }]}>
        {/* Пока хрома лежит на фотографии, читаемость держит скрим — это ручной
            аналог системного scroll edge effect, которого без шапки нет. Цвет
            фотографический, не из темы: белый логотип обязан читаться и на
            снежном кадре, и в светлой теме. Уходит ровно тем же кроссфейдом,
            каким проявляется стекло. */}
        <Animated.View
          style={[styles.scrim, { height: insets.top + barHeight + 28 }, photoStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[withAlpha(palette.ink, 0.5), withAlpha(palette.ink, 0)]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }, glassStyle]} pointerEvents="none">
          <GlassSurface style={StyleSheet.absoluteFill} />
          {/* волосок нужен откату на expo-blur и режиму «уменьшить прозрачность»:
              у настоящего Liquid Glass край рисует сама система */}
          <View style={[styles.hairline, { backgroundColor: colors.line }]} />
        </Animated.View>

        {/* box-none по всей цепочке: плавающая хрома не должна перехватывать
            ни скролл, ни нажатие на герой — только свои кнопки */}
        <View style={styles.bar} pointerEvents="box-none" onLayout={(event) => onBarHeightChange(event.nativeEvent.layout.height)}>
          {/* Две копии марки читались бы VoiceOver дважды — собираем их в один
              элемент и подписываем его сами. */}
          <View
            style={styles.brand}
            pointerEvents="none"
            accessible
            accessibilityRole="header"
            accessibilityLabel="ХАЯТ"
          >
            {/* Оригинальные варианты фирменного знака с сайта; переключаем
                их тем же кроссфейдом, что и цвет надписи. */}
            <Animated.View style={[styles.brandRow, photoStyle]}>
              <Image
                source={require("../../../assets/brand/logo-mark-white.png")}
                style={styles.brandMark}
                contentFit="contain"
                accessible={false}
              />
              <AppText variant="title3" weight="700" style={[styles.word, styles.wordOnPhoto]}>
                ХАЯТ
              </AppText>
            </Animated.View>

            <Animated.View style={[styles.brandRow, styles.brandOverlay, glassStyle]}>
              <Image
                source={require("../../../assets/brand/logo-mark.png")}
                style={styles.brandMark}
                contentFit="contain"
                accessible={false}
              />
              <AppText variant="title3" weight="700" style={[styles.word, { color: colors.text }]}>
                ХАЯТ
              </AppText>
            </Animated.View>
          </View>

          <View style={styles.actions} pointerEvents="box-none">
            <ChromaButton
              name="magnifyingglass"
              label="Поиск по каталогу"
              onPress={() => router.push("/search")}
              scrollY={scrollY}
              switchAt={switchAt}
              reduced={reduced}
            />

            <View pointerEvents="box-none">
              <ChromaButton
                name="heart"
                label={favoritesLabel}
                onPress={() => router.push("/account/favorites")}
                scrollY={scrollY}
                switchAt={switchAt}
                reduced={reduced}
              />
              {ids.size > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.dot, { backgroundColor: colors.brand }, dotStyle]}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

interface ChromaButtonProps {
  name: SFSymbol;
  label: string;
  onPress: () => void;
  scrollY: SharedValue<number>;
  switchAt: number;
  reduced: boolean;
}

/**
 * Кнопка хромы. Поверх фотографии — на стеклянной пилюле, на стеклянной полосе —
 * без неё: стекло на стекле HIG запрещает прямо, поэтому пилюля и полоса
 * кроссфейдятся навстречу друг другу и в один момент видна только одна.
 *
 * Глиф тонкий (`weight="regular"`): жирные чёрные линии клиент просил убрать.
 */
function ChromaButton({ name, label, onPress, scrollY, switchAt, reduced }: ChromaButtonProps) {
  const colors = useColors();
  const flat = useReduceTransparency();

  const photoStyle = useAnimatedStyle(() => ({
    opacity: 1 - chromaProgress(scrollY.value, switchAt, reduced),
  }));
  const glassStyle = useAnimatedStyle(() => ({
    opacity: chromaProgress(scrollY.value, switchAt, reduced),
  }));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.hit}
    >
      <Animated.View style={[styles.pill, photoStyle]} pointerEvents="none">
        {flat ? (
          // без прозрачности стеклянный откат — почти белая заливка, и белый
          // глиф на ней пропал бы; здесь нужна именно тёмная подложка
          <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(palette.ink, 0.5) }]} />
        ) : (
          <GlassSurface style={StyleSheet.absoluteFill} tint={withAlpha(palette.ink, 0.18)} />
        )}
      </Animated.View>

      <Animated.View style={[styles.glyph, photoStyle]} pointerEvents="none">
        <SymbolView name={name} size={20} tintColor={palette.surface} weight="regular" />
      </Animated.View>

      <Animated.View style={[styles.glyph, glassStyle]} pointerEvents="none">
        <SymbolView name={name} size={20} tintColor={colors.text} weight="regular" />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0 },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
  hairline: { position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  bar: {
    minHeight: HOME_CHROMA_MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  brand: { justifyContent: "center", flexShrink: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandMark: { width: 36, height: 36, flexShrink: 0 },
  brandOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center" },
  word: { letterSpacing: 1.4, flexShrink: 1 },
  // белый, а не colors.text: марка лежит на фотографии, и в светлой теме тоже
  wordOnPhoto: { color: palette.surface },
  actions: { flexDirection: "row", alignItems: "center" },
  hit: {
    minWidth: MIN_TAP_SIZE,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    width: MIN_TAP_SIZE - 8,
    height: MIN_TAP_SIZE - 8,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  glyph: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
});
