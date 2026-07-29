"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListLink as Link } from "@/components/ui/list-link";
import { X } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import type { StoryData } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STORY_MS = 6000;

/** Насколько нужно утянуть просмотрщик вниз, чтобы он закрылся, px. */
const CLOSE_AT = 110;
/** Быстрый бросок закрывает раньше: порог скорости, px/мс. */
const FLING_SPEED = 0.45;
/** Сдвиг, после которого касание считается перетаскиванием, а не тапом, px. */
const DRAG_SLOP = 8;

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
      <div data-stories className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1">
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
            <span className="line-clamp-1 max-w-[72px] text-xs font-medium text-ink-muted">
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
  // Пауза, пока палец на экране: так же ведут себя сторис в приложениях —
  // задержал, чтобы дочитать, и лента не убегает.
  const [held, setHeld] = useState(false);
  const story = stories[idx];

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  // Накопленное время показа: пауза не должна обнулять прогресс.
  const elapsedRef = useRef(0);

  const next = useCallback(() => {
    setIdx((i) => {
      if (i < stories.length - 1) return i + 1;
      onClose();
      return i;
    });
  }, [stories.length, onClose]);

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  // Смена слайда — прогресс с нуля.
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [idx]);

  // Авто-прогресс текущей сторис. Время копится в ref, поэтому пауза
  // останавливает полоску там, где она была, а не сбрасывает её.
  useEffect(() => {
    if (held) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      elapsedRef.current += now - last;
      last = now;
      const p = Math.min(1, elapsedRef.current / STORY_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        next();
      }
    }, 50);
    return () => clearInterval(id);
  }, [idx, held, next]);

  // Блокируем фон.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Esc закрывает — на десктопе это первое, что пробуют.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  const drag = useStoryDrag({ sheetRef, backdropRef, onClose, setHeld });

  // Портал в body: при app-scroll архитектуре fixed-оверлей внутри
  // контейнера прокрутки не накрывает шапку/нижний бар — выносим в корень.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Истории: ${story.title}`}
      className="fixed inset-0 z-[100]"
      // Вертикальный жест обрабатываем сами: иначе браузер перехватит его
      // под «потянуть, чтобы обновить» и прокрутку страницы под оверлеем.
      style={{ touchAction: "none" }}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      // После перетаскивания клик по зонам переключения не нужен: палец
      // двигали, чтобы закрыть, а не чтобы пролистнуть.
      onClickCapture={drag.onClickCapture}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-black/95" />

      <div ref={sheetRef} className="relative flex h-full flex-col overflow-hidden">
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

        {/* Полоска-ручка: показывает, что окно можно утянуть вниз. Без неё
            жест приходится угадывать, а крестик в углу — единственный
            заметный способ выйти. */}
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-white/35" />
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
      </div>
    </div>,
    document.body,
  );
}

/**
 * Жест «потянуть вниз, чтобы закрыть» — как в сторис мобильных приложений.
 *
 * Раньше выйти можно было только крестиком в углу: до него нужно дотянуться
 * большим через весь экран, а рука в этот момент держит телефон снизу.
 * Привычный жест — потянуть окно вниз, и оно уезжает.
 *
 * Окно следует за пальцем, слегка уменьшается и скругляет углы — по этому
 * видно, что оно «отклеилось» и его отпускание что-то изменит. Фон при этом
 * светлеет: становится видно, куда вернёшься. Отпустили за порогом или
 * бросили резко — уезжает; не дотянули — возвращается на место.
 *
 * Позиция пишется прямо в стиль узла, а не через состояние React: жест идёт
 * по кадру на каждое движение пальца, и перерисовка всего просмотрщика на
 * каждый кадр была бы заметна рывками.
 */
