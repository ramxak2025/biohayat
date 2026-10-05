/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта/обработчика — штатный способ анимировать на UI-потоке. Правило React
 * Compiler про shared values не знает; в рендере `.value` мы не читаем. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { SymbolView } from "expo-symbols";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { PressableScale } from "@/components/ui";
import { Duration, Ease, radii, spacing, Spring, typography, useColors } from "@/theme";

import { SLOT_PERIOD_ICON, slotPeriod } from "./plan-utils";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Галочка в системе координат 18×18 и точная длина её пути.
 *
 * Длина нужна для `strokeDasharray`/`strokeDashoffset`: смещая пунктир на всю
 * длину, мы прячем линию целиком, а анимация смещения к нулю «пишет» её от руки.
 * Считаем один раз здесь, а не в рантайме: 5.374 + 10.480 = 15.854 → берём 16
 * с запасом, чтобы в нуле не оставался хвостик пикселя.
 */
const CHECK_PATH = "M3.6 9.3 L7.4 13.1 L14.4 5.3";
const CHECK_LENGTH = 16;

const MARK_SIZE = 34;

/**
 * Сдвиг между «пошла заливка» и «пошла галочка». Намеренно меньше
 * `Duration.instant`: это не вторая фаза, а перекрытие — глаз должен прочитать
 * одно движение с причиной и следствием, а не две отдельные анимации.
 */
const CHECK_LEAD = 90;
/** Столько заливка ещё держится после того, как галочка стёрлась. */
const UNFILL_LAG = 60;

export interface SlotChipProps {
  time: string;
  taken: boolean;
  /** Запрос ушёл на сервер: кнопку блокируем, потому что POST — переключатель. */
  pending?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Большая кнопка-отметка одного приёма — самое частое действие в приложении.
 *
 * Хореография одного нажатия (всё на UI-потоке, ни одного кадра через setState):
 *   0 мс    палец вниз — сжатие пружиной и лёгкая хаптика (PressableScale);
 *   0 мс    из точки касания расходится заливка (expo.out) — отклик раньше сети;
 *   90 мс   поверх неё «пишется» галочка (обводка SVG, power3.out);
 *   ~350 мс приходит ответ сервера и мы либо ничего не делаем, либо откатываемся.
 *
 * Оптимистично рисуем СРАЗУ, но источник правды — поле `taken` из ответа сервера
 * (POST не идемпотентен). Если ответ разошёлся с нашей догадкой — проигрываем
 * анимацию назад с короткой «отдачей», чтобы откат было видно, а не просто
 * «залипшую» галочку.
 *
 * Спиннера на время запроса больше нет намеренно: нарисованная галочка и есть
 * обратная связь, а крутилка поверх неё говорила бы «ещё не готово» и обесценила
 * бы мгновенный отклик. `pending` по-прежнему блокирует кнопку — повторный POST
 * снял бы отметку.
 */
export function SlotChip({ time, taken, pending = false, disabled = false, onPress }: SlotChipProps) {
  const colors = useColors();
  const reduced = useReducedMotion();

  const target = taken ? 1 : 0;

  /** Общее состояние: цвет рамки, кружка, текста и иконка времени суток. */
  const progress = useSharedValue(target);
  /** Прорисовка галочки, 0..1 → strokeDashoffset. */
  const draw = useSharedValue(target);
  /** Масштаб круга-заливки, расходящегося из точки касания. */
  const fill = useSharedValue(target);
  const pop = useSharedValue(1);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  const [box, setBox] = useState({ width: 0, height: 0 });
  /** Диаметр заливки: перекрывает чип из любой точки касания (2 × диагональ). */
  const rippleSize = Math.ceil(2 * Math.hypot(box.width, box.height));

  /**
   * Чего мы ждём от сервера. Именно ref, а не состояние: оптимистичная анимация
   * не должна стоить ре-рендера, а читать shared value с JS-потока нельзя —
   * запись туда асинхронна и вернётся прошлое значение.
   */
  const expected = useRef(target);
  /** Изменение инициировал палец (а не push-уведомление или рефетч). */
  const initiated = useRef(false);

  const run = useCallback(
    (next: 0 | 1, recoil: boolean) => {
      if (reduced) {
        // Reduce Motion: без перелётов и пути — но состояние всё равно меняется
        // и остаётся видимым. Пользователя нельзя оставить без обратной связи.
        progress.value = next;
        draw.value = next;
        fill.value = next;
        return;
      }

      if (next === 1) {
        // порядок важен: сначала чип «становится своим», потом появляется отметка
        fill.value = withTiming(1, { duration: Duration.base, easing: Ease.expoOut });
        progress.value = withTiming(1, { duration: Duration.fast, easing: Ease.power2Out });
        draw.value = withDelay(
          CHECK_LEAD,
          withTiming(1, { duration: Duration.base, easing: Ease.power3Out }),
        );
        pop.value = withDelay(
          CHECK_LEAD,
          withSequence(withSpring(1.045, Spring.pop), withSpring(1, Spring.press)),
        );
      } else {
        // снятие — та же анимация задом наперёд: галочка стирается, потом уходит заливка
        draw.value = withTiming(0, { duration: Duration.fast, easing: Ease.power2In });
        progress.value = withDelay(
          UNFILL_LAG,
          withTiming(0, { duration: Duration.base, easing: Ease.power2Out }),
        );
        fill.value = withDelay(
          CHECK_LEAD,
          withTiming(0, { duration: Duration.base, easing: Ease.power2InOut }),
        );
      }

      if (recoil) {
        // сервер не подтвердил нашу догадку — короткая отдача пружиной поверх отката
        pop.value = withSequence(withSpring(0.94, Spring.press), withSpring(1, Spring.pop));
      }
    },
    [reduced, progress, draw, fill, pop],
  );

  useEffect(() => {
    // пока запрос в полёте — держим оптимистичную картинку
    if (pending) return;
    if (expected.current === target) {
      initiated.current = false;
      return;
    }
    const recoil = initiated.current;
    initiated.current = false;
    expected.current = target;
    run(target, recoil);
  }, [target, pending, run]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      // точка касания внутри чипа — из неё и разойдётся заливка
      originX.value = event.nativeEvent.locationX;
      originY.value = event.nativeEvent.locationY;
    },
    [originX, originY],
  );

