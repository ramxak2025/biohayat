/** Shared geometry for text that grows with Dynamic Type. */
export const HOME_CHROMA_MIN_HEIGHT = 52;
export const HERO_FADE_RATIO = 0.3;

export function homeHeroHeight(viewportHeight: number, contentHeight: number, topClearance: number): number {
  const baseline = Math.min(560, Math.max(340, viewportHeight * 0.55));
  // The bottom 30% is the fade; text must fit above it and below the header.
  const required = (topClearance + contentHeight + 8) / (1 - HERO_FADE_RATIO);
  return Math.ceil(Math.max(baseline, required));
}

export function categoryTileWidth(viewportWidth: number, fontScale: number): number {
  return Math.round(Math.min(viewportWidth - 32, 158 * Math.max(1, Math.min(fontScale, 1.9))));
}

export function catalogControlsStacked(viewportWidth: number, fontScale: number): boolean {
  // Count, two named controls, icons and gutters need this much effective width.
  return viewportWidth / Math.max(1, Math.min(fontScale, 1.4)) < 360;
}
