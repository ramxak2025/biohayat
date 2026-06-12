import Link from "next/link";
import { Mail, MapPin, Clock, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/site/logo";
import type { SiteSettings } from "@prisma/client";

/**
 * Футер оптового поддомена — компактная B2B-версия фирменного тёмно-зелёного
 * футера розницы: реквизиты производителя, контакты отдела опта, минимум
 * ссылок. Без каталога и «магазинных» разделов.
 */
export function OptFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="mt-auto bg-brand-900 pb-10 pt-12 text-white">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1.1fr]">
          {/* Бренд + суть предложения */}
          <div>
            <div className="flex items-center gap-2.5">
              <Logo tone="inverted" />
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                Опт
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Оптовые поставки натуральных витаминов и БАД напрямую от
              производителя — {settings.legalName || "ООО «Восток»"}, Россия.
            </p>
          </div>

          {/* Партнёрам */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-white/45">
              Партнёрам
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/opt/register" className="text-white/70 transition hover:text-white">
                  Стать партнёром
                </Link>
              </li>
              <li>
                <Link href="/opt/price" className="text-white/70 transition hover:text-white">
                  Прайс-лист
                </Link>
              </li>
              <li>
                <Link href="/opt/login" className="text-white/70 transition hover:text-white">
                  Вход для партнёров
                </Link>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_SITE_URL || "https://biohayat.ru"}
                  className="font-semibold text-brand-200 transition hover:text-white"
                >
                  Розничный сайт biohayat.ru →
                </a>
              </li>
            </ul>
          </div>

          {/* Контакты отдела опта */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-white/45">
              Отдел оптовых продаж
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                  className="tnum flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-white transition hover:text-brand-200"
                >
                  <Phone className="h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-white/70">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                <a href={`mailto:${settings.email}`} className="transition hover:text-white">
                  {settings.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-white/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-start gap-2.5 text-white/70">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                <span>{settings.workingHours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Юр-блок */}
        <div className="mt-10 border-t border-white/10 pt-5">
          <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-white/45 md:text-center md:text-xs">
            {settings.badDisclaimer}
          </p>
          <div className="mt-4 flex flex-col gap-1.5 text-[10px] leading-relaxed text-white/40 sm:flex-row sm:items-center sm:justify-between md:text-xs">
            <span>
              © {new Date().getFullYear()} {settings.legalName || "ООО «Восток»"}
              {settings.inn ? ` · ИНН ${settings.inn}` : ""}
              {settings.ogrn ? ` · ОГРН ${settings.ogrn}` : ""}
            </span>
            <span>Работаем с ИП и юридическими лицами по всей России</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
