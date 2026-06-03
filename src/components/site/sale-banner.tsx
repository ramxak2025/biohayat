import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";

/**
 * Яркий анимированный блок «Распродажа» — с бегущим бликом (shine) и
 * пульсирующей меткой, чтобы притягивать взгляд (приём из психологии продаж:
 * срочность + выгода).
 */
export function SaleBanner() {
  return (
    <Link
      href="/sale"
      className="shine group relative block overflow-hidden rounded-3xl px-6 py-7 text-white shadow-lg transition active:scale-[0.995] sm:px-10 sm:py-9"
      style={{
        background:
          "linear-gradient(100deg, #e1463f 0%, #e85d2a 45%, #e79a18 100%)",
      }}
    >
      {/* декоративные круги */}
      <span className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-black/5" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="sale-pulse inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wide backdrop-blur">
            <Flame className="h-3.5 w-3.5" /> Распродажа
          </span>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
            Скидки до −40% на хиты
          </h2>
          <p className="mt-1.5 text-white/90">
            И ещё −25% на первый заказ по промокоду{" "}
            <span className="font-bold">FREE25Hayat</span>
          </p>
        </div>
        <span className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-white px-6 font-bold text-[#d23a2e] shadow-sm transition group-hover:gap-3 sm:self-auto">
          Смотреть <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
