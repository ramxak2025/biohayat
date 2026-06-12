"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { testBitrixConnection } from "@/lib/bitrix";
import { rubToKopecks } from "@/lib/utils";

export type SettingsState = { ok?: boolean; error?: string };

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) || "").trim();
  return v || null;
}

/** Парсит JSON соответствия «стадия Битрикс24 → статус заказа». При ошибке — null. */
function parseStageMap(raw: string | null): object | undefined {
  if (!raw) return undefined;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : undefined;
  } catch {
    return undefined;
  }
}

export async function updateSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();

  const freeDeliveryRub = Number(fd.get("freeDeliveryRub") || 0);
  // Процент бонусов от суммы заказа: целое число 0..50.
  const bonusPercentRaw = Number(fd.get("bonusPercent"));
  const bonusPercent = Number.isFinite(bonusPercentRaw)
    ? Math.min(50, Math.max(0, Math.round(bonusPercentRaw)))
    : 5;

  try {
    await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        siteName: str(fd, "siteName") || "ХАЯТ",
        phone: str(fd, "phone") || "",
        email: str(fd, "email") || "",
        address: str(fd, "address") || "",
        workingHours: str(fd, "workingHours") || "",
        instagram: str(fd, "instagram"),
        telegram: str(fd, "telegram"),
        whatsapp: str(fd, "whatsapp"),
        vk: str(fd, "vk"),
        wildberries: str(fd, "wildberries"),
        legalName: str(fd, "legalName"),
        inn: str(fd, "inn"),
        ogrn: str(fd, "ogrn"),
        legalAddress: str(fd, "legalAddress"),
        freeDeliveryThresholdKopecks: rubToKopecks(freeDeliveryRub),
        bonusPercent,
        bitrixWebhookUrl: str(fd, "bitrixWebhookUrl"),
        bitrixEnabled: fd.get("bitrixEnabled") === "on",
        // ВНИМАНИЕ: bitrixChatCode — произвольный JS-виджет Битрикс24, его
        // НЕЛЬЗЯ прогонять через HTML-санитайзер (это сломает скрипт). XSS-риск
        // снимается RBAC: задать виджет может только ADMIN (см. requireAdmin()
        // в начале updateSettings). Рендер — src/components/site/chat-widget.tsx.
        bitrixChatCode: str(fd, "bitrixChatCode"),
        bitrixResponsibleId: str(fd, "bitrixResponsibleId"),
        bitrixWebhookToken: str(fd, "bitrixWebhookToken"),
        bitrixStageMap: parseStageMap(str(fd, "bitrixStageMap")),
        defaultMetaTitle: str(fd, "defaultMetaTitle") || "ХАЯТ",
        defaultMetaDescription: str(fd, "defaultMetaDescription") || "",
        titleTemplate: str(fd, "titleTemplate") || "%s — ХАЯТ",
        yandexVerification: str(fd, "yandexVerification"),
        googleVerification: str(fd, "googleVerification"),
        yandexMetrikaId: str(fd, "yandexMetrikaId"),
        badDisclaimer: str(fd, "badDisclaimer") || "",
      },
      create: { id: "default" },
    });
  } catch {
    return { error: "Не удалось сохранить настройки" };
  }

  // Сбрасывает Data Cache настроек (lib/settings.ts); { expire: 0 } — немедленно.
  revalidateTag("settings", { expire: 0 });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function testBitrix(webhookUrl: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  if (!webhookUrl) return { ok: false, message: "Укажите URL вебхука" };
  return testBitrixConnection(webhookUrl);
}
