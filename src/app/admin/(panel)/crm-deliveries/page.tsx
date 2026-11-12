import Link from "next/link";
import { AdminHeader, Card, EmptyState, Pill } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/form-controls";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CRM_STATUS } from "@/lib/crm-status";
import { retryDelivery } from "./actions";

export const dynamic = "force-dynamic";

const KINDS: Record<string, string> = {
  retail_order: "Заказ", wholesale_order: "Оптовая заявка", consultation: "Консультация",
};

export default async function CrmDeliveriesPage({ searchParams }: {
  searchParams: Promise<{ delivered?: string; page?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const delivered = params.delivered === "1";
  const where = delivered ? { status: "DELIVERED" as const } : { status: { not: "DELIVERED" as const } };
  const total = await prisma.crmOutbox.count({ where });
  const pages = Math.max(1, Math.ceil(total / 50));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.page) || 1)));
  const jobs = await prisma.crmOutbox.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 });
  const href = (number: number) => `/admin/crm-deliveries?delivered=${delivered ? "1" : "0"}&page=${number}`;
  return <>
    <AdminHeader title="Доставка в CRM Хаят" description={`${delivered ? "Доставлено" : "Ожидают доставки или проверки"}: ${total}`} />
    <div className="mb-5 flex gap-4 text-sm font-semibold">
      <Link href="/admin/crm-deliveries" className="text-brand-700 hover:underline">Недоставленные</Link>
      <Link href="/admin/crm-deliveries?delivered=1" className="text-brand-700 hover:underline">Доставленные</Link>
    </div>
    {!jobs.length ? <EmptyState>Заявок в этом списке нет.</EmptyState> : <div className="space-y-4">
      {jobs.map(job => <Card key={job.id}>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h2 className="font-bold">{KINDS[job.kind] ?? job.kind}</h2>
          <Pill tone={CRM_STATUS[job.status].tone}>{CRM_STATUS[job.status].label}</Pill>
          {job.kind === "retail_order" ? <Link className="text-sm text-brand-700 hover:underline" href={`/admin/orders/${job.externalId}`}>Открыть заказ</Link> : null}
        </div>
        <p className="break-all text-xs text-ink-muted">{job.externalId} · {job.createdAt.toISOString()} · Попыток: {job.attempts}</p>
        {job.crmDealId ? <p className="mt-2 break-all text-sm">Сделка CRM: {job.crmDealId}</p> : null}
        {job.lastError ? <p className="mt-2 rounded-lg bg-danger/10 p-2 text-sm text-danger">{job.lastError}</p> : null}
        {job.status === "RETRY" ? <p className="mt-2 text-xs text-ink-muted">Следующая попытка: {job.nextAttemptAt.toISOString()}</p> : null}
        {job.status !== "DELIVERED" && (job.status !== "PROCESSING" || (job.leaseExpiresAt && job.leaseExpiresAt <= new Date())) ?
          <form className="mt-3" action={retryDelivery.bind(null, job.id)}><SubmitButton>Повторить доставку</SubmitButton></form> : null}
      </Card>)}
    </div>}
    {pages > 1 ? <div className="mt-5 flex justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)}>Назад</Link> : <span />}
      <span>{page} / {pages}</span>
      {page < pages ? <Link href={href(page + 1)}>Далее</Link> : <span />}
    </div> : null}
  </>;
}
