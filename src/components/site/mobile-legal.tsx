import Link from "next/link";
import { Container } from "@/components/ui/container";

/**
 * Компактный юридический блок для мобильного (футер на мобильном скрыт ради
 * app-стиля). Для магазина БАД дисклеймер и юр-ссылки обязаны быть доступны
 * с любого устройства — этот блок закрывает требование, не ломая вид приложения.
 */
export function MobileLegal({
  disclaimer,
  legalName,
  inn,
}: {
  disclaimer: string;
  legalName?: string | null;
  inn?: string | null;
}) {
  return (
    <div className="border-t border-line bg-surface-soft pt-6 lg:hidden">
      <Container className="pb-2">
        {disclaimer ? (
          <p className="rounded-2xl bg-surface-sunken px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {disclaimer}
          </p>
        ) : null}
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-ink-muted">
          <Link href="/about" className="hover:text-brand-700">О компании</Link>
          <Link href="/delivery" className="hover:text-brand-700">Доставка и оплата</Link>
          <Link href="/contacts" className="hover:text-brand-700">Контакты</Link>
          <Link href="/privacy-policy" className="hover:text-brand-700">Конфиденциальность</Link>
          <Link href="/oferta" className="hover:text-brand-700">Оферта</Link>
        </nav>
        <p className="mt-4 text-center text-[11px] text-ink-faint">
          © {new Date().getFullYear()} {legalName || "Компания ХАЯТ"}
          {inn ? ` · ИНН ${inn}` : ""}
        </p>
      </Container>
    </div>
  );
}
