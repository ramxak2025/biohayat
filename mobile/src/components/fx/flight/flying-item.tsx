import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import Animated, {
  measure,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type AnimatedRef,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";

import { Duration, Ease, radii, useColors } from "@/theme";

import type { FlightTarget } from "./cart-target";

/**
 * Длительность полёта. Осознанно верх нашей шкалы (Duration.slow): это не смена
 * состояния, а короткая история «товар уехал в корзину» — на 260 мс её не
 * прочитать, на 800 мс она начинает раздражать.
 */
const FLIGHT_MS = Duration.slow;

/** Доля пути, на которой копия проходит верх дуги. */
const APEX_AT = 0.38;

/** Наклон в сторону движения — копия «заваливается» по ходу, как брошенный предмет. */
const TILT_DEG = 10;

export interface FlyingItemProps {
  id: number;
  image: string | null;
  size: number;
  source: AnimatedRef<View>;
  /** Оверлей-хост: его измеряем, чтобы перевести оконные координаты в свои. */
  host: AnimatedRef<View>;
  target: FlightTarget;
  onDone: (id: number) => void;
}

/**
 * Одна летящая копия товара.
 *
 * Дуга собрана из двух независимых осей — ровно так же, как это делают в GSAP,
 * когда нет motionPath: X едет одним tween'ом с power2.out, Y — последователь-
 * ностью «вверх power2.in → вниз power2.out». Посадка сознательно мягкая (обе
 * оси тормозят у цели), а не «гравитационная»: предмет должен лечь в корзину,
 * а не врезаться в таб-бар.
 */
export function FlyingItem({ id, image, size, source, host, target, onDone }: FlyingItemProps) {
  const colors = useColors();

  // стартуем невидимой в (0,0): позицию узнаём только после measure, и первый
  // кадр не должен показать копию в углу экрана
  const opacity = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const tilt = useSharedValue(0);

  useEffect(() => {
    // Запуск именно из эффекта, а не из обработчика нажатия: к этому моменту
    // копия уже примонтирована, поэтому первый кадр полёта — уже на месте.
    scheduleOnUI(() => {
      "worklet";
      const from = measure(source);
      const frame = measure(host);
      // measure() возвращает null для размонтированной вью (карточку увёл
      // рециклинг списка) — тогда тихо закрываем слот, корзина обновится в onDone
      if (from === null || frame === null) {
        scheduleOnRN(onDone, id);
        return;
      }

      // всё считаем в координатах хоста: measure отдаёт оконные pageX/pageY,
      // а оверлей может начинаться ниже (например, под шапкой экрана)
      const startX = from.pageX - frame.pageX + from.width / 2 - size / 2;
      const startY = from.pageY - frame.pageY + from.height / 2 - size / 2;
      const endX = target.x - frame.pageX - size / 2;
      const endY = target.y - frame.pageY - size / 2;

      // подъём дуги пропорционален длине пути, но всегда заметен и никогда не
      // выбрасывает копию за верх экрана
      const lift = Math.min(150, Math.max(64, Math.abs(endY - startY) * 0.22));

      x.value = startX;
      y.value = startY;
      scale.value = 1;
      tilt.value = 0;
      opacity.value = 1;

      x.value = withTiming(endX, { duration: FLIGHT_MS, easing: Ease.power2Out });
      y.value = withSequence(
        withTiming(startY - lift, { duration: FLIGHT_MS * APEX_AT, easing: Ease.power2In }),
        withTiming(
          endY,
          { duration: FLIGHT_MS * (1 - APEX_AT), easing: Ease.power2Out },
          () => {
            "worklet";
            // finished === false (анимацию прервали) обрабатываем так же:
            // корзина важнее анимации, поэтому onDone зовём в любом случае
            scheduleOnRN(onDone, id);
          },
        ),
      );
      // лёгкий «отрыв» назад перед уменьшением — копия будто подпрыгивает с кнопки
      scale.value = withSequence(
        withTiming(1.08, { duration: FLIGHT_MS * 0.16, easing: Ease.backOut }),
        withTiming(0.22, { duration: FLIGHT_MS * 0.84, easing: Ease.power2In }),
      );
      tilt.value = withTiming(endX > startX ? TILT_DEG : -TILT_DEG, {
        duration: FLIGHT_MS,
        easing: Ease.power2Out,
      });
      // гаснет к самому концу: у таб-бара копия уже невидима, поэтому её не
      // видно «обрезанной» стеклом бара
      opacity.value = withDelay(
        FLIGHT_MS * 0.62,
        withTiming(0, { duration: FLIGHT_MS * 0.38, easing: Ease.power2In }),
      );
    });
  }, [id, size, source, host, target, onDone, x, y, scale, tilt, opacity]);

  useEffect(
    // Страховка: слот сняли с экрана (поворот, уход с вкладки, переполнение
    // очереди) — товар всё равно обязан оказаться в корзине. onDone идемпотентен.
    () => () => onDone(id),
    [id, onDone],
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotateZ: `${tilt.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      // копия — чистая декорация: VoiceOver не должен её находить и объявлять
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.item,
        { width: size, height: size, backgroundColor: colors.surface, borderColor: colors.line },
        style,
      ]}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // картинка уже в памяти — её только что показывала карточка,
          // поэтому без transition: он бы дал «проявление» прямо в полёте
          transition={0}
          cachePolicy="memory-disk"
          accessibilityIgnoresInvertColors
          // декорация: настоящая карточка товара остаётся на экране и озвучена
          alt=""
        />
      ) : (
        <View style={[styles.fallback, { backgroundColor: colors.brandSoft }]}>
          <SymbolView name="leaf" size={size * 0.4} tintColor={colors.brand} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
});
