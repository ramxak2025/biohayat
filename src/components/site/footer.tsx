import { ListLink as Link } from "@/components/ui/list-link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  Send,
  MessageCircle,
  Camera,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import type { SiteSettings, Category } from "@prisma/client";

/**
 * Футер на фирменном тёмно-зелёном (brand-900) — выразительный контраст
 * к светлому фону страницы. На мобильных — компактно: соцсети-кружки,
 * нативные <details>-аккордеоны со ссылками, контакты и мелкий юр-блок.
 * На десктопе — привычная сетка из четырёх колонок с чёткой иерархией.
 */
export function Footer({
  settings,
  categories,
}: {
  settings: SiteSettings;
  categories: Pick<Category, "slug" | "name">[];
}) {
  const customerLinks = [
    { href: "/about", label: "О компании" },
    { href: "/delivery", label: "Доставка и оплата" },
    { href: "/articles", label: "Статьи" },
    { href: "/contacts", label: "Контакты" },
    { href: "/privacy-policy", label: "Политика конфиденциальности" },
    { href: "/oferta", label: "Публичная оферта" },
  ];

  const socials = (
    <div className="flex gap-2.5">
      {settings.telegram ? (
        <SocialCircle href={settings.telegram} label="Telegram" icon={Send} />
      ) : null}
      {settings.whatsapp ? (
        <SocialCircle href={settings.whatsapp} label="WhatsApp" icon={MessageCircle} />
      ) : null}
      {settings.instagram ? (
        <SocialCircle href={settings.instagram} label="Instagram" icon={Camera} />
      ) : null}
    </div>
  );

  const catalogList = (
    <ul className="space-y-2.5 text-sm">
      {categories.slice(0, 7).map((c) => (
        <li key={c.slug}>
          <FooterLink href={`/category/${c.slug}`}>{c.name}</FooterLink>
        </li>
      ))}
      <li>
        <Link
          href="/catalog"
          className="font-semibold text-brand-200 transition hover:text-white"
        >
          Все товары →
        </Link>
      </li>
    </ul>
  );

  const customerList = (
    <ul className="space-y-2.5 text-sm">
      {customerLinks.map((l) => (
        <li key={l.href}>
          <FooterLink href={l.href}>{l.label}</FooterLink>
        </li>
      ))}
      {/* Выделен так же, как «Все товары →» в соседней колонке: рядовой
          ссылкой он потерялся бы между политикой конфиденциальности и
          офертой. На мобильном этот список свёрнут в аккордеон, поэтому там
          тот же вход продублирован отдельной плашкой ниже. */}
      <li>
        <Link
          href="/opt"
          data-to-opt
          // min-h-6: строчная ссылка давала цель высотой 17px — ниже
          // минимума WCAG 2.2 для размера цели (24px).
          className="inline-flex min-h-6 items-center font-semibold text-brand-200 transition hover:text-white"
        >
          Оптовым покупателям →
        </Link>
      </li>
    </ul>
  );

  return (
    <footer className="mt-auto bg-brand-900 pb-28 pt-10 text-white lg:pb-14 lg:pt-14">
      <Container>
        {/* ── Мобильная версия: компактно, аккордеоны ── */}
        <div className="lg:hidden">
          <div className="flex flex-col items-start gap-5">
            <Logo tone="inverted" />
            {socials}
          </div>

          <div className="mt-6 border-t border-white/10">
            <FooterAccordion title="Каталог">{catalogList}</FooterAccordion>
            <FooterAccordion title="Покупателям">{customerList}</FooterAccordion>
          </div>

          {/* Вход в опт — вне аккордеонов. Переключатель раздела живёт в
              десктопной шапке, на телефоне её нет, а внутри свёрнутого
              «Покупателям» ссылку было не найти: чтобы её увидеть, нужно было
              сначала догадаться раскрыть список. */}
          <Link
            href="/opt"
            data-to-opt
            className="mt-6 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 transition active:bg-white/15"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-bold text-white">Оптовым покупателям</span>
              <span className="mt-0.5 block text-xs text-white/65">
                Цены производителя от 10 шт · для аптек и магазинов
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-brand-200">→</span>
          </Link>

          <div className="mt-6 space-y-3">
            <a
              href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
              className="block text-xl font-extrabold tracking-tight text-white"
            >
              {settings.phone}
            </a>
            <ContactRow icon={Mail}>
              <a href={`mailto:${settings.email}`} className="transition hover:text-white">
                {settings.email}
              </a>
            </ContactRow>
            <ContactRow icon={MapPin}>{settings.address}</ContactRow>
            <ContactRow icon={Clock}>{settings.workingHours}</ContactRow>
          </div>
        </div>

        {/* ── Десктоп: сетка с понятной иерархией ── */}
        <div className="hidden gap-10 lg:grid lg:grid-cols-[1.25fr_1fr_1fr_1.1fr]">
          <div>
            <Logo tone="inverted" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Натуральная фитопродукция и БАД для здоровья всей семьи. Производство
              ООО «Восток», Россия.
            </p>
            <div className="mt-5">{socials}</div>
          </div>

          <div>
            <ColumnHeading>Каталог</ColumnHeading>
            {catalogList}
          </div>

          <div>
            <ColumnHeading>Покупателям</ColumnHeading>
            {customerList}
          </div>

          <div>
            <ColumnHeading>Контакты</ColumnHeading>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                  className="text-lg font-extrabold tracking-tight text-white transition hover:text-brand-200"
                >
                  {settings.phone}
                </a>
              </li>
              <li>
                <ContactRow icon={Mail}>
                  <a href={`mailto:${settings.email}`} className="transition hover:text-white">
                    {settings.email}
                  </a>
                </ContactRow>
              </li>
              <li>
                <ContactRow icon={MapPin}>{settings.address}</ContactRow>
              </li>
              <li>
                <ContactRow icon={Clock}>{settings.workingHours}</ContactRow>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Юр-блок: дисклеймер БАД, реквизиты, копирайт ── */}
        <div className="mt-8 border-t border-white/10 pt-5 lg:mt-12 lg:pt-6">
          {/* Предупреждение о БАД обязано быть читаемым — это требование к
              рекламе, а не мелкий шрифт для галочки. Было: 10px, капс на всю
              фразу, 45% белого, строка в 203 знака. Стало: 13px, мера ~75
              знаков, 70% белого (6.6:1). Капс остался только там, где его
              задал владелец в тексте настройки. */}
          <p className="mx-auto max-w-[60ch] text-[13px] font-medium leading-relaxed text-white/70 lg:text-center">
            {settings.badDisclaimer}
          </p>
          <div className="mt-4 flex flex-col gap-1.5 text-xs leading-relaxed text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <span>
              © {new Date().getFullYear()} {settings.legalName || "Компания ХАЯТ"}
              {settings.inn ? ` · ИНН ${settings.inn}` : ""}
              {settings.ogrn ? ` · ОГРН ${settings.ogrn}` : ""}
            </span>
            <span>Все права защищены</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}

/**
 * Заголовок колонки на десктопе.
 *
 * Уровень h2, а не h3: колонки футера — разделы того же уровня, что и секции
 * страницы. С h3 после h1 страницы получался разрыв в уровнях (h1 → h3), по
 * которому скринридер строит навигацию.
 */
function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-white/55">
      {children}
    </h2>
  );
}

/** Нативный аккордеон для мобильного футера. */
function FooterAccordion({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-white/10">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between py-3.5 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-white/50 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-white/70 transition hover:text-white">
      {children}
    </Link>
  );
}

function ContactRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-start gap-2.5 text-sm text-white/70">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
      <span>{children}</span>
    </span>
  );
}

function SocialCircle({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
    >
      <Icon className="h-[18px] w-[18px]" />
    </a>
  );
}
