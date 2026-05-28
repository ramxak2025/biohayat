import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/prose";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    { title: "Контакты", description: "Контакты компании ХАЯТ: телефон, адрес, e-mail.", path: "/contacts" },
    settings,
  );
}

export default async function ContactsPage() {
  const settings = await getSettings();
  const rows = [
    { icon: Phone, label: "Телефон", value: settings.phone, href: `tel:${settings.phone.replace(/[^\d+]/g, "")}` },
    { icon: Mail, label: "E-mail", value: settings.email, href: `mailto:${settings.email}` },
    { icon: MapPin, label: "Адрес", value: settings.address },
    { icon: Clock, label: "Режим работы", value: settings.workingHours },
  ];

  return (
    <>
      <PageHero title="Контакты" subtitle="Свяжитесь с нами любым удобным способом" />
      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-start gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm text-ink-faint">{r.label}</div>
                    {r.href ? (
                      <a href={r.href} className="text-lg font-bold text-ink hover:text-brand-700">{r.value}</a>
                    ) : (
                      <div className="text-lg font-bold text-ink">{r.value}</div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-2">
              {settings.telegram ? <Social href={settings.telegram} label="Telegram" /> : null}
              {settings.whatsapp ? <Social href={settings.whatsapp} label="WhatsApp" /> : null}
              {settings.instagram ? <Social href={settings.instagram} label="Instagram" /> : null}
              {settings.wildberries ? <Social href={settings.wildberries} label="Wildberries" /> : null}
            </div>
          </div>

          {/* карта-заглушка */}
          <div className="overflow-hidden rounded-2xl bg-surface-soft ring-1 ring-line">
            <div className="img-placeholder flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-ink-muted">
              Карта проезда (Яндекс.Карты) — вставьте код виджета в настройках.
            </div>
          </div>
        </div>

        <p className="mt-8 rounded-2xl bg-surface-sunken px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {settings.badDisclaimer}
        </p>
      </Container>
    </>
  );
}

function Social({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink-muted ring-1 ring-line hover:text-brand-700">
      {label}
    </a>
  );
}
