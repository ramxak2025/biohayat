"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Select, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateOrderStatus, resyncOrder, setOrderTracking } from "./actions";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { OrderStatus } from "@prisma/client";

export const STATUS_LABELS = ORDER_STATUS_LABELS;

export function TrackingControl({
  id,
  trackingNumber,
  carrier,
}: {
  id: string;
  trackingNumber: string | null;
  carrier: string | null;
}) {
  const [pending, start] = useTransition();
  const [num, setNum] = useState(trackingNumber ?? "");
  return (
    <div className="space-y-2">
      <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Трек-номер СДЭК" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setOrderTracking(id, num, carrier || "cdek");
            toast.success("Трек-номер сохранён");
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Сохранить трек-номер
      </Button>
    </div>
  );
}

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
