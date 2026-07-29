import { ListLink as Link } from "@/components/ui/list-link";
import { ArrowRight } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";

/** Фирменный лист — тот же path, что в логотипе (src/components/site/logo.tsx). */
const LEAF_PATH =
  "M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z";

/**
 * Блок «Распродажа» — тёмно-зелёный (brand-800) с крупным листом-декором.
 *
 * Пульсации у чипа «−40%» больше нет. Мигающая красная точка — сигнал
 * дискаунтера: она подгоняет, а производителю БАД покупатель должен доверять,
 * а не спешить. Размер скидки и так самый крупный элемент блока — этого
 * достаточно, чтобы её заметили.
 */
export function SaleBanner() {
  return (
    <Link
      href="/sale"
      className="group relative block overflow-hidden rounded-3xl bg-brand-800 px-5 py-6 text-white shadow-md transition active:scale-[0.995] sm:px-10 sm:py-8"
    >
      {/* декоративный лист за контентом */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rotate-[24deg] fill-white/[0.07] transition-transform duration-700 group-hover:rotate-[18deg] sm:-right-4 sm:-top-16 sm:h-72 sm:w-72"
      >
        <path d={LEAF_PATH} />
      </svg>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="tnum inline-flex items-center rounded-full bg-sale px-3 py-1 text-sm font-extrabold leading-none">
              −40%
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">
              Распродажа
            </span>
          </span>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            Скидки до <CountUp to={40} prefix="−" suffix="%" /> на хиты
          </h2>
          <p className="mt-1.5 text-sm text-white/80 sm:text-base">
            И ещё <CountUp to={25} prefix="−" suffix="%" className="font-bold" /> на первый заказ по промокоду{" "}
            <span className="font-bold text-accent-200">FREE25Hayat</span>
          </p>
        </div>
        {/* Тёмный текст на янтаре, а не белый: белый на #e7a124 даёт 2.2:1 —
            вдвое ниже порога AA. Тёмный — 6.8:1. */}
        <span className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-accent-400 px-6 text-sm font-bold text-ink shadow-sm transition group-hover:gap-3 group-hover:bg-accent-300 sm:h-12 sm:self-auto sm:text-base">
          Смотреть <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
