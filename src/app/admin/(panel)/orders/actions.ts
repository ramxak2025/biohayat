"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { syncOrderToBitrix } from "@/lib/bitrix";
import type { OrderStatus } from "@prisma/client";

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await requireSession();
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

/** Повторная отправка заявки в Битрикс24. */
export async function resyncOrder(id: string): Promise<void> {
  await requireSession();
  await prisma.order.update({ where: { id }, data: { bitrixSyncStatus: "PENDING", bitrixError: null } });
  await syncOrderToBitrix(id);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}

export async function deleteOrder(id: string): Promise<void> {
  await requireSession();
  await prisma.order.delete({ where: { id } });
  revalidatePath("/admin/orders");
}
