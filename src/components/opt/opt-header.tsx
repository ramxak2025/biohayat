import Link from "next/link";
import { FileSpreadsheet, ClipboardList, LogOut, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/site/logo";
import { SectionSwitch } from "@/components/ui/section-switch";
import type { SiteSettings } from "@prisma/client";

/** Оптовая навигация использует тот же плавающий материал, что и витрина. */
export function OptHeader({
  settings,
  account,
  retailUrl,
}: {
  settings: SiteSettings;
  /** Минимум данных сессии для шапки; null — гость. */
  account: { company: string; approved: boolean } | null;
  /** Абсолютный адрес розницы: на поддомене опта «/» ведёт обратно в опт. */
  retailUrl: string;
}) {
  const initial = (account?.company.trim().charAt(0) || "К").toUpperCase();

  const actions = account ? (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="flex h-12 min-w-0 items-center gap-2 rounded-full px-3"
        title={account.company}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate text-[15px] font-semibold text-ink xl:inline">
          {account.company}
        </span>
      </span>
      <Link
        href="/opt/price"
        className="flex h-12 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700"
      >
        <FileSpreadsheet className="h-[18px] w-[18px] text-brand-600" aria-hidden="true" />
        Прайс-лист
      </Link>
      <Link
        href="/opt/orders"
        className="flex h-12 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700"
      >
        <ClipboardList className="h-[18px] w-[18px] text-brand-600" aria-hidden="true" />
        Мои заявки
      </Link>
      <form action="/opt/logout" method="post">
        <button
          type="submit"
          aria-label="Выйти"
          title="Выйти"
          className="flex h-12 w-12 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-soft hover:text-danger"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  ) : (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/opt/login"
        className="flex h-12 items-center rounded-full px-4 text-[15px] font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-700"
      >
        Войти
      </Link>
      {/* Зелёная, а не янтарная. Янтарь по системе — «акции и бейджи», и на
          первом экране опта он стоял трижды: в шапке, в герое и на central
          кнопке нижнего бара. Одно янтарное действие на экран — оставляем его
          герою, а шапка получает то же решение, что «Корзина» в рознице. */}
      <Link
        href="/opt/register"
        className="flex h-12 items-center rounded-full bg-brand-500 px-5 text-[15px] font-bold text-white transition hover:bg-brand-600"
      >
        Получить прайс
      </Link>
    </div>
  );

  return (
    <>
      <div className="site-service-frame">
        <div className="site-service">
          <div className="min-w-0">
            <SectionSwitch tone="light" active="opt" retailUrl={retailUrl} />
            <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="shrink-0 font-semibold">
              <Phone size={16} aria-hidden="true" />
              {settings.phone}
            </a>
            <span className="hidden shrink-0 2xl:inline">
              Отдел оптовых продаж · {settings.workingHours}
            </span>
            <span className="min-w-0 truncate">
              Производитель — {settings.legalName || "ООО «Восток»"}, Россия
            </span>
          </div>
          <a href={`mailto:${settings.email}`} className="shrink-0">
            <Mail size={16} aria-hidden="true" />
            {settings.email}
          </a>
        </div>
      </div>

      <header className="site-header opt-header">
        <div className="site-header-row opt-header-row">
          <Link href="/opt" aria-label="ХАЯТ Опт — на главную" className="flex min-h-11 shrink-0 items-center gap-2">
            <Logo />
            <span className="flex h-6 items-center rounded-full bg-brand-800 px-2 text-xs font-extrabold uppercase tracking-wider text-white lg:h-7">
              Опт
            </span>
          </Link>
          <div className="hidden min-w-0 lg:block">{actions}</div>
          <SectionSwitch className="opt-header-switch h-12 lg:hidden" tone="light" active="opt" retailUrl={retailUrl} />
        </div>
      </header>
    </>
  );
}
