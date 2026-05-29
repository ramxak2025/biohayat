import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatMoney, normalizePhone } from "@/lib/utils";
import type { Order, OrderItem } from "@prisma/client";

/**
 * Интеграция с Битрикс24 через входящий вебхук REST.
 * URL вида: https://<portal>.bitrix24.ru/rest/<user>/<token>/
 * Метод crm.lead.add создаёт лид в воронке CRM.
 */

interface BitrixResponse<T = unknown> {
  result?: T;
  error?: string;
  error_description?: string;
}

function buildEndpoint(webhookUrl: string, method: string): string {
  const base = webhookUrl.endsWith("/") ? webhookUrl : webhookUrl + "/";
  return `${base}${method}.json`;
}

async function callBitrix<T>(
  webhookUrl: string,
  method: string,
  params: Record<string, unknown>,
): Promise<BitrixResponse<T>> {
  const res = await fetch(buildEndpoint(webhookUrl, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    // лиды не кешируем
    cache: "no-store",
  });
  const data = (await res.json()) as BitrixResponse<T>;
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || `HTTP ${res.status}`);
  }
  return data;
}

type OrderWithItems = Order & { items: OrderItem[] };

/** Формирует читаемый комментарий к лиду из состава заказа. */
function buildComment(order: OrderWithItems): string {
  const lines: string[] = [`Заявка №${order.number} с сайта biohayat.ru`, ""];
  if (order.items.length) {
    lines.push("Состав заказа:");
    for (const it of order.items) {
      lines.push(`• ${it.name} × ${it.qty} — ${formatMoney(it.priceKopecks * it.qty)}`);
    }
    lines.push("");
    lines.push(`Итого: ${formatMoney(order.totalKopecks)}`);
  }
  if (order.address) lines.push(`\nАдрес доставки: ${order.address}`);
  if (order.comment) lines.push(`\nКомментарий: ${order.comment}`);
  if (order.source) lines.push(`\nИсточник: ${order.source}`);
  return lines.join("\n");
}

/**
 * Отправляет заказ в Битрикс24 как лид и сохраняет результат в БД.
 * Безопасно: при отключённой интеграции или отсутствии URL — помечает DISABLED.
 */
export async function syncOrderToBitrix(orderId: string): Promise<void> {
  const settings = await getSettings();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return;

  if (!settings.bitrixEnabled || !settings.bitrixWebhookUrl) {
    await prisma.order.update({
      where: { id: orderId },
      data: { bitrixSyncStatus: "DISABLED" },
    });
    return;
  }

  const fields: Record<string, unknown> = {
    TITLE: `Заявка №${order.number} — ${order.customerName}`,
    NAME: order.customerName,
    SOURCE_ID: "WEB",
    OPENED: "Y",
    STATUS_ID: "NEW",
    COMMENTS: buildComment(order),
    PHONE: [{ VALUE: normalizePhone(order.phone), VALUE_TYPE: "WORK" }],
    OPPORTUNITY: order.totalKopecks / 100,
    CURRENCY_ID: "RUB",
  };
  if (order.email) {
    fields.EMAIL = [{ VALUE: order.email, VALUE_TYPE: "WORK" }];
  }
  if (order.address) {
    fields.ADDRESS = order.address;
  }
  if (settings.bitrixResponsibleId) {
    fields.ASSIGNED_BY_ID = settings.bitrixResponsibleId;
  }

  try {
    const data = await callBitrix<number>(settings.bitrixWebhookUrl, "crm.lead.add", {
      fields,
      params: { REGISTER_SONET_EVENT: "Y" },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: {
        bitrixLeadId: data.result ? String(data.result) : null,
        bitrixSyncStatus: "SYNCED",
        bitrixError: null,
      },
    });
  } catch (err) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        bitrixSyncStatus: "FAILED",
        bitrixError: err instanceof Error ? err.message : "Неизвестная ошибка",
      },
    });
  }
}

/**
 * Отправляет заявку на консультацию нутрициолога в Битрикс24 как лид.
 * По аналогии с syncOrderToBitrix: при выключенной интеграции — DISABLED, при ошибке — FAILED.
 */
export async function syncConsultationToBitrix(consultationId: string): Promise<void> {
  const settings = await getSettings();
  const consultation = await prisma.consultationRequest.findUnique({
    where: { id: consultationId },
  });
  if (!consultation) return;

  if (!settings.bitrixEnabled || !settings.bitrixWebhookUrl) {
    await prisma.consultationRequest.update({
      where: { id: consultationId },
      data: { bitrixSyncStatus: "DISABLED" },
    });
    return;
  }

  // Формируем читаемый комментарий из темы и сообщения.
  const commentLines: string[] = ["Заявка на консультацию нутрициолога с сайта biohayat.ru", ""];
  if (consultation.topic) commentLines.push(`Тема: ${consultation.topic}`);
  if (consultation.message) commentLines.push(`\nСообщение:\n${consultation.message}`);

  const fields: Record<string, unknown> = {
    TITLE: `Консультация нутрициолога — ${consultation.name}`,
    NAME: consultation.name,
    SOURCE_ID: "WEB",
    OPENED: "Y",
    STATUS_ID: "NEW",
    COMMENTS: commentLines.join("\n"),
    PHONE: [{ VALUE: normalizePhone(consultation.phone), VALUE_TYPE: "WORK" }],
  };
  if (settings.bitrixResponsibleId) {
    fields.ASSIGNED_BY_ID = settings.bitrixResponsibleId;
  }

  try {
    const data = await callBitrix<number>(settings.bitrixWebhookUrl, "crm.lead.add", {
      fields,
      params: { REGISTER_SONET_EVENT: "Y" },
    });
    await prisma.consultationRequest.update({
      where: { id: consultationId },
      data: {
        bitrixLeadId: data.result ? String(data.result) : null,
        bitrixSyncStatus: "SYNCED",
        bitrixError: null,
      },
    });
  } catch (err) {
    await prisma.consultationRequest.update({
      where: { id: consultationId },
      data: {
        bitrixSyncStatus: "FAILED",
        bitrixError: err instanceof Error ? err.message : "Неизвестная ошибка",
      },
    });
  }
}

/** Проверка вебхука из админки (метод profile). */
export async function testBitrixConnection(
  webhookUrl: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const data = await callBitrix<{ NAME?: string; LAST_NAME?: string }>(
      webhookUrl,
      "profile",
      {},
    );
    const name = [data.result?.NAME, data.result?.LAST_NAME].filter(Boolean).join(" ");
    return { ok: true, message: `Подключение успешно${name ? `: ${name}` : ""}.` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Не удалось подключиться.",
    };
  }
}
