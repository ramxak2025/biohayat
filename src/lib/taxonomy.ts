// Таксономия каталога по трём осям:
//  1) Категории (модель Category) — тип/система (уже есть)
//  2) Аудитория (audiences) — кому
//  3) Цель применения (goals) — зачем
// Используется в каталоге, фильтрах и при тегировании товаров (seed).

import type { LucideIcon } from "lucide-react";
import {
  Mars, Venus, Baby, ShieldPlus, Flame, Dumbbell, Zap, Sparkles,
  Bone, Moon, Soup, HeartPulse,
} from "lucide-react";

export interface TaxonomyItem {
  slug: string;
  name: string;
  icon: LucideIcon;
  /** ключевые слова для авто-тегирования товаров */
  keywords: string[];
}

export const AUDIENCES: TaxonomyItem[] = [
  { slug: "men", name: "Мужчинам", icon: Mars, keywords: ["муж", "тесто", "andro", "спермы", "потенц", "простат"] },
  { slug: "women", name: "Женщинам", icon: Venus, keywords: ["жен", "women", "менстру", "вагинал", "мио", "грудн"] },
  { slug: "kids", name: "Детям", icon: Baby, keywords: ["детск", "kids", "ребён", "ребен", "дет."] },
];

export const GOALS: TaxonomyItem[] = [
  { slug: "immunity", name: "Иммунитет", icon: ShieldPlus, keywords: ["иммун", "тмин", "vitamin c", "витамин c", "кыст", "antibiot", "антибиот", "вирус", "простуд", "гаймор"] },
  { slug: "weight-loss", name: "Похудение", icon: Flame, keywords: ["похуд", "жиросжиг", "no fat", "q10", "вес", "уксус", "хром", "chromium", "тахсис"] },
  { slug: "sport", name: "Спорт и масса", icon: Dumbbell, keywords: ["спорт", "масс", "коллаген", "collagen", "амино", "белок", "протеин"] },
  { slug: "energy", name: "Энергия и тонус", icon: Zap, keywords: ["энерг", "тонус", "vitamix", "energy", "магни", "b6", "железо", "iron", "анеми"] },
  { slug: "beauty", name: "Красота и кожа", icon: Sparkles, keywords: ["кож", "волос", "красот", "биотин", "biotin", "ретинол", "мыло", "vitamin e", "витамин e", "гиалур", "ногт"] },
  { slug: "joints", name: "Суставы", icon: Bone, keywords: ["сустав", "глюкозамин", "хондроитин", "msm", "гиалур", "ода", "опорно", "кост"] },
  { slug: "calm", name: "Сон и нервы", icon: Moon, keywords: ["нерв", "сон", "стресс", "gaba", "гамк", "5-htp", "dmae", "гинкго", "ginkgo", "доксилин", "антидепрес"] },
  { slug: "digestion", name: "Пищеварение", icon: Soup, keywords: ["желуд", "кишеч", "жкт", "запор", "панкреатин", "микрофлор", "глист", "парази", "пищевар", "акорин"] },
  { slug: "heart", name: "Сердце и сосуды", icon: HeartPulse, keywords: ["серд", "сосуд", "давлен", "кров", "omega", "омега", "кардио", "холестер", "бальзам №6", "бальзам №7"] },
];

export function audienceName(slug: string): string | undefined {
  return AUDIENCES.find((a) => a.slug === slug)?.name;
}
export function goalName(slug: string): string | undefined {
  return GOALS.find((g) => g.slug === slug)?.name;
}

// ── Компоненты (нутриенты) для проверки совместимости ──
export const NUTRIENT_KEYWORDS: Record<string, string[]> = {
  "Витамин D": ["d3", "d 3", "витамин d", "vitamin d"],
  "Витамин K2": ["k2", "к2"],
  "Витамин C": ["vitamin c", "витамин c", "витамин с"],
  "Витамин A": ["vitamin a", "витамин a", "ретинол"],
  "Витамин E": ["vitamin e", "витамин e", "витамин е"],
  "Витамин B6": ["b6", "в6"],
  Кальций: ["кальци", "calcium"],
  Магний: ["магни", "magnesium"],
  Цинк: ["цинк", "zinc"],
  Железо: ["железо", "iron"],
  Хром: ["хром", "chromium"],
  Йод: ["йод", "iodine"],
  Селен: ["селен", "selenium"],
  "Омега-3": ["омега", "omega"],
  Коллаген: ["коллаген", "collagen"],
  Биотин: ["биотин", "biotin"],
  Гинкго: ["гинкго", "ginkgo"],
};

/** Тегирует товар по названию: возвращает {audiences, goals, nutrients}. */
export function tagProduct(name: string, categorySlug?: string): {
  audiences: string[];
  goals: string[];
  nutrients: string[];
} {
  const text = name.toLowerCase();
  const audiences = new Set<string>();
  const goals = new Set<string>();
  const nutrients = new Set<string>();

  for (const a of AUDIENCES) if (a.keywords.some((k) => text.includes(k))) audiences.add(a.slug);
  for (const g of GOALS) if (g.keywords.some((k) => text.includes(k))) goals.add(g.slug);
  for (const [comp, kws] of Object.entries(NUTRIENT_KEYWORDS))
    if (kws.some((k) => text.includes(k))) nutrients.add(comp);

  // дополняем по категории
  const byCat: Record<string, { a?: string; g?: string }> = {
    "dlya-muzhchin": { a: "men" },
    "dlya-zhenschin": { a: "women" },
    "dlya-detey": { a: "kids" },
    "dlya-pohudeniya": { g: "weight-loss" },
    immunitet: { g: "immunity" },
    "sportivnoe-pitanie": { g: "sport" },
    "nervnaya-sistema": { g: "calm" },
    zhkt: { g: "digestion" },
    "oporno-dvigatelnyy": { g: "joints" },
    krasota: { g: "beauty" },
  };
  if (categorySlug && byCat[categorySlug]) {
    const m = byCat[categorySlug];
    if (m.a) audiences.add(m.a);
    if (m.g) goals.add(m.g);
  }

  return { audiences: [...audiences], goals: [...goals], nutrients: [...nutrients] };
}
