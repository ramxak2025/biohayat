"use client";

import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  approveAccount,
  rejectAccount,
  setAccountStatus,
  setWholesaleOrderStatus,
} from "./actions";
import type { WholesaleStatus, WholesaleOrderStatus } from "@prisma/client";

export const ACCOUNT_STATUS_LABELS: Record<WholesaleStatus, string> = {
  PENDING: "На проверке",
  APPROVED: "Одобрен",
  REJECTED: "Отклонён",
};

export const WHOLESALE_ORDER_STATUS_LABELS: Record<WholesaleOrderStatus, string> = {
  NEW: "Новая",
  PROCESSING: "В работе",
  CONFIRMED: "Подтверждена",
  DONE: "Выполнена",
  CANCELLED: "Отменена",
};

/** Кнопки модерации для аккаунтов «На проверке». */
export function ModerationButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await approveAccount(id);
            toast.success("Аккаунт одобрен — оптовые цены открыты");
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Одобрить
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-danger hover:bg-danger/10"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await rejectAccount(id);
            toast.success("Заявка отклонена");
          })
        }
      >
        <X className="h-4 w-4" />
        Отклонить
      </Button>
    </div>
  );
}

/** Селект смены статуса уже промодерированного аккаунта. */
export function AccountStatusSelect({ id, status }: { id: string; status: WholesaleStatus }) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={status}
      disabled={pending}
      className="max-w-[180px] py-2 text-sm"
      onChange={(e) => {
        const next = e.target.value as WholesaleStatus;
        start(async () => {
          await setAccountStatus(id, next);
          toast.success("Статус аккаунта обновлён");
        });
      }}
    >
      {Object.entries(ACCOUNT_STATUS_LABELS).map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </Select>
  );
}

/** Селект смены статуса оптовой заявки. */
export function WholesaleOrderStatusSelect({
  id,
  status,
}: {
  id: string;
  status: WholesaleOrderStatus;
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      defaultValue={status}
      disabled={pending}
      className="max-w-[200px] py-2 text-sm"
      onChange={(e) => {
        const next = e.target.value as WholesaleOrderStatus;
        start(async () => {
          await setWholesaleOrderStatus(id, next);
          toast.success("Статус заявки обновлён");
        });
      }}
    >
      {Object.entries(WHOLESALE_ORDER_STATUS_LABELS).map(([v, label]) => (
        <option key={v} value={v}>{label}</option>
      ))}
    </Select>
  );
}
