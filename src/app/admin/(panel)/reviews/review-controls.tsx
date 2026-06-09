"use client";

import { useTransition } from "react";
import { Check, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { approveReview, hideReview } from "./actions";

/** Кнопки модерации отзыва: «Одобрить» или «Скрыть» в зависимости от статуса. */
export function ReviewModerationButtons({ id, isApproved }: { id: string; isApproved: boolean }) {
  const [pending, start] = useTransition();
  return isApproved ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await hideReview(id);
          toast.success("Отзыв скрыт");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
      Скрыть
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await approveReview(id);
          toast.success("Отзыв одобрен");
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Одобрить
    </Button>
  );
}
