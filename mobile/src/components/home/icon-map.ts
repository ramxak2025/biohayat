import type { SFSymbol } from "expo-symbols";

/**
 * Категории и таксономия приходят с бэкенда с именем иконки lucide-react —
 * это словарь веба. На iOS рисуем родные SF Symbols: они масштабируются вместе
 * с Dynamic Type, наследуют вес текста и выглядят системно.
 *
 * Пары подобраны по смыслу, а не по форме: «Мужчинам» (Mars) — это не планета,
 * а раздел каталога, поэтому берём фигуру человека, а не астрономический знак
 * (в SF Symbols его попросту нет).
 */
const LUCIDE_TO_SF: Record<string, SFSymbol> = {
  // категории каталога
  Pill: "pills.fill",
  ShieldPlus: "checkmark.shield.fill",
  Shield: "checkmark.shield.fill",
  Flame: "flame.fill",
  Mars: "figure.stand",
  Venus: "figure.dress.line.vertical.figure",
  Baby: "figure.and.child.holdinghands",
  Dumbbell: "dumbbell.fill",
  BrainCircuit: "brain.head.profile",
  Brain: "brain.head.profile",
  Soup: "fork.knife",
  Droplets: "drop.fill",
  Droplet: "oilcan.fill",
  Bone: "figure.flexibility",
  Activity: "waveform.path.ecg",
  Sparkles: "sparkles",
  Hexagon: "hexagon.fill",
  FlaskConical: "flask.fill",
  Leaf: "leaf.fill",

  // оси «кому» и «зачем»
  Zap: "bolt.fill",
  Moon: "moon.stars.fill",
  HeartPulse: "heart.fill",
  Heart: "heart.fill",

  // запас: иконки, которые админка может проставить вручную
  Sun: "sun.max.fill",
  Star: "star.fill",
  Package: "shippingbox.fill",
  Truck: "truck.box.fill",
  ShoppingBag: "bag.fill",
  Apple: "carrot.fill",
  Carrot: "carrot.fill",
  Wind: "wind",
  Stethoscope: "stethoscope",
  TestTube: "testtube.2",
  Microscope: "microbe.fill",
  Eye: "eye.fill",
  Bed: "bed.double.fill",
  Scale: "scalemass.fill",
};

/** Нейтральный дефолт: лист — брендовый знак ХАЯТ, подходит любой категории. */
export const FALLBACK_SYMBOL: SFSymbol = "leaf.fill";

export function sfSymbolFor(lucideName: string | null | undefined): SFSymbol {
  if (!lucideName) return FALLBACK_SYMBOL;
  return LUCIDE_TO_SF[lucideName] ?? FALLBACK_SYMBOL;
}
