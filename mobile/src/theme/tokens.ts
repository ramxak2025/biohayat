/**
 * Дизайн-токены ХАЯТ для iOS.
 *
 * Значения светлой темы перенесены один-в-один из веб-дизайн-системы
 * (`docs/design-system.md` + `src/app/globals.css`), чтобы приложение и сайт
 * выглядели одним продуктом. Тёмная тема спроектирована под iOS: не инверсия
 * светлой, а отдельная шкала с приподнятыми поверхностями и осветлённым
 * брендовым зелёным — на чёрном #3a9447 не добирает контраста.
 */

export const palette = {
  brand50: "#f0f9f1",
  brand100: "#dbf0de",
  brand500: "#3a9447",
  brand600: "#2c7838",
  brand700: "#245f2f",

  accent400: "#e7a124",
  accent500: "#d98a12",
  accent600: "#b86e0e",

  ink: "#1a1d1a",
  inkMuted: "#5b635b",
  inkFaint: "#6b716a",

  line: "#e7ebe4",
  surface: "#ffffff",
  surfaceSoft: "#f5f7f3",
  surfaceSunken: "#eef1ea",

  success: "#2c7838",
  warning: "#d98a12",
  danger: "#d64545",
  info: "#2f6fb0",
  sale: "#d64545",
} as const;

export interface ColorScheme {
  /** Фон экрана. */
  background: string;
  /** Карточки и листы поверх фона. */
  surface: string;
  /** Секции и «мягкие» подложки. */
  surfaceSoft: string;
  /** Утопленные блоки (поля ввода, скелетоны). */
  surfaceSunken: string;
  /** Разделители. */
  line: string;

  text: string;
  textMuted: string;
  textFaint: string;
  /** Текст на брендовой заливке. */
  textOnBrand: string;

  brand: string;
  /** Заливка основного действия с контрастом текста не ниже 4.5:1. */
  actionFill: string;
  /**
   * Брендовый цвет для МЕЛКОГО текста и ссылок. Основной #3a9447 на белом даёт
   * 3.81:1 — ниже порога WCAG AA (4.5:1) для текста меньше 18pt. На заливках
   * кнопок используем более контрастный actionFill, на подписях — brandText.
   */
  brandText: string;
  brandPressed: string;
  brandSoft: string;
  brandBorder: string;

  accent: string;
  accentSoft: string;

  success: string;
  warning: string;
  danger: string;
  info: string;
  sale: string;

  /**
   * Невыбранная вкладка нижнего меню. Отдельный токен, а не textFaint: тот
   * оливково-тёплый и поверх стекла читается грязным, а системный цвет —
   * почти чёрным и «жирным». Нужен нейтральный серый.
   */
  tabInactive: string;
  /** Подложка под стеклом, когда Liquid Glass недоступен (iOS < 26). */
  glassFallback: string;
  /** Затемнение под модалками. */
  scrim: string;
}

export const lightColors: ColorScheme = {
  background: palette.surfaceSoft,
  surface: palette.surface,
  surfaceSoft: palette.surfaceSoft,
  surfaceSunken: palette.surfaceSunken,
  line: palette.line,

  text: palette.ink,
  textMuted: palette.inkMuted,
  textFaint: palette.inkFaint,
  textOnBrand: "#ffffff",

  brand: palette.brand500,
  actionFill: palette.brand600,
  brandText: palette.brand700,
  brandPressed: palette.brand600,
  brandSoft: palette.brand50,
  brandBorder: palette.brand100,

  accent: palette.accent500,
  accentSoft: "#fdf3e0",

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  sale: palette.sale,

  tabInactive: "#8a8a8e",
  glassFallback: "rgba(255,255,255,0.82)",
  scrim: "rgba(16,21,16,0.35)",
};

export const darkColors: ColorScheme = {
  background: "#0d100d",
  surface: "#161a16",
  surfaceSoft: "#121612",
  surfaceSunken: "#1d231d",
  line: "#2a312a",

  text: "#f2f5f1",
  textMuted: "#a7b0a5",
  textFaint: "#8b948a",
  textOnBrand: "#08120a",

  // светлее веб-брендового: контраст ≥ 4.5:1 на #0d100d
  brand: "#5fc06f",
  actionFill: "#5fc06f",
  brandText: "#7ad189",
  brandPressed: "#4fae5e",
  brandSoft: "#16261a",
  brandBorder: "#24402a",

  accent: "#f0b44a",
  accentSoft: "#2a2114",

  success: "#5fc06f",
  warning: "#f0b44a",
  danger: "#ef6a6a",
  info: "#6aa6e0",
  sale: "#ef6a6a",

  tabInactive: "#98989f",
  glassFallback: "rgba(22,26,22,0.78)",
  scrim: "rgba(0,0,0,0.5)",
};

/** Шкала отступов, кратная 4 — как в вебе (Tailwind spacing). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56,
} as const;

/** Радиусы из веб-дизайн-системы. Кнопки и чипсы — пилюли (999). */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  "3xl": 36,
  pill: 999,
} as const;

/**
 * Типографика: системный шрифт (SF Pro). Осознанное решение вместо веб-Manrope —
 * родной шрифт даёт Dynamic Type, правильный кернинг кириллицы в iOS 26
 * и «эппловское» ощущение. Manrope остаётся на сайте и в логотипе.
 */
export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700" },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700" },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700" },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600" },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400" },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400" },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: "400" },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "500" },
} as const;

/** Мягкие «природные» тени веб-системы, переведённые в iOS shadow. */
export const shadows = {
  xs: { shadowColor: "#1a1d1a", shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  sm: { shadowColor: "#1a1d1a", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  md: { shadowColor: "#1a1d1a", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  lg: { shadowColor: "#1a1d1a", shadowOpacity: 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  brand: { shadowColor: palette.brand500, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
} as const;

/** Минимальная зона нажатия по HIG. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TAP_SIZE = 44;
