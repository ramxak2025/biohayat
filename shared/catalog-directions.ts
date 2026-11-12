export const CATALOG_DIRECTIONS = [
  { id: "sunna", path: "/sunna", label: "Сунна", summary: "Мёд, масла, травы и порошки" },
  { id: "semya", path: "/semya", label: "Семья", summary: "Сиропы и капли" },
  { id: "osnova", path: "/osnova-zdorovya", label: "Основа здоровья", summary: "Витамины, минералы, сон, красота" },
  { id: "sport", path: "/sport", label: "Спорт", summary: "Креатин и добавки для активного образа жизни" },
] as const;

export type CatalogDirection = (typeof CATALOG_DIRECTIONS)[number];
export type CatalogDirectionId = CatalogDirection["id"];

export function findCatalogDirection(id: unknown): CatalogDirection | undefined {
  return CATALOG_DIRECTIONS.find((direction) => direction.id === id);
}

export function productDirection(id: unknown): CatalogDirection {
  return findCatalogDirection(id) ?? CATALOG_DIRECTIONS[2];
}
