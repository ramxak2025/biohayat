import { createContext } from "react";

import type { FlyToCart } from "./types";

/**
 * Полёт без провайдера рисовать негде — но действие обязано состояться:
 * запасной вариант сразу вызывает onLand, и кнопка ведёт себя как обычная.
 * Так экран, забывший обернуться провайдером, теряет украшение, а не покупку.
 */
const landImmediately: FlyToCart = (request) => {
  request.onLand?.();
};

export const FlyToCartContext = createContext<FlyToCart>(landImmediately);
