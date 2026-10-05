import { useContext } from "react";

import { FlyToCartContext } from "./context";
import type { FlyToCart } from "./types";

/**
 * Запустить полёт товара в корзину.
 *
 * ```tsx
 * const source = useAnimatedRef<View>();
 * const flyToCart = useFlyToCart();
 * flyToCart({ source, image: product.image, onLand: () => add(product, 1) });
 * ```
 */
export function useFlyToCart(): FlyToCart {
  return useContext(FlyToCartContext);
}
