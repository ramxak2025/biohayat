"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, Loader2, X } from "lucide-react";
import { getSearchSuggestions } from "@/app/actions/search";
import { cn } from "@/lib/utils";

type Suggestion = { slug: string; name: string };

/**
 * Десктопный поиск с живыми подсказками и клавиатурной навигацией
 * (стрелки/Enter/Escape). Раскрывающаяся панель под строкой ввода;
 * закрывается по клику вне и по Escape.
 */
export function HeaderSearch() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, start] = useTransition();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

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
        setActive(-1);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // закрытие по клику вне
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  function submit(term: string) {
    const v = term.trim();
    if (v.length < 1) return;
    go(`/search?q=${encodeURIComponent(v)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (active >= 0 && items[active]) {
        e.preventDefault();
        go(`/product/${items[active].slug}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative flex-1">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="header-search-suggestions"
          aria-autocomplete="list"
          aria-label="Поиск товаров"
          autoComplete="off"
          placeholder="Поиск товаров: витамин D3, коллаген, мёд…"
          className="h-11 w-full rounded-full border border-line bg-surface-soft pl-11 pr-10 text-[15px] placeholder:text-ink-faint focus:border-brand-300 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setItems([]);
            }}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-surface-soft"
            aria-label="Очистить"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {showPanel ? (
        <div
          id="header-search-suggestions"
          role="listbox"
          className="animate-fade-up absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
        >
          {pending && items.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-ink-faint">
              <Loader2 className="h-4 w-4 animate-spin" /> Ищем…
            </div>
          ) : items.length === 0 ? (
            <button
              type="button"
              onClick={() => submit(q)}
              className="flex w-full items-center gap-2 px-4 py-4 text-left text-sm text-ink-muted hover:bg-surface-soft"
            >
              <Search className="h-4 w-4 shrink-0 text-ink-faint" />
              Ничего не нашли — искать «{q.trim()}» в каталоге
            </button>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1.5">
              {items.map((it, i) => (
                <li key={it.slug} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(`/product/${it.slug}`)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors",
                      i === active ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-surface-soft",
                    )}
                  >
                    <Search className="h-4 w-4 shrink-0 text-ink-faint" />
                    <span className="flex-1 truncate">{it.name}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </button>
                </li>
              ))}
              <li className="mt-1 border-t border-line">
                <button
                  type="button"
                  onClick={() => submit(q)}
                  className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Показать все результаты по «{q.trim()}»
                </button>
              </li>
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
