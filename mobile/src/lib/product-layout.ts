export function productMediaHeight(viewportWidth: number): number {
  return Math.min(Math.round(viewportWidth * 0.76), 300);
}

/** UIKit already supplies the tab inset to automatic scroll containers. */
export function productFooterClearance(measuredFooter: number): number {
  return measuredFooter + 8 + 16;
}
export const PRODUCT_IDENTITY_MIN_HEIGHT = 112;

