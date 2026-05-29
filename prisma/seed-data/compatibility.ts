// Базовый набор общеизвестных правил совместимости компонентов БАД.
// НЕ является медицинской рекомендацией — носит справочный характер.
// Редактируется в админке (Совместимость).

export interface SeedRule {
  componentA: string;
  componentB: string;
  type: "SYNERGY" | "ANTAGONIST" | "CAUTION";
  note: string;
}

export const seedCompatibility: SeedRule[] = [
  { componentA: "Витамин D", componentB: "Витамин K2", type: "SYNERGY", note: "K2 направляет кальций в кости, дополняя действие витамина D." },
  { componentA: "Витамин D", componentB: "Кальций", type: "SYNERGY", note: "Витамин D улучшает усвоение кальция." },
  { componentA: "Витамин D", componentB: "Магний", type: "SYNERGY", note: "Магний необходим для активации витамина D." },
  { componentA: "Железо", componentB: "Витамин C", type: "SYNERGY", note: "Витамин C повышает усвоение негемового железа." },
  { componentA: "Омега-3", componentB: "Витамин E", type: "SYNERGY", note: "Витамин E защищает жирные кислоты от окисления." },
  { componentA: "Витамин A", componentB: "Витамин E", type: "SYNERGY", note: "Жирорастворимые витамины-антиоксиданты работают в связке." },
  { componentA: "Магний", componentB: "Витамин B6", type: "SYNERGY", note: "B6 улучшает усвоение магния клетками." },
  { componentA: "Йод", componentB: "Селен", type: "SYNERGY", note: "Поддерживают работу щитовидной железы вместе." },

  { componentA: "Кальций", componentB: "Железо", type: "ANTAGONIST", note: "Конкурируют за усвоение — принимайте в разное время." },
  { componentA: "Кальций", componentB: "Цинк", type: "ANTAGONIST", note: "Высокие дозы кальция снижают усвоение цинка." },
  { componentA: "Цинк", componentB: "Железо", type: "ANTAGONIST", note: "Конкурируют за всасывание в больших дозах — разнесите приём." },

  { componentA: "Кальций", componentB: "Магний", type: "CAUTION", note: "В больших дозах конкурируют; лучше принимать раздельно." },
  { componentA: "Цинк", componentB: "Медь", type: "CAUTION", note: "Длительный приём высоких доз цинка снижает уровень меди." },
];
