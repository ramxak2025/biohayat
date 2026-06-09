import type { Metadata } from "next";
import { CartView } from "./cart-view";

// Рендер на запрос: статический пререндер на сборке потребовал бы доступную БД
// (layout читает категории). Содержимое корзины в любом случае клиентское.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Корзина" };

export default function CartPage() {
  return <CartView />;
}
