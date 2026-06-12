import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/** Полезная нагрузка push-уведомления (читается в public/sw.js). */
export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

let vapidConfigured = false;

/**
 * Гарантирует наличие VAPID-ключей в SiteSettings (id "default"):
 * генерирует при первом запуске и настраивает web-push.
 * Возвращает публичный ключ (он нужен клиенту для pushManager.subscribe).
 */
export async function ensureVapidKeys(): Promise<string> {
  let settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    select: { vapidPublicKey: true, vapidPrivateKey: true },
  });

  if (!settings?.vapidPublicKey || !settings.vapidPrivateKey) {
    const keys = webpush.generateVAPIDKeys();
    settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
      update: { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
      select: { vapidPublicKey: true, vapidPrivateKey: true },
    });
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      "mailto:info@biohayat.ru",
      settings.vapidPublicKey!,
      settings.vapidPrivateKey!,
    );
    vapidConfigured = true;
  }
  return settings.vapidPublicKey!;
}

/**
 * Отправляет push на все подписки клиента.
 * Протухшие подписки (404/410 от push-сервиса) удаляются из БД.
 */
export async function sendPushToCustomer(customerId: string, payload: PushPayload): Promise<void> {
  await ensureVapidKeys();

  const subs = await prisma.pushSubscription.findMany({ where: { customerId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Подписка отозвана браузером — чистим.
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        } else {
          console.error("[push] sendNotification failed:", err);
        }
      }
    }),
  );
}
