import type { View } from "react-native";
import type { AnimatedRef } from "react-native-reanimated";

export interface FlyToCartRequest {
  /**
   * Вью, из центра которой вылетает копия. Обязательно `useAnimatedRef` на
   * Animated-компоненте: measure() умеет читать геометрию только на UI-потоке
   * и только по такому ref — иначе мы бы меряли на JS и ловили лишний кадр.
   */
  source: AnimatedRef<View>;
  /** Абсолютный URL картинки товара. null — летит фирменная заглушка. */
  image: string | null;
  /** Сторона квадратной копии в pt. */
  size?: number;
  /**
   * Момент приземления. Сюда кладут то, что обязано совпасть с «попом»
   * счётчика: добавление в корзину и хаптику. Вызывается ровно один раз —
   * даже если полёт прервали (уход с экрана, поворот): товар важнее анимации.
   */
  onLand?: () => void;
}

export type FlyToCart = (request: FlyToCartRequest) => void;
