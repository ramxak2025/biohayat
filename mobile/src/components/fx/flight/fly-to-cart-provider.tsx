import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedRef, useReducedMotion, type AnimatedRef } from "react-native-reanimated";

import { cartTarget } from "./cart-target";
import { FlyToCartContext } from "./context";
import { FlyingItem } from "./flying-item";
import type { FlyToCart } from "./types";

/** Сторона копии по умолчанию: заметно, но не закрывает пол-карточки. */
const DEFAULT_SIZE = 60;

/**
 * Сколько копий может лететь одновременно. Больше — это уже не «вау», а рябь:
 * при серии быстрых тапов самые старые слоты снимаем с экрана (их onLand при
 * этом отрабатывает на размонтировании, товар не теряется).
 */
const MAX_FLIGHTS = 3;

interface FlightSlot {
  id: number;
  image: string | null;
  size: number;
  /** Держим в состоянии, а не в ref: рендер не имеет права читать ref'ы. */
  source: AnimatedRef<View>;
}

export interface FlyToCartProviderProps {
  children: ReactNode;
}

/**
 * Оверлей полёта «товар → корзина».
 *
 * Ставится как можно выше по дереву (идеально — в корневом layout, над
 * табами): хост растянут на всю свою область и рисует копии поверх контента,
 * не перехватывая касания (pointerEvents="none"). Ниже по дереву любая
 * карточка и любой экран зовут полёт через useFlyToCart().
 */
export function FlyToCartProvider({ children }: FlyToCartProviderProps) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const host = useAnimatedRef<View>();
  const [flights, setFlights] = useState<FlightSlot[]>([]);

  // колбэки приземления в ref: они не участвуют в рендере, и лишний
  // ре-рендер оверлея из-за них не нужен
  const landings = useRef(new Map<number, () => void>());
  const open = useRef(new Set<number>());
  const nextId = useRef(0);

  const target = useMemo(
    () => cartTarget(width, height, insets.bottom),
    [width, height, insets.bottom],
  );

  const finish = useCallback((id: number) => {
    // набор открытых полётов — он же защита от повторного вызова: приземление
    // может прийти и из анимации, и из размонтирования слота
    if (!open.current.delete(id)) return;
    const onLand = landings.current.get(id);
    landings.current.delete(id);
    onLand?.();
    setFlights((list) => list.filter((flight) => flight.id !== id));
  }, []);

  const fly = useCallback<FlyToCart>(
    ({ source, image, size = DEFAULT_SIZE, onLand }) => {
      if (reduced) {
        // Reduce Motion: перелёта нет вовсе (HIG просит заменять перемещения
        // затуханием), но результат обязан наступить немедленно — иначе
        // пользователь остаётся и без обратной связи, и без товара.
        onLand?.();
        return;
      }

      const id = nextId.current;
      nextId.current += 1;
      open.current.add(id);
      if (onLand) landings.current.set(id, onLand);

      setFlights((list) => {
        const next = [...list, { id, image, size, source }];
        // лишние слоты просто снимаем с экрана; их onLand вызовет размонтирование
        return next.length > MAX_FLIGHTS ? next.slice(next.length - MAX_FLIGHTS) : next;
      });
    },
    [reduced],
  );

  return (
    <FlyToCartContext.Provider value={fly}>
      <View style={styles.root}>
        {children}

        <Animated.View
          ref={host}
          // collapsable={false} обязателен: без него RN схлопывает контейнер
          // без собственного оформления, и measure() вернёт null
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          {flights.map((flight) => (
            <FlyingItem
              key={flight.id}
              id={flight.id}
              image={flight.image}
              size={flight.size}
              source={flight.source}
              host={host}
              target={target}
              onDone={finish}
            />
          ))}
        </Animated.View>
      </View>
    </FlyToCartContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
