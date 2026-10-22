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
    title: "Значимое взаимодействие",
    short: "Конфликт",
    icon: "xmark.octagon.fill",
    badge: "danger",
    hint: "Читайте условия конкретного взаимодействия. Разнос по времени помогает не всегда.",
  },
  CAUTION: {
    title: "Учитывайте условия",
    short: "Осторожно",
    icon: "exclamationmark.triangle.fill",
    badge: "accent",
    hint: "Значение могут иметь доза, длительность, форма вещества и состояние здоровья.",
  },
  SYNERGY: {
    title: "Связь усвоения",
    short: "Усвоение",
    icon: "checkmark.seal.fill",
    badge: "success",
    hint: "Физиологическая связь не означает, что оба средства нужны или их следует принимать одновременно.",
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
