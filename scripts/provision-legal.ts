/** Initial, user-approved published operator. Existing operator edits survive later retries. */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const settings = await prisma.siteSettings.upsert({ where: { id: "default" }, update: {}, create: {
      id: "default", legalName: "ООО «ВОСТОК»", inn: "0534052326", ogrn: "1190571006636",
      legalAddress: "368001, Республика Дагестан, г. Хасавюрт, ул. Заречная, 43, к. А",
      phone: "+7 (928) 677-50-50", email: "info@biohayat.ru",
    } });
    if (settings.inn !== "0534052326" || settings.ogrn !== "1190571006636") throw new Error("Existing operator settings need deliberate reconciliation");
    console.log("Published shop operator/contact settings verified; existing settings preserved.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Legal provisioning requires review of existing settings."); process.exitCode = 1; });
