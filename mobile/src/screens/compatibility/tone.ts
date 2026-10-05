import type { SFSymbol } from "expo-symbols";

import type { CompatibilityType } from "@/api/types";
import type { BadgeTone } from "@/components/ui";
import { useColors } from "@/theme";

export interface GroupMeta {
  title: string;
  /** Короткая подпись для легенды полоски-итога — «Нельзя вместе» туда не влезает. */
  short: string;
  icon: SFSymbol;
  badge: BadgeTone;
  hint: string;
}

/** Цветовая семантика: красное — нельзя, янтарное — осторожно, зелёное — синергия. */
export const GROUP_META: Record<CompatibilityType, GroupMeta> = {
  ANTAGONIST: {
    title: "Нельзя вместе",
    short: "Конфликт",
    icon: "xmark.octagon.fill",
    badge: "danger",
    hint: "Разнесите приём: между этими компонентами нужно 2–3 часа.",
  },
  CAUTION: {
    title: "С осторожностью",
    short: "Осторожно",
    icon: "exclamationmark.triangle.fill",
    badge: "accent",
    hint: "Сочетать можно, но лучше в разные приёмы пищи.",
  },
  SYNERGY: {
    title: "Хорошо вместе",
    short: "Синергия",
    icon: "checkmark.seal.fill",
    badge: "success",
    hint: "Усиливают действие друг друга — принимайте в один приём.",
  },
};

export interface GroupTone {
  /** Цвет связи и границы карточки. */
  tint: string;
  /** Мягкая подложка под иконкой — на ней «висит» узел связи. */
  soft: string;
}

/**
 * Один источник цвета для всего экрана: полоска-итог, заголовок группы и дуга
 * между компонентами должны совпадать по оттенку, иначе связь читается как
 * отдельная декорация, а не как продолжение группы.
 */
export function useGroupTones(): Record<CompatibilityType, GroupTone> {
  const colors = useColors();

  return {
    ANTAGONIST: { tint: colors.danger, soft: colors.surfaceSunken },
    CAUTION: { tint: colors.warning, soft: colors.accentSoft },
    SYNERGY: { tint: colors.success, soft: colors.brandSoft },
  };
}
