import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";

import { useCart, type CartLine } from "@/store/cart";

/** Столько живёт плашка «Вернуть» — как системный undo в Почте. */
const UNDO_MS = 5000;

export interface RemovedLine {
  line: CartLine;
  /** Позиция в списке до удаления: undo обязан вернуть товар на своё место. */
  index: number;
  /** Растёт при каждом удалении — по нему перезапускается анимация плашки. */
  seq: number;
}

/** Вставка по индексу живёт в сторе: persist сам запишет результат в AsyncStorage. */
const restoreLine = (line: CartLine, index: number) => useCart.getState().restore(line, index);

export interface CartUndo {
  removed: RemovedLine | null;
  removeLine: (line: CartLine) => void;
  undo: () => void;
  dismiss: () => void;
}

/** Удаление позиции с возможностью отмены в течение 5 секунд. */
export function useCartUndo(): CartUndo {
  const [removed, setRemoved] = useState<RemovedLine | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const stopTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const removeLine = useCallback(
    (line: CartLine) => {
      const index = useCart.getState().lines.findIndex((item) => item.id === line.id);
      if (index < 0) return;

      useCart.getState().remove(line.id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      seq.current += 1;
      setRemoved({ line, index, seq: seq.current });

      stopTimer();
      timer.current = setTimeout(() => setRemoved(null), UNDO_MS);
    },
    [stopTimer],
  );

  const undo = useCallback(() => {
    if (!removed) return;
    restoreLine(removed.line, removed.index);
    void Haptics.selectionAsync();
    stopTimer();
    setRemoved(null);
  }, [removed, stopTimer]);

  const dismiss = useCallback(() => {
    stopTimer();
    setRemoved(null);
  }, [stopTimer]);

  return { removed, removeLine, undo, dismiss };
}
