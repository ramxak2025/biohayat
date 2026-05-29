"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus, resyncOrder } from "./actions";
import type { OrderStatus } from "@prisma/client";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новая",
  CONFIRMED: "Подтверждена",
  PAID: "Оплачена",
  ASSEMBLING: "На сборке",
  SHIPPED: "Передана в доставку",
  IN_TRANSIT: "В пути",
  DELIVERED: "Доставлена",
  CANCELLED: "Отменена",
};

export function OrderStatusSelect({ id, status }: { id: string; status: OrderStatus }) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as OrderStatus;
        start(async () => {
          await updateOrderStatus(id, next);
          toast.success("Статус обновлён");
        });
      }}
      className="max-w-[200px]"
    >
      {Object.entries(STATUS_LABELS).map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </Select>
  );
}

export function ResyncButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await resyncOrder(id);
          toast.success("Отправлено в Битрикс24 (см. статус)");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Отправить в Битрикс24
    </Button>
  );
}
