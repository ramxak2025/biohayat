import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getB2BAccount } from "@/lib/b2b-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Вход для партнёров" };

export default async function OptLoginPage() {
  // Уже авторизован — сразу в рабочий раздел по статусу
  const account = await getB2BAccount();
  if (account) {
    redirect(account.status === "APPROVED" ? "/opt/price" : "/opt/pending");
  }

  return (
    <Container className="flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-surface p-6 shadow-md ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Вход для партнёров
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Прайс-лист с оптовыми ценами и заявки — в личном кабинете.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-ink-muted">
          Ещё не работаете с нами?{" "}
          <Link href="/opt/register" className="font-bold text-brand-700 hover:text-brand-800">
            Оставить заявку на опт
          </Link>
        </p>
      </div>
    </Container>
  );
}
