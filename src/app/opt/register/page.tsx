import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgePercent, FileText, Truck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { getB2BAccount } from "@/lib/b2b-auth";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Заявка на оптовое сотрудничество" };

export default async function OptRegisterPage() {
  // Уже есть аккаунт — форма не нужна
  const account = await getB2BAccount();
  if (account) {
    redirect(account.status === "APPROVED" ? "/opt/price" : "/opt/pending");
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.2fr]">
        {/* Левая колонка: зачем заполнять форму */}
        <div className="lg:pt-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Заявка на оптовое сотрудничество
          </h1>
          <p className="mt-3 leading-relaxed text-ink-muted">
            Заполните форму — менеджер проверит заявку в течение одного рабочего
            дня и откроет доступ к прайс-листу с оптовыми ценами.
          </p>
          <ul className="mt-7 space-y-4">
            {[
              {
                icon: BadgePercent,
                text: "119+ позиций со скидками до −38% от розничных цен",
              },
              {
                icon: FileText,
                text: "Оплата по счёту для ИП и ООО, полный пакет закрывающих документов",
              },
              {
                icon: Truck,
                text: "Отгрузка от 10 шт, доставка транспортными компаниями по всей России",
              },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="pt-1.5 text-sm leading-relaxed text-ink">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Правая колонка: форма */}
        <div>
          <div className="rounded-3xl bg-surface p-6 shadow-md ring-1 ring-line sm:p-8">
            <RegisterForm />
          </div>
          <p className="mt-5 text-center text-sm text-ink-muted">
            Уже есть аккаунт?{" "}
            <Link href="/opt/login" className="font-bold text-brand-700 hover:text-brand-800">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </Container>
  );
}
