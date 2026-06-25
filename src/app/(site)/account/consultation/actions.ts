"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";
import { syncConsultationToBitrix } from "@/lib/bitrix";
import { normalizePhone } from "@/lib/utils";

export type ConsultationState = { ok?: boolean; error?: string };

/** Создаёт заявку на консультацию нутрициолога и отправляет лид в Битрикс24. */
export async function submitConsultation(
  _prev: ConsultationState,
  fd: FormData,
): Promise<ConsultationState> {
  const session = await requireCustomer();

  // Ограничиваем длину полей (защита от раздувания лида/спама).
  const name = (String(fd.get("name") || "").trim() || session.name).slice(0, 120);
  const phoneRaw = String(fd.get("phone") || "").trim() || session.phone;
  const phone = normalizePhone(phoneRaw);
  const topic = String(fd.get("topic") || "").trim().slice(0, 120) || null;
  const message = String(fd.get("message") || "").trim().slice(0, 2000) || null;

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
