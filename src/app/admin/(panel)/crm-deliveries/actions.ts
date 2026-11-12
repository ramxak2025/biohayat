"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { retryCrmDelivery } from "@/lib/crm-outbox";

export async function retryDelivery(id: string): Promise<void> {
  await requireSession();
  await retryCrmDelivery(id);
  revalidatePath("/admin/crm-deliveries");
  revalidatePath("/admin/orders", "layout");
}
