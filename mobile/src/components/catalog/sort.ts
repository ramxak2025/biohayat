import { ActionSheetIOS, Platform } from "react-native";

/**
 * Сортировка выдачи каталога.
 *
 * Значения — ровно те, что принимает GET /products?sort=… (контракт зафиксирован
 * с бэкендом). Ничего локально не сортируем: в списке лежит только подгруженная
 * часть из 119 товаров, и «сначала дешёвые» в пределах первой страницы — это
 * враньё покупателю. Неизвестное значение сервер игнорирует и отдаёт "popular",
 * поэтому старые клиенты не ломаются, а мы можем добавлять варианты без релиза.
 */
export type CatalogSort = "popular" | "price_asc" | "price_desc" | "discount" | "new";

/** Серверное поведение по умолчанию: isFeatured desc, sortOrder asc. */
export const DEFAULT_SORT: CatalogSort = "popular";

export interface SortOption {
  value: CatalogSort;
  /** Полная формулировка — для списка вариантов. */
  title: string;
  /**
   * Короткая — для кнопки в панели: там рядом стоит счётчик найденного и
   * «Фильтры», и длинная подпись выдавила бы их за край экрана.
   */
  short: string;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { value: "popular", title: "Популярные", short: "Популярные" },
  { value: "price_asc", title: "Сначала дешёвые", short: "Дешевле" },
  { value: "price_desc", title: "Сначала дорогие", short: "Дороже" },
  { value: "discount", title: "Больше скидка", short: "Скидка" },
  { value: "new", title: "Новинки", short: "Новинки" },
];

const BY_VALUE = new Map(SORT_OPTIONS.map((option) => [option.value, option]));

export function isCatalogSort(value: string): value is CatalogSort {
  return BY_VALUE.has(value as CatalogSort);
}

export function sortTitle(value: CatalogSort): string {
  return BY_VALUE.get(value)?.title ?? SORT_OPTIONS[0].title;
}

export function sortShortLabel(value: CatalogSort): string {
  return BY_VALUE.get(value)?.short ?? SORT_OPTIONS[0].short;
}

/**
 * Нативный лист выбора сортировки.
 *
 * Именно ActionSheetIOS, а не свой модальный список: это системный UIAlertController —
 * он сам рисует Liquid Glass, сам тянется за Dynamic Type, сам озвучивается
 * VoiceOver и закрывается свайпом. HIG (Action sheets) относит к ним ровно такой
 * случай: «a short list of choices related to the current context».
 *
 * Возвращает false, если системного листа нет (не iOS) — вызывающий код должен
 * показать те же варианты иначе; у нас это секция «Сортировка» в листе фильтров.
 */
export function openSortActionSheet(
  current: CatalogSort,
  onSelect: (sort: CatalogSort) => void,
  userInterfaceStyle: "light" | "dark",
): boolean {
  if (Platform.OS !== "ios") return false;

  // Системный лист не умеет галочек и не подсвечивает выбранное, а человек
  // должен видеть, где он сейчас стоит. Ставим галочку прямо в подпись —
  // приём распространённый и VoiceOver читает её как «галочка», то есть по делу.
  const titles = SORT_OPTIONS.map((option) =>
    option.value === current ? `✓ ${option.title}` : option.title,
  );

  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: "Сортировка",
      options: [...titles, "Отмена"],
      cancelButtonIndex: titles.length,
      userInterfaceStyle,
    },
    (index) => {
      if (index < 0 || index >= SORT_OPTIONS.length) return;
      const option = SORT_OPTIONS[index];
      if (option.value !== current) onSelect(option.value);
    },
  );

  return true;
}
