import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageCircleHeart } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { ConsultationForm } from "./consultation-form";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import type { ConsultationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Консультация нутрициолога — ХАЯТ", robots: { index: false, follow: false } };

const STATUS_LABELS: Record<ConsultationStatus, string> = {
  NEW: "Новая",
  IN_PROGRESS: "В работе",
  DONE: "Завершена",
  CANCELLED: "Отменена",
};

const STATUS_TONE: Record<ConsultationStatus, string> = {
  NEW: "bg-brand-50 text-brand-700",
  IN_PROGRESS: "bg-accent-50 text-accent-600",
  DONE: "bg-surface-sunken text-ink-muted",
  CANCELLED: "bg-danger/10 text-danger",
};

export default async function ConsultationPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const requests = await prisma.consultationRequest.findMany({
    where: { customerId: session.sub },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AccountShell name={session.name}>
      <h1 className="mb-2 text-2xl font-extrabold">Консультация нутрициолога</h1>
      <p className="mb-6 max-w-2xl text-ink-muted">
        Опишите ваш вопрос — наш нутрициолог подберёт БАД, проверит совместимость и составит
        рекомендации. Мы свяжемся с вами по указанному телефону.
      </p>

      <ConsultationForm defaultName={session.name} defaultPhone={session.phone} />

      <h2 className="mb-4 mt-10 text-lg font-extrabold">Мои заявки</h2>
      {requests.length === 0 ? (
        <div className="rounded-2xl bg-surface-soft py-14 text-center">
          <MessageCircleHeart className="mx-auto h-10 w-10 text-ink-faint" />
          <p className="mt-3 text-ink-muted">У вас пока нет заявок на консультацию.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-extrabold">{r.topic || "Консультация"}</div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
              {r.message ? (
                <p className="mt-2 whitespace-pre-line text-sm text-ink-muted">{r.message}</p>
              ) : null}
              <div className="mt-3 text-xs text-ink-faint">
                {new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(r.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
