import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  CalendarClock,
  ClipboardCheck,
  Factory,
  FileText,
  Gift,
  Megaphone,
  PhoneCall,
  Truck,
  ChevronDown,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { MarginCalculator } from "@/components/opt/margin-calculator";
import { getB2BAccount } from "@/lib/b2b-auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Фирменный лист (как в логотипе) — декор hero и финального CTA. */
function Leaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
    </svg>
  );
}

/**
 * Лендинг оптового направления — для гостей. Залогиненных уводим сразу
 * в рабочие разделы: APPROVED → прайс, PENDING/REJECTED → статусный экран.
 */
export default async function OptLandingPage() {
  const account = await getB2BAccount();
  if (account) {
    redirect(account.status === "APPROVED" ? "/opt/price" : "/opt/pending");
  }
  const settings = await getSettings();

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-linear-to-b from-brand-50 to-bg">
        <Leaf className="pointer-events-none absolute -right-16 -top-20 h-[420px] w-[420px] rotate-12 text-brand-100 sm:-right-8 lg:right-12" />
        <Leaf className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 -rotate-45 text-brand-100/60" />
        <Container className="relative py-14 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-brand-800 shadow-xs ring-1 ring-brand-200">
              <Factory className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Производитель — {settings.legalName || "ООО «Восток»"}, Россия
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
              Оптовые поставки натуральных БАД{" "}
              <span className="text-brand-700">ХАЯТ</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Прямые цены производителя без посредников: фитопродукция, витамины,
              коллаген, масло чёрного тмина. Для аптек, магазинов здорового
              питания, маркетплейс-продавцов и дистрибьюторов.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/opt/register"
                className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-accent-400 px-7 text-base font-bold text-white shadow-sm transition hover:bg-accent-500 active:bg-accent-600"
              >
                Получить оптовый прайс
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/opt/login"
                className="inline-flex h-14 items-center justify-center rounded-full border border-line-strong bg-surface px-7 text-base font-semibold text-ink transition hover:bg-surface-soft"
              >
                Войти
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              Заявка рассматривается за один рабочий день, без обязательств.
            </p>
          </div>
        </Container>
      </section>

      {/* ── Полоса доверия: цифры ── */}
      <section className="border-y border-line bg-surface">
        <Container className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
          {[
            { value: "119+", label: "позиций в оптовом прайсе" },
            { value: "до −38%", label: "скидка от розничной цены" },
            { value: "Россия", label: "собственное производство" },
            { value: "от 10 шт", label: "минимальная отгрузка" },
          ].map((item) => (
            <div key={item.label} className="px-4 py-6 text-center sm:py-8">
              <p className="tnum text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-muted sm:text-sm">
                {item.label}
              </p>
            </div>
          ))}
        </Container>
      </section>

      {/* ── Калькулятор выгоды ── */}
      <section className="py-12 sm:py-16" id="calculator">
        <Container>
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Посчитайте свою выгоду
            </h2>
            <p className="mt-2 text-ink-muted">
              Передвиньте ползунок под свой объём закупки — и увидите, сколько
              остаётся в вашем бизнесе каждый месяц.
            </p>
          </div>
          <MarginCalculator />
        </Container>
      </section>

      {/* ── Как работаем: 3 шага ── */}
      <section className="bg-surface-soft py-12 sm:py-16">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Как начать работать
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: FileText,
                step: "1",
                title: "Оставляете заявку",
                text: "Две минуты на форму: компания, телефон и пара слов о том, что и где продаёте.",
              },
              {
                icon: PhoneCall,
                step: "2",
                title: "Менеджер подтверждает за 1 день",
                text: "Связываемся, отвечаем на вопросы и открываем доступ к персональному прайс-листу.",
              },
              {
                icon: Truck,
                step: "3",
                title: "Отгрузка и документы",
                text: "Собираем заказ, отправляем транспортной компанией и передаём полный пакет закрывающих документов.",
              },
            ].map((s) => (
              <div key={s.step} className="relative rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line">
                <span className="tnum absolute right-5 top-4 text-4xl font-extrabold text-brand-100">
                  {s.step}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <s.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Что получают партнёры ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Что получают партнёры
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: BadgePercent,
                title: "Прямые цены производителя",
                text: "Без посредников и наценок дистрибьюторов — лесенка скидок растёт вместе с объёмом.",
              },
              {
                icon: Gift,
                title: "Образцы продукции",
                text: "По запросу подберём образцы ходовых позиций, чтобы вы оценили качество до закупки.",
              },
              {
                icon: Megaphone,
                title: "Маркетинговые материалы",
                text: "Фото, описания и материалы о продукции — для витрин, карточек на маркетплейсах и соцсетей.",
              },
              {
                icon: CalendarClock,
                title: "Гибкие условия оплаты",
                text: "Постоянным партнёрам — отсрочка платежа по договорённости с менеджером.",
              },
            ].map((b) => (
              <div key={b.title} className="rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
                  <b.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-bold text-ink">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{b.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-surface-soft py-12 sm:py-16">
        <Container className="max-w-3xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Частые вопросы
          </h2>
          <div className="mt-6 space-y-3">
            {[
              {
                q: "Какой минимальный заказ?",
                a: "От 10 штук одной позиции — с этого порога уже действует оптовая цена. Чем больше объём, тем ниже цена за штуку: лесенка скидок видна по каждой позиции в прайс-листе.",
              },
              {
                q: "Как устроена доставка?",
                a: "Отгружаем транспортными компаниями по всей России (СДЭК, Деловые Линии, ПЭК и другие — на ваш выбор). Срок и стоимость зависят от региона; менеджер рассчитает их при подтверждении заявки.",
              },
              {
                q: "Как происходит оплата?",
                a: "Безналичный расчёт по счёту для ИП и ООО с полным пакетом закрывающих документов. Постоянным партнёрам возможна отсрочка платежа по договорённости.",
              },
              {
                q: "Когда я увижу точные оптовые цены?",
                a: "Сразу после одобрения заявки — обычно в течение одного рабочего дня. В личном кабинете откроется прайс-лист со всеми позициями и лесенкой цен по объёмам.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-surface shadow-xs ring-1 ring-line open:shadow-sm"
              >
                <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-4 px-5 py-4 font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Финальный CTA ── */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-brand-800 px-6 py-10 text-white sm:px-12 sm:py-14">
            <Leaf className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rotate-12 text-white/10" />
            <Leaf className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 -rotate-30 text-white/5" />
            <div className="relative max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
                Начните зарабатывать на продукции ХАЯТ
              </h2>
              <p className="mt-3 text-brand-100">
                Оставьте заявку — менеджер откроет вам персональный прайс-лист
                в течение одного рабочего дня.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/opt/register"
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-accent-400 px-7 text-base font-bold text-white shadow-sm transition hover:bg-accent-500 active:bg-accent-600"
                >
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                  Получить оптовый прайс
                </Link>
                <a
                  href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                  className="tnum inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-5 text-lg font-extrabold tracking-tight text-white transition hover:text-accent-200"
                >
                  <PhoneCall className="h-5 w-5 text-brand-300" aria-hidden="true" />
                  {settings.phone}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
