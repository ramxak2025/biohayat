import { useEffect, useState } from "react";

/**
 * Значение, догоняющее источник с задержкой: каждая новая буква сбрасывает таймер.
 * Нужен, чтобы подсказки не дёргали сеть на каждый символ.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
