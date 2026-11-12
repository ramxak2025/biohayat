import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail, MapPin, MessageSquare } from "lucide-react";
import { AdminHeader, Card, Pill } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form-controls";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { OrderStatusSelect, ResyncButton, TrackingControl } from "../order-controls";
import { deleteOrder } from "../actions";
import { redirect } from "next/navigation";
import { CRM_STATUS } from "@/lib/crm-status";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const delivery = order.crmProvider === "HAYAT" ? await prisma.crmOutbox.findUnique({
    where: { kind_externalId: { kind: "retail_order", externalId: order.id } },
  }) : null;

  async function remove() {
    "use server";
    await deleteOrder(id);
    redirect("/admin/orders");
  }

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ChevronLeft className="h-4 w-4" /> Все заявки
      </Link>
      <AdminHeader
        title={`Заявка №${order.number}`}
        description={new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(order.createdAt)}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-bold">Состав заявки</h2>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-xs text-ink-faint">{formatMoney(it.priceKopecks)} × {it.qty}</div>
                  </div>
                  <div className="font-bold">{formatMoney(it.priceKopecks * it.qty)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="font-bold">Итого</span>
              <span className="text-xl font-extrabold">{formatMoney(order.totalKopecks)}</span>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Клиент</h2>
            <div className="space-y-2.5 text-sm">
              <div className="font-semibold text-base">{order.customerName}</div>
              <div className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-brand-500" /><a href={`tel:${order.phone}`} className="hover:text-brand-700">{order.phone}</a></div>
              {order.email ? <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-brand-500" /><a href={`mailto:${order.email}`} className="hover:text-brand-700">{order.email}</a></div> : null}
              {order.address ? <div className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-brand-500" />{order.address}</div> : null}
              {order.comment ? <div className="flex items-start gap-2.5"><MessageSquare className="mt-0.5 h-4 w-4 text-brand-500" />{order.comment}</div> : null}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-bold">Статус</h2>
            <OrderStatusSelect id={order.id} status={order.status} />
            {order.inventoryVersion === 0 && (
              <p className="mt-3 text-sm text-ink-muted">Заказ оформлен в предыдущей версии. После отмены проверьте остатки вручную: точное списанное количество не сохранено.</p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Доставка (СДЭК)</h2>
            <TrackingControl id={order.id} trackingNumber={order.trackingNumber} carrier={order.trackingCarrier} />
          </Card>

          {order.customerId ? (
            <Card>
              <h2 className="mb-2 font-bold">Клиент</h2>
              <Link href={`/admin/customers/${order.customerId}`} className="text-sm font-semibold text-brand-700 hover:underline">
                Зарегистрированный покупатель →
              </Link>
            </Card>
          ) : null}

          <Card>
            {order.crmProvider === "HAYAT" ? <>
              <h2 className="mb-3 font-bold">CRM Хаят</h2>
              {delivery ? <>
                <Pill tone={CRM_STATUS[delivery.status].tone}>{CRM_STATUS[delivery.status].label}</Pill>
                <p className="mt-2 text-sm text-ink-muted">Попыток: {delivery.attempts}</p>
                {delivery.crmDealId ? <p className="mt-2 break-all text-sm">Сделка: {delivery.crmDealId}</p> : null}
                {delivery.lastError ? <p className="my-3 rounded-lg bg-danger/10 p-2 text-xs text-danger">{delivery.lastError}</p> : null}
                {delivery.status !== "DELIVERED" ? <ResyncButton id={order.id} hayat /> : null}
              </> : <p className="text-sm text-danger">Запись доставки не найдена. Требуется проверка.</p>}
              <Link href="/admin/crm-deliveries" className="mt-3 block text-sm text-brand-700 hover:underline">Все доставки в CRM</Link>
            </> : <>
            <h2 className="mb-3 font-bold">Битрикс24</h2>
            <div className="mb-3 flex items-center gap-2 text-sm">
              Статус:{" "}
              <Pill tone={order.bitrixSyncStatus === "SYNCED" ? "green" : order.bitrixSyncStatus === "FAILED" ? "red" : "amber"}>
                {order.bitrixSyncStatus}
              </Pill>
            </div>
            {order.bitrixLeadId ? <p className="mb-2 text-sm text-ink-muted">ID лида: {order.bitrixLeadId}</p> : null}
            {order.bitrixError ? <p className="mb-3 rounded-lg bg-danger/10 p-2 text-xs text-danger">{order.bitrixError}</p> : null}
            <ResyncButton id={order.id} />
            </>}
          </Card>

          <Card>
            <DeleteButton action={remove} label="Удалить заявку" confirmText={`Удалить заявку №${order.number}?`} />
          </Card>
        </div>
      </div>
    </>
  );
}
