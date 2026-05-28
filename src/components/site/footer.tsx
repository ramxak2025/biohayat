import Link from "next/link";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import type { SiteSettings, Category } from "@prisma/client";

export function Footer({
  settings,
  categories,
}: {
  settings: SiteSettings;
  categories: Pick<Category, "slug" | "name">[];
}) {
  return (
    <footer className="mt-auto border-t border-line bg-surface-soft pb-[calc(var(--spacing-mobnav)+1rem)] pt-12 lg:pb-12">
      <Container>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-muted">
              Натуральная фитопродукция и БАД для здоровья всей семьи. Производство ООО
              «Восток», Россия.
            </p>
            <div className="mt-4 flex gap-3">
              {settings.telegram ? (
                <SocialLink href={settings.telegram} label="Telegram" />
              ) : null}
              {settings.whatsapp ? (
                <SocialLink href={settings.whatsapp} label="WhatsApp" />
              ) : null}
              {settings.instagram ? (
                <SocialLink href={settings.instagram} label="Instagram" />
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-bold">Каталог</h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              {categories.slice(0, 7).map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="hover:text-brand-700">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/catalog" className="font-semibold hover:text-brand-700">
                  Все товары →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-bold">Покупателям</h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li><Link href="/about" className="hover:text-brand-700">О компании</Link></li>
              <li><Link href="/delivery" className="hover:text-brand-700">Доставка и оплата</Link></li>
              <li><Link href="/articles" className="hover:text-brand-700">Статьи</Link></li>
              <li><Link href="/contacts" className="hover:text-brand-700">Контакты</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-brand-700">Политика конфиденциальности</Link></li>
              <li><Link href="/oferta" className="hover:text-brand-700">Публичная оферта</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-bold">Контакты</h3>
            <ul className="space-y-3 text-sm text-ink-muted">
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-ink hover:text-brand-700">
                  {settings.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <a href={`mailto:${settings.email}`} className="hover:text-brand-700">{settings.email}</a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <span>{settings.workingHours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-surface-sunken px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {settings.badDisclaimer}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} {settings.legalName || "Компания ХАЯТ"}
            {settings.inn ? ` · ИНН ${settings.inn}` : ""}
            {settings.ogrn ? ` · ОГРН ${settings.ogrn}` : ""}
          </span>
          <span>Все права защищены</span>
        </div>
      </Container>
    </footer>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 items-center rounded-full bg-surface px-3 text-xs font-semibold text-ink-muted shadow-xs ring-1 ring-line transition hover:text-brand-700"
    >
      {label}
    </a>
  );
}
