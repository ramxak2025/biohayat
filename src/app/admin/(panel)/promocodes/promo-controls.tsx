"use client";

import { useTransition } from "react";
import { Loader2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { togglePromoCodeActive } from "./actions";

/** Кнопка быстрой активации/деактивации промокода из списка. */
export function TogglePromoButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      title={isActive ? "Деактивировать" : "Активировать"}
      className={isActive ? "text-danger hover:bg-danger/10" : "text-brand-700 hover:bg-brand-50"}
      onClick={() =>
        start(async () => {
          await togglePromoCodeActive(id, !isActive);
          toast.success(isActive ? "Промокод деактивирован" : "Промокод активирован");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
    </Button>
  );
}
