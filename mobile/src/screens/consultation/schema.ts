import { z } from "zod";

import type { ConsultationStatus } from "@/api/types";
import type { BadgeTone } from "@/components/ui";
import { isValidPhone } from "@/lib/format";

/** Сервер режет сообщение на 2000 символах (api-contract §4.20) — считаем тот же лимит. */
export const MESSAGE_LIMIT = 2000;

/** Темы с сайта: обычный select там, чипсы здесь — на телефоне это быстрее. */
export const TOPICS: readonly string[] = [
  "Подбор БАД",
  "Совместимость",
  "Похудение",
  "Иммунитет",
  "Другое",
];

/**
 * Правила строже серверных там, где это помогает нутрициологу: сервер примет и
 * один символ, но заявка «?» бесполезна обеим сторонам.
 */
export const consultationSchema = z.object({
  topic: z.string().max(200),
  name: z
    .string()
    .trim()
    .min(2, "Укажите имя — минимум 2 символа")
    .max(120, "Имя не длиннее 120 символов"),
  phone: z.string().refine(isValidPhone, "Введите номер полностью: +7 999 000-00-00"),
  message: z
    .string()
    .trim()
    .min(10, "Опишите вопрос подробнее — минимум 10 символов")
    .max(MESSAGE_LIMIT, `Не больше ${MESSAGE_LIMIT} символов`),
});

export type ConsultationValues = z.infer<typeof consultationSchema>;

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const STATUS_META: Record<ConsultationStatus, StatusMeta> = {
  NEW: { label: "Новая", tone: "brand" },
  IN_PROGRESS: { label: "В работе", tone: "accent" },
  DONE: { label: "Завершена", tone: "success" },
  CANCELLED: { label: "Отменена", tone: "neutral" },
};
