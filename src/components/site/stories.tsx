"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import type { StoryData } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STORY_MS = 6000;

/**
 * Сторис на главной: лента кружков + полноэкранный просмотрщик с
 * прогресс-полосками, авто-переключением и навигацией по тапу
 * (как в мобильных приложениях). На десктопе — те же кружки, просмотр в модалке.
 */
export function Stories({ stories }: { stories: StoryData[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (stories.length === 0) return null;

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1">
        {stories.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 active:scale-95"
          >
            <span className="rounded-full bg-gradient-to-tr from-brand-500 to-accent-400 p-[2.5px]">
              <span className="block rounded-full bg-bg p-[2px]">
                <SmartImage
                  src={s.cover}
                  alt={s.title}
                  ratio="1/1"
                  rounded="rounded-full"
                  className="h-14 w-14"
                  sizes="56px"
                />
              </span>
            </span>
            <span className="line-clamp-1 max-w-[72px] text-[11px] font-medium text-ink-muted">
              {s.title}
            </span>
          </button>
        ))}
      </div>

      {active !== null ? (
        <StoryViewer
          stories={stories}
          start={active}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}

function StoryViewer({
  stories, start, onClose,
}: {
  stories: StoryData[];
  start: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(start);
  const [progress, setProgress] = useState(0);
  const story = stories[idx];

  // Интервал пересоздаётся на каждый слайд (deps [idx]) — замыкание всегда свежее
  const next = () => {
    if (idx < stories.length - 1) {
      setIdx((i) => i + 1);
      setProgress(0);
    } else onClose();
  };
  const prev = () => {
    if (idx > 0) {
      setIdx((i) => i - 1);
      setProgress(0);
    }
  };

  // авто-прогресс текущей сторис
  useEffect(() => {
    setProgress(0);
    const started = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / STORY_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        next();
      }
    }, 50);
    return () => clearInterval(id);
  }, [idx]);

  // блокируем фон
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Портал в body: при app-scroll архитектуре fixed-оверлей внутри
  // контейнера прокрутки не накрывает шапку/нижний бар — выносим в корень.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      {/* прогресс-полоски */}
      <div className="flex gap-1 px-3 pt-[max(12px,env(safe-area-inset-top))]">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full bg-white"
              style={{ width: i < idx ? "100%" : i === idx ? `${progress * 100}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-white">
        <span className="text-sm font-semibold">{story.title}</span>
        <button onClick={onClose} aria-label="Закрыть" className="p-1 active:scale-90">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* контент + зоны тапа */}
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <SmartImage
              src={story.image || story.cover}
              alt={story.title}
              ratio="4/5"
              rounded="rounded-2xl"
              sizes="(max-width: 768px) 100vw, 420px"
            />
            {story.text ? (
              <p className="mt-4 text-center text-[15px] leading-relaxed text-white/90">
                {story.text}
              </p>
            ) : null}
            {story.link ? (
              <Link
                href={story.link}
                onClick={onClose}
                className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-white text-[15px] font-bold text-brand-700 active:scale-[0.98]"
              >
                {story.ctaLabel || "Подробнее"}
              </Link>
            ) : null}
          </div>
        </div>

        {/* левая/правая зоны переключения (CTA-кнопка перекрывает их по z) */}
        <button
          aria-label="Назад"
          onClick={prev}
          className={cn("absolute inset-y-0 left-0 w-1/3", idx === 0 && "pointer-events-none")}
        />
        <button
          aria-label="Дальше"
          onClick={next}
          className="absolute inset-y-0 right-0 w-1/3"
        />
      </div>
    </div>,
    document.body,
  );
}