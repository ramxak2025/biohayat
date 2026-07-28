import Link from "next/link";
import { FileSpreadsheet, ClipboardList, LogOut, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/site/logo";

/**
 * Шапка оптового поддомена (opt.biohayat.ru). Серверный компонент без
 * клиентского состояния: интерактива нет, выход — нативная форма POST.
 * Гость: «Войти» + акцентная «Получить прайс». Партнёр: компания,
 * «Прайс-лист», «Мои заявки», выход. На мобильных — компактно, без бургера.
 */
export function OptHeader({
  phone,
  account,
}: {
  phone: string;
  /** Минимум данных сессии для шапки; null — гость. */
  account: { company: string; approved: boolean } | null;
}) {
  return (
    <header className="glass sticky top-0 z-40 border-b border-line shadow-sm">
      <Container className="flex h-16 items-center gap-3 sm:h-[var(--spacing-header)] sm:gap-5">
        {/* Лого + бейдж «ОПТ» */}
        <Link
          href="/opt"
          aria-label="ХАЯТ Опт — на главную"
          className="flex shrink-0 items-center gap-2"
        >
          <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex" />
          <span className="rounded-full bg-brand-800 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
            Опт
          </span>
        </Link>

        {/* Телефон отдела оптовых продаж — крупно, по центру */}
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="group mx-auto hidden flex-col items-center leading-tight md:flex"
        >
          <span className="tnum flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink transition group-hover:text-brand-700 lg:text-xl">
            <Phone className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" />
            {phone}
          </span>
          <span className="text-[11px] font-medium text-ink-muted">
            Отдел оптовых продаж · Пн–Вс, 9:00–18:00
          </span>
        </a>

        {/* Действия справа */}
        {account ? (
          <div className="ml-auto flex min-w-0 shrink items-center gap-1.5 md:ml-0 sm:gap-2">
            <span
              className="hidden max-w-44 truncate rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-bold text-brand-800 lg:block"
              title={account.company}
            >
              {account.company}
            </span>
            <Link
              href="/opt/price"
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" />
              <span className="hidden sm:inline">Прайс-лист</span>
              <span className="sm:hidden">Прайс</span>
            </Link>
            <Link
              href="/opt/orders"
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700"
            >
              <ClipboardList className="h-4.5 w-4.5 text-brand-600" aria-hidden="true" />
              <span className="hidden sm:inline">Мои заявки</span>
              <span className="sm:hidden">Заявки</span>
            </Link>
            <form action="/opt/logout" method="post">
              <button
                type="submit"
                aria-label="Выйти"
                title="Выйти"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-soft hover:text-danger"
              >
                <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 sm:gap-2.5">
            <Link
              href="/opt/login"
              className="flex h-10 items-center rounded-full px-3.5 text-sm font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700 sm:h-11 sm:px-4 sm:text-[15px]"
            >
              Войти
            </Link>
            <Link
              href="/opt/register"
              className="flex h-10 items-center rounded-full bg-accent-400 px-4 text-sm font-bold text-ink shadow-sm transition hover:bg-accent-300 active:bg-accent-500 sm:h-11 sm:px-5 sm:text-[15px]"
            >
              Получить прайс
            </Link>
          </div>
        )}
      </Container>
    </header>
  );
}
