"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { syncConsultationToBitrix } from "@/lib/bitrix";
import { normalizePhone } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export type ConsultationState = { ok?: boolean; error?: string };

/** Создаёт заявку на консультацию нутрициолога и отправляет лид в Битрикс24. */
export async function submitConsultation(
  _prev: ConsultationState,
  fd: FormData,
): Promise<ConsultationState> {
  const session = await requireCustomer();

  // Антиспам: не более 3 заявок на консультацию в час на клиента.
  if (!rateLimit(`consult:${session.sub}`, 3, 60 * 60 * 1000)) {
    return { error: "Слишком много заявок. Попробуйте позже — не более 3 заявок в час." };
  }

  const name = String(fd.get("name") || "").trim() || session.name;
  const phoneRaw = String(fd.get("phone") || "").trim() || session.phone;
  const phone = normalizePhone(phoneRaw);
  const topic = String(fd.get("topic") || "").trim() || null;
  const message = String(fd.get("message") || "").trim() || null;

  if (name.length < 2) return { error: "Укажите имя" };
  if (phone.replace(/\D/g, "").length < 11) return { error: "Укажите корректный телефон" };
  if (!message) return { error: "Опишите ваш вопрос" };

  const consultation = await prisma.consultationRequest.create({
    data: {
      customerId: session.sub,
      name,
      phone,
      topic,
      message,
    },
  });

  // Отправка лида в Битрикс24 (безопасна при выключенной интеграции).
  await syncConsultationToBitrix(consultation.id);

  revalidatePath("/account/consultation");
  return { ok: true };
}
