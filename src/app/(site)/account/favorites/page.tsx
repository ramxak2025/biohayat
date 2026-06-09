import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { FavoritesView } from "./favorites-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Избранное — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  // Избранное доступно и гостю (локальное хранилище),
  // но авторизованным показываем его внутри оболочки кабинета.
  const session = await getCustomerSession();
  if (session) {
    return (
      <AccountShell name={session.name}>
        <FavoritesView embedded />
      </AccountShell>
    );
  }
  return <FavoritesView />;
}