function useStoryDrag({
  sheetRef,
  backdropRef,
  onClose,
  setHeld,
}: {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  setHeld: (v: boolean) => void;
}) {
  const startY = useRef(0);
  const startX = useRef(0);
  const lastY = useRef(0);
  // Скорость считаем по окну последних движений, а не по одному последнему:
  // одиночная выборка шумит, и нормальный бросок иногда не распознавался.
  const samples = useRef<{ y: number; t: number }[]>([]);
  const dragging = useRef(false);
  const moved = useRef(false);
  const captured = useRef(false);
  const closing = useRef(false);

  /**
   * Скорость по вертикали за последние 120 мс, px/мс.
   *
   * Время берём из performance.now(), а не из event.timeStamp: у событий,
   * приходящих пачкой, штампы совпадают, и разница времени выходит нулевой —
   * бросок тогда считается стоянием на месте. Это же защищает от браузеров,
   * которые огрубляют timeStamp из соображений приватности.
   */
  const speed = () => {
    const s = samples.current;
    if (s.length < 2) return 0;
    const last = s[s.length - 1];
    const first = s.find((p) => last.t - p.t <= 120) ?? s[0];
    const dt = last.t - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
  };

  const paint = (dy: number) => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet) return;
    // Сопротивление: чем дальше тянут, тем медленнее едет — так жест
    // ощущается материальным, а не «проваливающимся».
    const eased = dy > 0 ? dy : dy / 4;
    const t = Math.min(1, Math.max(0, dy) / 400);
    sheet.style.transform = `translate3d(0, ${eased}px, 0) scale(${1 - t * 0.08})`;
    sheet.style.borderRadius = `${t * 28}px`;
    if (backdrop) backdrop.style.opacity = String(1 - t * 0.55);
  };

  const settle = (ms: number) => {
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
    if (sheet) sheet.style.transition = `transform ${ms}ms ${ease}, border-radius ${ms}ms ${ease}`;
    if (backdrop) backdrop.style.transition = `opacity ${ms}ms ${ease}`;
  };

  const reduceMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onPointerDown = (e: React.PointerEvent) => {
    if (closing.current || e.button !== 0) return;
    dragging.current = true;
    moved.current = false;
    captured.current = false;
    startY.current = e.clientY;
    startX.current = e.clientX;
    lastY.current = e.clientY;
    samples.current = [{ y: e.clientY, t: performance.now() }];
    setHeld(true);
    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (sheet) sheet.style.transition = "";
    if (backdrop) backdrop.style.transition = "";
    // Указатель НЕ захватываем здесь. Захват переадресует последующие
    // события на элемент захвата, и обычный тап переставал доходить до зон
    // переключения — истории не листались. Захват включается ниже, когда
    // движение уже опознано как перетаскивание.
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || closing.current) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;
    lastY.current = e.clientY;
    samples.current.push({ y: e.clientY, t: performance.now() });
    if (samples.current.length > 12) samples.current.shift();

    if (!moved.current) {
      if (Math.abs(dy) < DRAG_SLOP && Math.abs(dx) < DRAG_SLOP) return;
      // Ведём только вертикальный жест: горизонтальное движение — это
      // промах по зоне переключения, окно от него ездить не должно.
      if (Math.abs(dx) > Math.abs(dy)) return;
      moved.current = true;
      captured.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    paint(dy);
  };

  /**
   * Завершение жеста. Позицию берём из ref, а не из события: при резком
   * броске браузер вместо pointerup присылает pointercancel с нулевыми
   * координатами, и решение считалось бы по несуществующей точке — окно
   * возвращалось на место, хотя человек его отбросил.
   */
  const finish = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    setHeld(false);
    if (captured.current) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      captured.current = false;
    }
    if (!moved.current) return;

    const dy = lastY.current - startY.current;
    const shouldClose = dy > CLOSE_AT || (dy > 30 && speed() > FLING_SPEED);

    if (shouldClose) {
      closing.current = true;
      if (reduceMotion()) {
        onClose();
        return;
      }
      const sheet = sheetRef.current;
      const backdrop = backdropRef.current;
      settle(220);
      if (sheet) {
        sheet.style.transform = `translate3d(0, ${window.innerHeight}px, 0) scale(0.92)`;
        sheet.style.borderRadius = "28px";
      }
      if (backdrop) backdrop.style.opacity = "0";
      window.setTimeout(onClose, 200);
      return;
    }

    // Не дотянули — возвращаем на место.
    settle(reduceMotion() ? 0 : 280);
    paint(0);
  };

  // Клик после перетаскивания гасим: иначе отпускание над правой третью
  // экрана заодно пролистывало бы историю.
  const onClickCapture = (e: React.MouseEvent) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp: finish, onClickCapture };
}
