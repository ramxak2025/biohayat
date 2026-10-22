/** Intrinsic content, never the scroll viewport, determines the native sheet height. */
export function authSheetFraction(contentHeight: number, windowHeight: number, topInset = 0, fontScale = 1): number {
  const available = Math.max(1, windowHeight - topInset);
  const intrinsic = contentHeight > 0 ? contentHeight : 620 * Math.min(fontScale, 1.6);
  // Reserve native grabber space; round upward so fractional pixels cannot clip the last action.
  return Math.min(1, Math.max(0.35, Math.ceil((intrinsic + 12) / available * 100) / 100));
}

/** Floating iOS 26 sheets have a bottom margin; expanded forms reserve the home indicator. */
export function authSheetContentBottomInset(platform: string, version: string | number, bottomInset: number, fullHeight = false): number {
  return platform === "ios" && Number.parseInt(String(version), 10) >= 26 && !fullHeight ? 0 : bottomInset;
}
