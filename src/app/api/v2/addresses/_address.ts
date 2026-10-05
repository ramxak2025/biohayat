import type { CustomerAddress } from "@prisma/client";

/**
 * Общие хелперы адресной книги.
 *
 * Лежит рядом с роутами, а не в src/lib/api/serializers.ts, сознательно:
 * сериализаторы сейчас правятся параллельно другими задачами, а этот модуль
 * нужен только адресам и заказам (POST /orders собирает плоскую строку адреса).
 * Файл не является роутом — в app-router'е роутом считается только route.ts.
 */

/** Адрес в ответе API. Форма совпадает с карточкой адреса на сайте. */
export function serializeAddress(a: CustomerAddress) {
  return {
    id: a.id,
    label: a.label,
    recipient: a.recipient,
    phone: a.phone,
    city: a.city,
    street: a.street,
    house: a.house,
    apartment: a.apartment,
    comment: a.comment,
    isDefault: a.isDefault,
    /** Готовая однострочная запись — то же, что уходит в Order.address. */
    line: formatAddressLine(a),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

type CustomerAddressParts = Pick<CustomerAddress, "city" | "street" | "house" | "apartment" | "comment">;

/**
 * Плоская строка адреса для заказа: «Город, Улица, д. 1, кв. 2 (домофон 45)».
 * Повторяет порядок полей карточки адреса в ЛК (addresses-view.tsx),
 * чтобы менеджер в Битриксе видел то же, что покупатель в приложении.
 */
export function formatAddressLine(a: CustomerAddressParts): string {
  const line = [
    a.city,
    a.street,
    a.house ? `д. ${a.house}` : null,
    a.apartment ? `кв. ${a.apartment}` : null,
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  const comment = a.comment?.trim();
  return comment ? `${line} (${comment})` : line;
}
