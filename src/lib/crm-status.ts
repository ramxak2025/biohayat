import type { CrmDeliveryStatus } from "@prisma/client";

export const CRM_STATUS: Record<CrmDeliveryStatus, { label: string; tone: "green" | "red" | "amber" }> = {
  PENDING: { label: "Ожидает отправки", tone: "amber" },
  PROCESSING: { label: "Отправляется", tone: "amber" },
  RETRY: { label: "Ожидает повтора", tone: "amber" },
  DELIVERED: { label: "В CRM Хаят", tone: "green" },
  FAILED: { label: "Нужна проверка", tone: "red" },
};