  const handlePress = useCallback(() => {
    const next: 0 | 1 = expected.current === 1 ? 0 : 1;
    expected.current = next;
    initiated.current = true;
    run(next, false);
    onPress();
  }, [run, onPress]);

  const chipStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [colors.line, colors.brand]),
    transform: [{ scale: pop.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: originX.value },
      { translateY: originY.value },
      { scale: fill.value },
    ],
    // короткий вход по прозрачности, иначе в начале мелькает точка
    opacity: interpolate(fill.value, [0, 0.18, 1], [0, 1, 1], Extrapolation.CLAMP),
  }));

  const markStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.surfaceSunken, colors.brand]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.line, colors.brand]),
  }));

  const periodIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.72], Extrapolation.CLAMP) }],
  }));

  const timeStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.text, colors.brand]),
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
    // круглый торец линии рисует точку даже при нулевой длине — гасим её
    opacity: interpolate(draw.value, [0, 0.03], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <PressableScale
      onPress={handlePress}
      onPressIn={handlePressIn}
      disabled={disabled || pending}
      // единственная хаптика этого слоя: лёгкий удар на палец вниз, до сети.
      // Итог действия (Success/Warning/Error) отдаёт слой мутации — здесь его
      // не дублируем, иначе получится «тук-тук» на одно нажатие.
      haptic="light"
      accessibilityRole="checkbox"
      accessibilityState={{ checked: taken, disabled: disabled || pending }}
      accessibilityLabel={`Приём в ${time}`}
      accessibilityHint={taken ? "Дважды коснитесь, чтобы снять отметку" : "Дважды коснитесь, чтобы отметить приём"}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View
        onLayout={handleLayout}
        style={[styles.chip, { backgroundColor: colors.surface }, chipStyle]}
      >
        {rippleSize > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                width: rippleSize,
                height: rippleSize,
                marginLeft: -rippleSize / 2,
                marginTop: -rippleSize / 2,
                borderRadius: rippleSize / 2,
                backgroundColor: colors.brandSoft,
              },
              rippleStyle,
            ]}
          />
        ) : null}

        <Animated.View style={[styles.mark, markStyle]}>
          <Animated.View style={[styles.periodIcon, periodIconStyle]} pointerEvents="none">
            <SymbolView name={SLOT_PERIOD_ICON[slotPeriod(time)]} size={14} tintColor={colors.textFaint} />
          </Animated.View>

          <Svg width={18} height={18} viewBox="0 0 18 18">
            <AnimatedPath
              d={CHECK_PATH}
              stroke={colors.textOnBrand}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>

        <Animated.Text maxFontSizeMultiplier={1.4} style={[styles.time, timeStyle]}>
          {time}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
  chip: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingLeft: spacing.sm,
    paddingRight: spacing.base,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    // заливка должна обрезаться по скруглению чипа
    overflow: "hidden",
  },
  ripple: { position: "absolute", left: 0, top: 0 },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  periodIcon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { ...typography.headline, fontWeight: "600" },
});
