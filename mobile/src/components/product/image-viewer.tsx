/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из жестов и эффектов — штатный способ анимировать на UI-потоке. Правило React
 * Compiler про shared values не знает и даёт ложное срабатывание. */
import { useEffect } from "react";
import { Modal, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { AppText, IconButton } from "@/components/ui";
import { Duration, Ease, spacing, Spring } from "@/theme";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.4;
/** Насколько нужно утянуть фото вниз/вверх, чтобы закрыть просмотр. */
const DISMISS_DISTANCE = 130;

export interface ImageViewerProps {
  visible: boolean;
  uri: string | null;
  alt?: string | null;
  /** Номер снимка и их общее число — подпись «2 / 5» сверху. */
  index: number;
  total: number;
  onClose: () => void;
}

/**
 * Полноэкранный просмотр фото: щипок, перетаскивание, двойной тап и смахивание
 * вниз для закрытия. Отдельный слой поверх всего — поэтому тёмный фон
 * захардкожен: это не поверхность приложения, а «кинозал», он одинаков в обеих
 * темах (так же ведёт себя системный Quick Look).
 */
export function ImageViewer({ visible, uri, alt, index, total, onClose }: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // фиксированная высота кадра нужна не только для вёрстки, но и для границ панорамирования
  const frameHeight = height * 0.72;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    // каждое открытие начинается с чистого масштаба, иначе фото «помнит» прошлый зум
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  }, [visible, scale, savedScale, translateX, translateY, savedX, savedY]);

  const reset = () => {
    "worklet";
    scale.value = withSpring(1, Spring.gentle);
    savedScale.value = 1;
    translateX.value = withSpring(0, Spring.gentle);
    translateY.value = withSpring(0, Spring.gentle);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.6, savedScale.value * event.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) reset();
      else savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .maxPointers(2)
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedX.value + event.translationX;
        translateY.value = savedY.value + event.translationY;
        return;
      }
      // второй палец — это щипок, а не смахивание: закрывать экран нельзя
      if (event.numberOfPointers > 1) return;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      if (scale.value > 1) {
        // возвращаем фото в границы кадра, иначе его можно утащить за экран
        const maxX = ((scale.value - 1) * width) / 2;
        const maxY = ((scale.value - 1) * frameHeight) / 2;
        const nextX = Math.min(maxX, Math.max(-maxX, translateX.value));
        const nextY = Math.min(maxY, Math.max(-maxY, translateY.value));
        translateX.value = withSpring(nextX, Spring.press);
        translateY.value = withSpring(nextY, Spring.press);
        savedX.value = nextX;
        savedY.value = nextY;
        return;
      }
      if (Math.abs(translateY.value) > DISMISS_DISTANCE) {
        scheduleOnRN(onClose);
        return;
      }
      translateY.value = withSpring(0, Spring.press);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE, {
        duration: Duration.base,
        easing: Ease.power2Out,
      });
      savedScale.value = DOUBLE_TAP_SCALE;
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      scheduleOnRN(onClose);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      scale.value > 1
        ? 1
        : interpolate(Math.abs(translateY.value), [0, DISMISS_DISTANCE * 2], [1, 0.25], Extrapolation.CLAMP),
  }));

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={["portrait"]}
      onRequestClose={onClose}
    >
      {/* жесты внутри Modal живут в отдельном окне — им нужен собственный root */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        <GestureDetector gesture={gesture}>
          <Animated.View style={styles.stage} accessibilityViewIsModal>
            <Animated.View style={imageStyle}>
              <Image
                source={{ uri }}
                style={{ width, height: frameHeight }}
                contentFit="contain"
                transition={180}
                cachePolicy="memory-disk"
                accessibilityIgnoresInvertColors
                alt={alt ?? "Фото товара"}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <View style={[styles.bar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
          {total > 1 ? (
            <View style={styles.counter}>
              <AppText variant="footnote" weight="600" style={styles.counterText}>
                {index + 1} / {total}
              </AppText>
            </View>
          ) : (
            <View />
          )}
          <IconButton name="xmark" label="Закрыть" variant="glass" onPress={onClose} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: "#000000" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  bar: {
    position: "absolute",
    left: spacing.base,
    right: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  counterText: { color: "#ffffff" },
});
