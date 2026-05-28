// Основные категории каталога (навигация по системам/группам организма).

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  icon: string; // имя иконки lucide-react
  sortOrder: number;
}

export const seedCategories: SeedCategory[] = [
  {
    slug: "vitaminy-mineraly",
    name: "Витамины и минералы",
    description: "Витамины D3, C, A, E, цинк, магний, железо и минеральные комплексы для всей семьи.",
    icon: "Pill",
    sortOrder: 10,
  },
  {
    slug: "immunitet",
    name: "Иммунитет",
    description: "Натуральные добавки для укрепления иммунитета и защиты организма.",
    icon: "ShieldPlus",
    sortOrder: 20,
  },
  {
    slug: "dlya-pohudeniya",
    name: "Для похудения",
    description: "Жиросжигатели, средства для контроля веса и нормализации обмена веществ.",
    icon: "Flame",
    sortOrder: 30,
  },
  {
    slug: "dlya-muzhchin",
    name: "Для мужчин",
    description: "Добавки для мужского здоровья, энергии и репродуктивной системы.",
    icon: "Mars",
    sortOrder: 40,
  },
  {
    slug: "dlya-zhenschin",
    name: "Для женщин",
    description: "Поддержка женского здоровья, гормонального баланса и красоты.",
    icon: "Venus",
    sortOrder: 50,
  },
  {
    slug: "dlya-detey",
    name: "Для детей",
    description: "Безопасные витамины и добавки для детей: Омега-3, D3 и иммунитет.",
    icon: "Baby",
    sortOrder: 60,
  },
  {
    slug: "sportivnoe-pitanie",
    name: "Спортивное питание",
    description: "Коллаген, аминокислоты и добавки для активных и спортсменов.",
    icon: "Dumbbell",
    sortOrder: 70,
  },
  {
    slug: "nervnaya-sistema",
    name: "Нервная система",
    description: "Поддержка нервной системы, сна, памяти и устойчивости к стрессу.",
    icon: "BrainCircuit",
    sortOrder: 80,
  },
  {
    slug: "zhkt",
    name: "ЖКТ и пищеварение",
    description: "Добавки для здоровья желудочно-кишечного тракта и микрофлоры.",
    icon: "Soup",
    sortOrder: 90,
  },
  {
    slug: "mochepolovaya-sistema",
    name: "Мочеполовая система",
    description: "Средства для здоровья почек, мочевого пузыря и мочеполовой системы.",
    icon: "Droplets",
    sortOrder: 100,
  },
  {
    slug: "oporno-dvigatelnyy",
    name: "Суставы и связки",
    description: "Глюкозамин, хондроитин, гиалуроновая кислота для суставов и ОДА.",
    icon: "Bone",
    sortOrder: 110,
  },
  {
    slug: "endokrinnaya",
    name: "Эндокринная система",
    description: "Поддержка щитовидной железы и гормонального баланса.",
    icon: "Activity",
    sortOrder: 120,
  },
  {
    slug: "krasota",
    name: "Красота и кожа",
    description: "Коллаген, биотин, мыло и средства для кожи, волос и ногтей.",
    icon: "Sparkles",
    sortOrder: 130,
  },
  {
    slug: "masla",
    name: "Масла",
    description: "Масло чёрного тмина, кунжутное, кыст аль-хинди и другие натуральные масла.",
    icon: "Droplet",
    sortOrder: 140,
  },
  {
    slug: "med",
    name: "Мёд",
    description: "Натуральный мёд: липовый, разнотравье, сидра — польза и витамины.",
    icon: "Hexagon",
    sortOrder: 150,
  },
  {
    slug: "balzamy",
    name: "Бальзамы",
    description: "Лечебно-профилактические бальзамы ХАЯТ для разных систем организма.",
    icon: "FlaskConical",
    sortOrder: 160,
  },
  {
    slug: "semena-travy",
    name: "Семена и травы",
    description: "Чёрный тмин, хильба, имбирь, корень зарира и другие травы и семена.",
    icon: "Leaf",
    sortOrder: 170,
  },
];
