import { palette } from "@/theme";

/**
 * Цвет баннера приходит из админки строкой HEX (`Banner.bgColor`), то есть это
 * ДАННЫЕ, а не токен темы. Поэтому подложку и цвет текста на ней считаем от
 * этого цвета, а не берём из палитры: зелёный баннер обязан остаться зелёным и
 * в тёмной теме, а надпись на нём — читаемой при любом значении из админки.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const FALLBACK: Rgb = { r: 42, g: 66, b: 51 }; // Склон

function parseHex(hex: string | null | undefined): Rgb {
  if (!hex) return FALLBACK;
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return FALLBACK;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;

const mix = (color: Rgb, target: Rgb, amount: number): Rgb => ({
  r: color.r + (target.r - color.r) * amount,
  g: color.g + (target.g - color.g) * amount,
  b: color.b + (target.b - color.b) * amount,
});

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** Осветлить на `amount` (0..1). */
export function tint(hex: string | null | undefined, amount: number): string {
  return toHex(mix(parseHex(hex), WHITE, amount));
}

/** Затемнить на `amount` (0..1). */
export function shade(hex: string | null | undefined, amount: number): string {
  return toHex(mix(parseHex(hex), BLACK, amount));
}

/** Относительная яркость по WCAG — по ней решаем, белый текст или тёмный. */
function luminance(color: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** Контрастный цвет подписи поверх заливки баннера. */
export function inkOn(hex: string | null | undefined): string {
  return luminance(parseHex(hex)) > 0.19 ? palette.ink : palette.surface;
}

/**
 * Диагональный градиент для карточки баннера: светлее сверху-слева, глубже
 * снизу-справа — так плоская заливка из админки выглядит объёмной.
 */
export function bannerGradient(hex: string | null | undefined): [string, string, string] {
  return [tint(hex, 0.16), parseHexToString(hex), shade(hex, 0.26)];
}

function parseHexToString(hex: string | null | undefined): string {
  return toHex(parseHex(hex));
}

/** Брендовый дефолт, когда админка не проставила цвет. */
export const DEFAULT_BANNER_COLOR = palette.brand600;

/**
 * Тот же цвет, но с заданной прозрачностью.
 *
 * Нужен градиентам-растворениям. Заливать их в `"transparent"` нельзя: RN
 * интерполирует к rgba(0,0,0,0), и по краю светлого градиента проступает серая
 * муть. Растворять цвет надо в него же самого с alpha = 0.
 */
export function withAlpha(hex: string | null | undefined, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${a})`;
}
