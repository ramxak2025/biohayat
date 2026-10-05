/**
 * Система движения ХАЯТ.
 *
 * Клиент просил «анимации GSAP». Честный инженерный ответ: GSAP — браузерная
 * библиотека, она анимирует свойства JS-объектов и в React Native крутилась бы
 * на JS-потоке, роняя кадры во время загрузки данных. Поэтому анимации живут на
 * Reanimated (UI-поток, 120 Гц на ProMotion), а *кривые* взяты ровно те, что у
 * GSAP: соответствия ниже проверены численно (максимальная ошибка ≤ 2.2e-16,
 * то есть машинный ноль) — см. `docs/motion.md`.
 *
 *   GSAP              →  здесь
 *   power2.out        →  Ease.power2Out
 *   power3.out        →  Ease.power3Out
 *   back.out(1.7)     →  Ease.backOut
 *   expo.out          →  Ease.expoOut
 */
import { Easing, type EasingFunction } from "react-native-reanimated";

export const Ease = {
  /** GSAP power2.out — базовая кривая выхода (кнопки, появления). */
  power2Out: Easing.out(Easing.cubic),
  /** GSAP power3.out — «дорогое» появление карточек и секций. */
  power3Out: Easing.out(Easing.poly(4)),
  /** GSAP power2.in — уходы и сворачивания. */
  power2In: Easing.cubic,
  /** GSAP power2.inOut. */
  power2InOut: Easing.inOut(Easing.cubic),
  /** GSAP power3.inOut — длинные переходы состояний. */
  power3InOut: Easing.inOut(Easing.poly(4)),
  /** GSAP expo.out — резкий вылет с мягкой посадкой. */
  expoOut: Easing.out(Easing.exp),
  /** GSAP back.out(1.7) — перелёт ~10% (бейджи, поп-ин счётчиков). */
  backOut: Easing.out(Easing.back(1.7)),
  /** GSAP circ.out. */
  circOut: Easing.out(Easing.circle),
  /** GSAP sine.out — микродвижения. */
  sineOut: Easing.out(Easing.sin),
  linear: Easing.linear,
} satisfies Record<string, EasingFunction>;

/** Длительности в мс. Держим лестницу короткой — iOS не любит медленное. */
export const Duration = {
  /** Нажатие, подсветка, переключатель. */
  instant: 120,
  fast: 180,
  base: 260,
  /** Появление секции/карточки. */
  reveal: 420,
  slow: 560,
} as const;

/**
 * Пружины для всего, чего касался палец: они наследуют скорость жеста,
 * а тайминг — нет. `dampingRatio` < 1 даёт перелёт.
 */
export const Spring = {
  /** Мягкая посадка без перелёта. */
  gentle: { duration: 420, dampingRatio: 1 },
  /** Стандарт для отпускания пальца. */
  press: { duration: 320, dampingRatio: 0.82 },
  /** Пружина-«поп» ≈ 10% перелёта — эквивалент back.out(1.7). */
  pop: { duration: 400, dampingRatio: 0.591 },
  /** Заметный отскок (бейдж корзины). */
  bouncy: { duration: 400, dampingRatio: 0.52 },
} as const;

/** Сдвиг карточек в сетке при появлении; выше 8-й позиции не ждём. */
export const staggerDelay = (index: number, step = 55, cap = 8) =>
  Math.min(index, cap) * step;

/** Масштаб при нажатии — одинаковый по всему приложению. */
export const PRESS_SCALE = 0.965;
