"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireAdmin } from "@/lib/auth";
import type { WholesaleStatus, WholesaleOrderStatus } from "@prisma/client";

const SECTION = "/admin/wholesale";

/** Смена статуса оптового аккаунта (модерация доступна обеим ролям). */
export async function setAccountStatus(id: string, status: WholesaleStatus): Promise<void> {
  await requireSession();
  await prisma.wholesaleAccount.update({ where: { id }, data: { status } });
  revalidatePath(SECTION);
}

/** Одобрить аккаунт — открывает оптовые цены на opt.biohayat.ru. */
export async function approveAccount(id: string): Promise<void> {
  await setAccountStatus(id, "APPROVED");
}

/** Отклонить заявку на оптовый доступ. */
export async function rejectAccount(id: string): Promise<void> {
  await setAccountStatus(id, "REJECTED");
}

/** Смена статуса оптовой заявки (доступна обеим ролям). */
export async function setWholesaleOrderStatus(
  id: string,
  status: WholesaleOrderStatus,
): Promise<void> {
  await requireSession();
  await prisma.wholesaleOrder.update({ where: { id }, data: { status } });
  revalidatePath(SECTION);
}

export async function deleteWholesaleAccount(id: string): Promise<void> {
  await requireAdmin();
  await prisma.wholesaleAccount.delete({ where: { id } });
  revalidatePath(SECTION);
}

export async function deleteWholesaleOrder(id: string): Promise<void> {
  await requireAdmin();
  await prisma.wholesaleOrder.delete({ where: { id } });
  revalidatePath(SECTION);
}
