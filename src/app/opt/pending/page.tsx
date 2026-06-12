import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, PhoneCall } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getB2BAccount } from "@/lib/b2b-auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Статус заявки" };

/**
 * Статусный экран оптового аккаунта: PENDING — заявка на проверке,
 * REJECTED — мягкий отказ с телефоном менеджера. APPROVED сюда не попадает —
 * сразу уходит в прайс.
 */
export default async function OptPendingPage() {
  const account = await getB2BAccount();
  if (!account) redirect("/opt/login");
  if (account.status === "APPROVED") redirect("/opt/price");

  const settings = await getSettings();
  const phoneHref = `tel:${settings.phone.replace(/[^\d+]/g, "")}`;
  const rejected = account.status === "REJECTED";

  return (
    <Container className="flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-8 text-center shadow-md ring-1 ring-line sm:p-10">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            rejected ? "bg-surface-soft text-ink-faint" : "bg-accent-50 text-accent-600"
          }`}
        >
          {rejected ? (
            <PhoneCall className="h-7 w-7" aria-hidden="true" />
          ) : (
            <Clock className="h-7 w-7" aria-hidden="true" />
          )}
        </span>

        {rejected ? (
          <>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
              Пока не получилось одобрить заявку
            </h1>
            <p className="mt-3 leading-relaxed text-ink-muted">
              {account.company}, нам не хватило информации, чтобы открыть оптовый
              доступ. Это не окончательное решение — позвоните менеджеру, обсудим
              условия и найдём формат сотрудничества.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
              Заявка на проверке
            </h1>
            <p className="mt-3 leading-relaxed text-ink-muted">
              {account.company}, спасибо! Менеджер свяжется с вами в течение
              рабочего дня и откроет доступ к прайс-листу с оптовыми ценами.
            </p>
          </>
        )}

        <div className="mt-7 rounded-2xl bg-surface-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Отдел оптовых продаж
          </p>
          <a
            href={phoneHref}
            className="tnum mt-1.5 block text-2xl font-extrabold tracking-tight text-brand-700 transition hover:text-brand-800"
          >
            {settings.phone}
          </a>
          <p className="mt-1 text-sm text-ink-muted">{settings.workingHours}</p>
        </div>

        {rejected ? null : (
          <p className="mt-5 text-sm text-ink-faint">
            Хотите ускорить проверку? Позвоните нам — одобрим заявку прямо во
            время разговора.
          </p>
        )}
      </div>
    </Container>
  );
}
