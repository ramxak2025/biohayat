import { B2BCartProvider } from "@/components/opt/b2b-cart-provider";

export const dynamic = "force-dynamic";

/**
 * Route-группа кабинета опта (URL не меняет): общий клиентский провайдер
 * оптовой корзины для прайса и заявки. Гейтинг доступа — на каждой странице
 * (статус аккаунта проверяется по БД на каждый запрос).
 */
export default function OptCabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <B2BCartProvider>
      <div className="min-h-screen bg-bg">{children}</div>
    </B2BCartProvider>
  );
}
