/**
 * Строительные блоки личного кабинета. Единая точка импорта для экранов
 * account / orders / order / favorites / profile.
 */
export { AccountHero, type AccountHeroProps } from "./account-hero";
export { BonusCard, type BonusCardProps } from "./bonus-card";
export { ContactsCard, type ContactsCardProps } from "./contacts-card";
export { MenuGroup, type MenuGroupProps } from "./menu-group";
export { MenuRow, MENU_ROW_INSET, type MenuRowProps, type MenuRowTone } from "./menu-row";
export { OrderCard, type OrderCardProps } from "./order-card";
export { OrderItems, type OrderItemsProps } from "./order-items";
export { OrderProgress, type OrderProgressProps } from "./order-progress";
export {
  canCancelOrder,
  orderStatusLabel,
  orderStepIndex,
  ORDER_STATUS_ICON,
  ORDER_STATUS_TONE,
} from "./order-status";
export { LEGAL_URL, mailHref, openExternalUrl, telHref, useOpenBrowser } from "./links";
export { sendSupportRequest } from "./support";
export { useCachedProducts } from "./use-cached-products";
export { ordersCountLabel, useOrders, ORDERS_PAGE_SIZE } from "./use-orders";
