import type { CatalogDirectionId } from "../../../shared/catalog-directions";

export const vysota = {
  night: "#0B1610",
  pine: "#14251C",
  slope: "#2A4233",
  sage: "#B3C3A6",
  sageDark: "#55705A",
  mist: "#EEF1EA",
  mist2: "#E2E7DD",
  line: "#DCE2D6",
  chipLine: "#C9D1C3",
  stone: "#D8D2C3",
  ink: "#0F1D16",
  muted: "#4C5E52",
  grass: "#E8D6A8",
  white: "#FFFFFF",
} as const;

export const directionColors = {
  sunna: { packaging: "#B65031", onDark: "#E8774F", onLight: "#5A2210", photo: "#F8E2D7" },
  semya: { packaging: "#E28E41", onDark: "#F2A45C", onLight: "#763C0D", photo: "#FCEBDA" },
  osnova: { packaging: "#33714B", onDark: "#63C08A", onLight: "#1D4A30", photo: "#DDEEE3" },
  sport: { packaging: "#213C70", onDark: "#7E9FEA", onLight: "#213C70", photo: "#E2E8F4" },
} satisfies Record<CatalogDirectionId, { packaging: string; onDark: string; onLight: string; photo: string }>;

export const palette = {
  brand50: vysota.mist,
  brand100: vysota.mist2,
  brand500: vysota.ink,
  brand600: vysota.slope,
  brand700: vysota.ink,
  accent500: vysota.grass,
  ink: vysota.ink,
  inkMuted: vysota.muted,
  inkFaint: vysota.muted,
  line: vysota.line,
  surface: vysota.white,
  surfaceSoft: vysota.mist,
  surfaceSunken: vysota.mist2,
  success: directionColors.osnova.onLight,
  warning: directionColors.semya.onLight,
  danger: "#B3261E",
  info: directionColors.sport.onLight,
  sale: "#B3261E",
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
  /** Цвет для текста ссылок и активных состояний. */
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

  /** Тон невыбранной вкладки. */
  tabInactive: string;
  /** Подложка под стеклом, когда Liquid Glass недоступен (iOS < 26). */
  glassFallback: string;
  /** Затемнение под модалками. */
  scrim: string;
}

export const lightColors: ColorScheme = {
  background: vysota.mist,
  surface: vysota.white,
  surfaceSoft: vysota.mist,
  surfaceSunken: vysota.mist2,
  line: vysota.chipLine,
  text: vysota.ink,
  textMuted: vysota.muted,
  textFaint: vysota.muted,
  textOnBrand: vysota.mist,
  brand: vysota.ink,
  actionFill: vysota.ink,
  brandText: vysota.ink,
  brandPressed: vysota.slope,
  brandSoft: vysota.mist2,
  brandBorder: vysota.chipLine,
  accent: directionColors.semya.onLight,
  accentSoft: vysota.grass,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
  sale: palette.sale,
  tabInactive: vysota.muted,
  glassFallback: vysota.white,
  scrim: "rgba(11,22,16,.45)",
};

export const darkColors: ColorScheme = {
  background: vysota.night,
  surface: vysota.pine,
  surfaceSoft: vysota.pine,
  surfaceSunken: vysota.slope,
  line: vysota.sageDark,
  text: vysota.mist,
  textMuted: "rgba(238,241,234,.88)",
  textFaint: "rgba(238,241,234,.72)",
  textOnBrand: vysota.ink,
  brand: vysota.sage,
  actionFill: vysota.mist,
  brandText: vysota.sage,
  brandPressed: vysota.sage,
  brandSoft: vysota.slope,
  brandBorder: vysota.sageDark,
  accent: vysota.grass,
  accentSoft: vysota.slope,
  success: directionColors.osnova.onDark,
  warning: directionColors.semya.onDark,
  danger: "#F09C91",
  info: directionColors.sport.onDark,
  sale: "#F09C91",
  tabInactive: vysota.sage,
  glassFallback: vysota.pine,
  scrim: "rgba(11,22,16,.65)",
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
  sm: 10,
  md: 18,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 32,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 44, lineHeight: 45, fontWeight: "600", letterSpacing: -1.9 },
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: "600", letterSpacing: -1 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "500", letterSpacing: -.85 },
  title2: { fontSize: 24, lineHeight: 30, fontWeight: "500", letterSpacing: -.72 },
  title3: { fontSize: 19, lineHeight: 25, fontWeight: "500", letterSpacing: -.3 },
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
  xs: { shadowColor: vysota.night, shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  sm: { shadowColor: vysota.night, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  md: { shadowColor: vysota.night, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  lg: { shadowColor: vysota.night, shadowOpacity: 0.1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  brand: { shadowColor: palette.brand500, shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
} as const;

/** Минимальная зона нажатия по HIG. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TAP_SIZE = 44;
