import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { bitrixGet } from "@/lib/bitrix";
import { rateLimit } from "@/lib/rate-limit";
import type { OrderStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = [
  "NEW", "CONFIRMED", "PAID", "ASSEMBLING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "CANCELLED",
];

/** IP клиента из заголовков прокси (для rate limit). */
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** Токен из Authorization: Bearer или ?token= (обратная совместимость). */
function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return req.nextUrl.searchParams.get("token");
}

/**
 * Приёмник исходящих вебхуков Битрикс24 для синхронизации статуса заказа на сайт.
 *
 * Настройка в Битрикс24: Разработчикам → Исходящий вебхук → события
 * ONCRMDEALUPDATE / ONCRMLEADUPDATE → URL:
 *   https://САЙТ/api/bitrix/webhook?token=ВАШ_ТОКЕН
 * (или заголовок Authorization: Bearer ВАШ_ТОКЕН).
 * Токен и соответствие «стадия → статус» задаются в админке (Настройки → Битрикс24).
 *
 * Также поддерживает прямой JSON для своих сценариев:
 *   POST { "orderNumber": 12, "status": "PAID" }  (или "leadId"/"dealId")
 *
 * Идемпотентность: если входящий статус не меняет текущий статус заказа —
 * отвечаем ok без записи в БД.
 */
export async function POST(req: NextRequest) {
  // Rate limit по IP: не более 60 запросов в минуту
  if (!rateLimit(`bitrix-webhook:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const settings = await getSettings();
  const token = extractToken(req);

  if (!settings.bitrixWebhookToken || token !== settings.bitrixWebhookToken) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  const stageMap = (settings.bitrixStageMap as Record<string, string> | null) || {};

  function mapStatus(stage: string | undefined | null): OrderStatus | null {
    if (!stage) return null;
    const mapped = stageMap[stage];
    return mapped && (VALID_STATUSES as string[]).includes(mapped) ? (mapped as OrderStatus) : null;
  }

  try {
    // 1) Прямой JSON-контракт
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const status = body.status as string | undefined;
      if (status && (VALID_STATUSES as string[]).includes(status)) {
        const where = body.orderNumber
          ? { number: Number(body.orderNumber) }
          : body.dealId
            ? { bitrixDealId: String(body.dealId) }
            : body.leadId
              ? { bitrixLeadId: String(body.leadId) }
              : null;
        if (!where) return NextResponse.json({ error: "no identifier" }, { status: 400 });
        // идемпотентность: не трогаем заказы, у которых статус уже совпадает
        const updated = await prisma.order.updateMany({
          where: { ...where, status: { not: status as OrderStatus } },
          data: { status: status as OrderStatus },
        });
        return NextResponse.json({ ok: true, updated: updated.count });
      }
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    // 2) Формат события Битрикс24 (form-urlencoded)
    const form = await req.formData();
    const event = String(form.get("event") || "");
    const entityId = String(form.get("data[FIELDS][ID]") || form.get("data[FIELDS][id]") || "");
    if (!entityId) return NextResponse.json({ error: "no entity id" }, { status: 400 });

    if (!settings.bitrixWebhookUrl) {
      return NextResponse.json({ error: "webhook url not set" }, { status: 400 });
    }
    const base = settings.bitrixWebhookUrl.endsWith("/") ? settings.bitrixWebhookUrl : settings.bitrixWebhookUrl + "/";

    if (event.toUpperCase().includes("DEAL")) {
      const data = (await bitrixGet(`${base}crm.deal.get.json?id=${encodeURIComponent(entityId)}`)) as {
        result?: { STAGE_ID?: string; LEAD_ID?: string | number };
      };
      const stage = data?.result?.STAGE_ID;
      const leadId = data?.result?.LEAD_ID ? String(data.result.LEAD_ID) : null;
      const status = mapStatus(stage);
      if (!status) return NextResponse.json({ ok: true, skipped: "stage not mapped", stage });
      // идемпотентность: если статус (и привязка к сделке) не меняются — без записи
      const updated = await prisma.order.updateMany({
        where: {
          OR: [{ bitrixDealId: entityId }, ...(leadId ? [{ bitrixLeadId: leadId }] : [])],
          NOT: { status, bitrixDealId: entityId },
        },
        data: { status, bitrixDealId: entityId },
      });
      return NextResponse.json({ ok: true, updated: updated.count, status });
    }

    if (event.toUpperCase().includes("LEAD")) {
      const data = (await bitrixGet(`${base}crm.lead.get.json?id=${encodeURIComponent(entityId)}`)) as {
        result?: { STATUS_ID?: string };
      };
      const stage = data?.result?.STATUS_ID;
      const status = mapStatus(stage);
      if (!status) return NextResponse.json({ ok: true, skipped: "stage not mapped", stage });
      // идемпотентность: статус уже такой — отвечаем ok без записи
      const updated = await prisma.order.updateMany({
        where: { bitrixLeadId: entityId, status: { not: status } },
        data: { status },
      });
      return NextResponse.json({ ok: true, updated: updated.count, status });
    }

    return NextResponse.json({ ok: true, skipped: "unsupported event", event });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: 500 },
    );
  }
}
