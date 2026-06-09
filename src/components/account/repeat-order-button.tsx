"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { repeatOrder } from "@/app/actions/order";

/** Кладёт позиции прошлого заказа в корзину по актуальным ценам и ведёт в /cart. */
export function RepeatOrderButton({ orderId }: { orderId: string }) {
  const { add } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleClick() {
    start(async () => {
      const res = await repeatOrder(orderId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      for (const it of res.items) {
        add({ id: it.id, slug: it.slug, name: it.name, priceKopecks: it.priceKopecks, image: it.image }, it.qty);
      }
      if (res.skipped > 0) {
        toast.success(`Товары добавлены в корзину. Недоступных позиций: ${res.skipped}`);
      } else {
        toast.success("Товары добавлены в корзину");
      }
      router.push("/cart");
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Повторить заказ
    </Button>
  );
}
