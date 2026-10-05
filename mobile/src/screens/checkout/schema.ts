import { z } from "zod";

import { isValidPhone } from "@/lib/format";

/**
 * Правила один-в-один с серверной схемой `POST /orders` (api-contract §4.16):
 * имя 2..120, телефон ≥ 10 цифр, адрес ≤ 500, комментарий ≤ 1000. Держим их
 * здесь, чтобы форма ругалась раньше сети, а не после 400-го.
 *
 * Чего в форме сознательно нет:
 *   • e-mail — берём из профиля, лишнее поле на пути к заявке;
 *   • `consent` — согласие даётся нажатием кнопки (строка под ней), а в теле
 *     запроса всё равно уходит `consent: true`, иначе сервер заказ не примет.
 */
export const checkoutSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Укажите имя — минимум 2 символа")
    .max(120, "Имя не длиннее 120 символов"),
  phone: z.string().refine(isValidPhone, "Введите номер полностью: +7 999 000-00-00"),
  address: z.string().trim().max(500, "Адрес не длиннее 500 символов"),
  comment: z.string().trim().max(1000, "Комментарий не длиннее 1000 символов"),
});

export type CheckoutValues = z.infer<typeof checkoutSchema>;

/** Количество в заказе сервер принимает целым 1..99 — обрезаем перед отправкой. */
export const clampQty = (qty: number): number =>
  Math.min(99, Math.max(1, Math.round(qty)));
