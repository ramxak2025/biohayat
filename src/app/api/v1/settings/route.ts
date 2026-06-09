// GET /api/v1/settings — публичные настройки магазина для мобильного клиента.
// Внутренние поля (Битрикс24, верификации, аналитика) НЕ раскрываются.

import { getSettings } from "@/lib/settings";
import { apiOk, withErrorHandling } from "../_lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const s = await getSettings();

  return apiOk({
    siteName: s.siteName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    workingHours: s.workingHours,
    socials: {
      instagram: s.instagram,
      telegram: s.telegram,
      whatsapp: s.whatsapp,
      vk: s.vk,
      wildberries: s.wildberries,
    },
    freeDeliveryThresholdKopecks: s.freeDeliveryThresholdKopecks,
    badDisclaimer: s.badDisclaimer,
  });
});
