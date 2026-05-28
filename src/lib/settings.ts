import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@prisma/client";

/** Дефолтные настройки (если строка ещё не создана). */
const DEFAULTS = {
  id: "default",
  siteName: "ХАЯТ",
  phone: "+7 (928) 677-50-50",
  email: "info@biohayat.ru",
  address: "г. Грозный, ул. Нурседы Хабусиевой, 51",
  workingHours: "Пн–Вс, 9:00–18:00",
  badDisclaimer:
    "БАД. НЕ ЯВЛЯЕТСЯ ЛЕКАРСТВЕННЫМ СРЕДСТВОМ. Имеются противопоказания, необходима консультация специалиста.",
  freeDeliveryThresholdKopecks: 2000000,
  defaultMetaTitle: "ХАЯТ — натуральные витамины и БАД для всей семьи",
  defaultMetaDescription:
    "Фитопродукция и биологически активные добавки ХАЯТ: витамины, коллаген, масло чёрного тмина и многое другое.",
  titleTemplate: "%s — ХАЯТ",
  bitrixEnabled: false,
} as const;

/**
 * Возвращает настройки сайта (singleton). Кешируется в рамках запроса.
 * Создаёт строку с дефолтами при первом обращении.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  let settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: "default" } });
  }
  return settings;
});

export { DEFAULTS as settingsDefaults };
