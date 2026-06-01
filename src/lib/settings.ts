import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@prisma/client";

/** Полный набор настроек по умолчанию (используется, если БД недоступна — напр. на этапе сборки). */
const DEFAULTS: SiteSettings = {
  id: "default",
  siteName: "ХАЯТ",
  phone: "+7 (928) 677-50-50",
  email: "info@biohayat.ru",
  address: "г. Грозный, ул. Нурседы Хабусиевой, 51",
  workingHours: "Пн–Вс, 9:00–18:00",
  instagram: null,
  telegram: null,
  whatsapp: null,
  vk: null,
  wildberries: null,
  legalName: "ООО «ВОСТОК»",
  inn: null,
  ogrn: null,
  legalAddress: null,
  freeDeliveryThresholdKopecks: 2000000,
  bitrixWebhookUrl: null,
  bitrixEnabled: false,
  bitrixChatCode: null,
  bitrixResponsibleId: null,
  bitrixWebhookToken: null,
  bitrixStageMap: null,
  defaultMetaTitle: "ХАЯТ — натуральные витамины и БАД для всей семьи",
  defaultMetaDescription:
    "Фитопродукция и биологически активные добавки ХАЯТ: витамины, коллаген, масло чёрного тмина и многое другое.",
  defaultOgImage: null,
  titleTemplate: "%s — ХАЯТ",
  yandexVerification: null,
  googleVerification: null,
  yandexMetrikaId: null,
  badDisclaimer:
    "БАД. НЕ ЯВЛЯЕТСЯ ЛЕКАРСТВЕННЫМ СРЕДСТВОМ. Имеются противопоказания, необходима консультация специалиста.",
  updatedAt: new Date(0),
};

/**
 * Возвращает настройки сайта (singleton). Кешируется в рамках запроса.
 * Создаёт строку с дефолтами при первом обращении.
 * Если БД недоступна (например, во время `next build` без базы) — возвращает дефолты,
 * чтобы сборка не падала.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: "default" } });
    }
    return settings;
  } catch {
    return DEFAULTS;
  }
});

export { DEFAULTS as settingsDefaults };
