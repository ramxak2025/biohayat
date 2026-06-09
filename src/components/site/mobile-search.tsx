"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowUpRight, Loader2 } from "lucide-react";
import { getSearchSuggestions } from "@/app/actions/search";
import { cn } from "@/lib/utils";

type Suggestion = { slug: string; name: string };

const POPULAR = ["Витамин D3", "Коллаген", "Омега-3", "Масло чёрного тмина", "Мёд", "Цинк"];

/**
 * Мобильный поиск: капсула bg-surface на кремовом фоне страницы (bg-bg) —
 * выглядит частью приложения, а не белой полосой. По тапу — полноэкранный
 * оверлей с живыми подсказками (учитывает опечатки). Только на мобильных.
 */
export function MobileSearch() {
  const [open, setOpen] = useState(false);

  // блокируем прокрутку фона, когда оверлей открыт
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 bg-bg/90 px-3 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center gap-2.5 rounded-2xl bg-surface px-4 text-left text-[15px] text-ink-faint shadow-xs ring-1 ring-line transition active:scale-[0.99]"
        >
          <Search className="h-5 w-5 text-brand-500" />
          Поиск: витамин D3, коллаген, мёд…
        </button>
      </div>

      {open ? <SearchOverlay onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // дебаунс живых подсказок
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        const res = await getSearchSuggestions(term);
        setItems(res);
      });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  function go(url: string) {
    onClose();
    router.push(url);
  }

  function submit(term: string) {
    const v = term.trim();
    if (v.length < 1) return;
    go(`/search?q=${encodeURIComponent(v)}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden animate-fade-up">
      {/* строка ввода — та же капсула, что и в закрытом состоянии */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <form
          role="search"
          aria-label="Поиск по каталогу"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit(q);
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="search"
            enterKeyHint="search"
            aria-label="Поиск товаров"
            placeholder="Что ищете?"
            className="h-11 w-full rounded-2xl bg-surface pl-11 pr-10 text-[15px] shadow-xs ring-1 ring-line placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-surface-soft"
              aria-label="Очистить"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>
        <button onClick={onClose} className="shrink-0 px-1 text-[15px] font-semibold text-brand-700">
          Отмена
        </button>
      </div>

      {/* результаты / подсказки */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {q.trim().length < 2 ? (
          <div>
            <div className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wide text-ink-faint">Популярное</div>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="rounded-full bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-xs ring-1 ring-line transition active:scale-95"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : pending && items.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-6 text-ink-faint">
            <Loader2 className="h-4 w-4 animate-spin" /> Ищем…
          </div>
        ) : items.length === 0 ? (
          <div className="px-2 py-6 text-ink-muted">
            Ничего не нашли по «{q.trim()}». Нажмите «Найти» для полного поиска.
          </div>
        ) : (
          <ul className="rounded-2xl bg-surface p-1.5 shadow-sm ring-1 ring-line/70">
            {items.map((it) => (
              <li key={it.slug}>
                <button
                  onClick={() => go(`/product/${it.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:bg-surface-soft"
                >
                  <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="flex-1 text-[15px] text-ink">{it.name}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint" />
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={() => submit(q)}
                className={cn(
                  "mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 px-3 py-3 text-[15px] font-semibold text-brand-700",
                )}
              >
                Показать все результаты по «{q.trim()}»
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
