import Link from "next/link";
import { FileSpreadsheet, ClipboardList, LogOut, Phone, Mail } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/site/logo";
import { SectionSwitch } from "@/components/ui/section-switch";
import type { SiteSettings } from "@prisma/client";

/**
 * Шапка оптового раздела (opt.biohayat.ru → группа /opt, см. proxy.ts).
 *
 * Раздел опта долго жил по своим правилам и заметно отстал от розницы:
 * одна строка 73px против розничных двух и 109px, полупрозрачный материал
 * `glass` (он задуман для мобильного хрома, а не для десктопной шапки —
 * сквозь него просвечивал контент при прокрутке), телефон, приколотый
 * по центру через mx-auto, из-за чего правый блок ездил вместе с длиной
 * названия компании, и — главное — ни одной ссылки обратно в розницу.
 *
 * Теперь строение то же, что у розничной шапки: полоса доверия brand-900
 * (36px) + основная строка (72px), суммарно 109px. Первый элемент полосы —
 * переключатель «Розница | Опт»: он стоит на тех же координатах, что и в
 * рознице, поэтому дорога в обе стороны лежит в одном и том же месте.
 *
 * Десктоп и мобильный разведены на два <header>, как в рознице
 * (Header + MobileHeader): у них разные материалы и разные высоты, а одна
 * шапка на все ширины и была причиной расхождения. В DOM на каждой ширине
 * виден ровно один — второй убран display: none.
 *
 * Серверный компонент: интерактива нет, выход — нативная форма POST.
 */
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
      {/* ── Десктоп: две строки, 36 + 72 + 1 = 109px ── */}
      <header
        className="sticky top-0 z-40 hidden border-b border-line bg-surface lg:block"
        style={{ ["--header-h" as string]: "109px" }}
      >
        <div className="bg-brand-900 text-[13px] text-brand-100/85">
          <Container className="flex h-9 items-center justify-between gap-8">
            <div className="flex min-w-0 items-center gap-6">
              <SectionSwitch active="opt" retailUrl={retailUrl} />
              <a
                href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                className="flex shrink-0 items-center gap-1.5 font-semibold text-white transition hover:text-accent-200"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {settings.phone}
              </a>
              {/* Часы уступают место факту о производителе: тот отвечает на
                  первый вопрос закупщика, а часы дублируются в футере. */}
              <span className="hidden shrink-0 2xl:inline">
                Отдел оптовых продаж · {settings.workingHours}
              </span>
              {/* Юрлицо переехало сюда из чипа над заголовком лендинга: факт
                  о том, кто продаёт, в системе живёт в полосе доверия. */}
              <span className="hidden min-w-0 truncate lg:inline">
                Производитель — {settings.legalName || "ООО «Восток»"}, Россия
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-6">
              {/* Строки про отгрузку здесь нет: «от 10 шт — минимальная
                  отгрузка» стоит в полосе цифр сразу под первым экраном. */}
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-1.5 transition hover:text-white"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {settings.email}
              </a>
            </div>
          </Container>
        </div>

        <Container className="flex h-[var(--spacing-header)] items-center gap-6">
          <Link href="/opt" aria-label="ХАЯТ Опт — на главную" className="flex shrink-0 items-center gap-2.5">
            <Logo />
            <span className="flex h-7 items-center rounded-full bg-brand-800 px-2.5 text-xs font-extrabold uppercase tracking-wider text-white">
              Опт
            </span>
          </Link>
          {/* Пустое место на позиции розничного поиска: блок действий встаёт
              на тот же x, что «Корзина» в рознице. */}
          <div className="flex-1" />
          {actions}
        </Container>
      </header>

      {/* ── Мобильный: тот же материал, что у мобильной шапки розницы ── */}
      <header className="glass glass-extend sticky top-0 z-40 shadow-sm lg:hidden">
        {/* Спейсер под вырез: без него контент упирается в жёсткую линию. */}
        <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
        <Container className="flex items-center gap-2.5 py-2.5">
          <Link href="/opt" aria-label="ХАЯТ Опт — на главную" className="flex shrink-0 items-center gap-2">
            <Logo />
            <span className="flex h-6 items-center rounded-full bg-brand-800 px-2 text-xs font-extrabold uppercase tracking-wider text-white">
              Опт
            </span>
          </Link>
          <div className="flex-1" />
          {/* «Войти» и «Получить прайс» здесь не дублируем: оба есть в нижнем
              баре и в герое. Освободившееся место занимает переключатель —
              иначе он на 390px не помещается. */}
          <SectionSwitch tone="light" active="opt" retailUrl={retailUrl} />
        </Container>
      </header>
    </>
  );
}
