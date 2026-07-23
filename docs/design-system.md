# Дизайн-система ХАЯТ

Вдохновлено подходом **ВкусВилл**: чисто, воздушно, натурально. Свежий природный
зелёный, мягкие тени, щедрые скругления, дружелюбный геометрический гротеск.

Все токены заданы в `src/app/globals.css` (`@theme`) и доступны как утилиты Tailwind.

## Цвета

### Бренд (зелёный)
| Токен | HEX | Применение |
|---|---|---|
| `brand-50` | `#f0f9f1` | фоны, подложки иконок |
| `brand-100` | `#dbf0de` | hover-фоны |
| `brand-500` | `#3a9447` | **основной акцент**, кнопки, активные состояния |
| `brand-600` | `#2c7838` | hover кнопок |
| `brand-700` | `#245f2f` | текст-акцент, ссылки |

### Акцент (мёд / янтарь) — акции, бейджи
`accent-400 #e7a124`, `accent-500 #d98a12`, `accent-600 #b86e0e`

### Нейтральные (тёплый серо-зелёный)
| Токен | HEX | Применение |
|---|---|---|
| `ink` | `#1a1d1a` | основной текст |
| `ink-muted` | `#5b635b` | вторичный текст |
| `ink-faint` | `#6b716a` | подписи, плейсхолдеры (контраст ≥4.5:1) |
| `line` | `#e7ebe4` | границы |
| `surface` | `#ffffff` | карточки |
| `surface-soft` | `#f5f7f3` | фон секций |
| `surface-sunken` | `#eef1ea` | вложенные блоки |

### Семантические
`success #2c7838` · `warning #d98a12` · `danger #d64545` · `info #2f6fb0` · `sale #d64545`

## Типографика
- **Шрифт:** Manrope (latin + cyrillic), веса 400/500/600/700/800. Подключается через
  `next/font` (самохостинг, без обращения к Google в рантайме — соответствует политике РФ).
- **Заголовки:** `font-extrabold tracking-tight`. H1 — `text-3xl sm:text-4xl`,
  H2 — `text-2xl sm:text-3xl`.
- **Текст:** базовый 15–16px, `leading-relaxed` для статей.

## Скругления (радиусы)
`sm 8` · `md 12` · `lg 16` · `xl 20` · `2xl 28` · `3xl 36`.
Кнопки и чипсы — `rounded-full`. Карточки — `rounded-2xl`. Крупные блоки — `rounded-3xl`.

## Тени
`shadow-xs/sm/md/lg` — мягкие, природные. `shadow-brand` — зелёное свечение для
акцентных кнопок и активного пункта нижнего меню.

## Отступы / контейнер
- Сетка кратна 4px (Tailwind spacing).
- Контейнер: `max-w-[1280px]`, паддинги `px-4 sm:px-6 lg:px-8` (компонент `Container`).
- Секции: `py-10 sm:py-14` (компонент `Section`).
- Высота шапки — `--spacing-header: 72px`; высота нижнего меню — `--spacing-mobnav: 64px`.

## Компоненты UI
- `Button` — варианты `primary | accent | secondary | outline | ghost | danger`,
  размеры `sm | md | lg | icon`. Все — пилюли (`rounded-full`).
- `Badge` / `Pill` — статусы и метки.
- `Input / Textarea / Select / Checkbox / Label / FieldError` — формы.
- `SmartImage` — изображение с «умной» заглушкой (см. `docs/image-spec.md`).
- `Container / Section / SectionHeader` — раскладка.
- `ProductCard / ProductGrid`, `CategoryTiles`, `CatalogView` — каталог.

## Мобильное нижнее меню (стиль iOS 26)
Компонент `MobileNav`: плавающая полупрозрачная панель «liquid glass»
(`bg-surface/80 backdrop-blur-2xl`, `rounded-[24px]`), приподнятая центральная
кнопка «Каталог», учёт `safe-area-inset-bottom`.

## Движение (GSAP)
Слой анимаций живёт в `src/components/motion/` и подчинён принципу «движение
должно быть мотивировано» (иерархия, обратная связь, раскрытие контента).
Интенсивность сдержанная: только `transform`/`opacity`, без scroll-hijack.

- `Reveal` / `Stagger` — плавное появление секций и сеток при въезде во вьюпорт
  (ScrollTrigger). Финальное состояние — контент виден; при `prefers-reduced-motion`
  анимация не навешивается вовсе (ничего не «застревает» скрытым).
- `Parallax` — мягкий скролл-параллакс фоновой картинки hero.
- `Magnetic` — «магнитные» CTA-кнопки (только `hover:hover` + `pointer:fine`).
- `CountUp` — счётчики, докручивающиеся при появлении (значение всегда в разметке
  для SSR/SEO/no-JS).
- `Bump` — «подпрыгивание» бейджей корзины/избранного при увеличении счётчика.

Правила: ScrollTrigger подгружается лениво (`gsap-core.ensureScrollTrigger`),
каждый эффект обёрнут в `gsap.matchMedia()` с гейтом
`(prefers-reduced-motion: no-preference)`, hover-эффекты дублируются утилитой
`motion-safe:` в Tailwind.

## Доступность
- Контраст текста соответствует WCAG AA (в т.ч. accent-кнопка — тёмный текст на янтаре).
- Фокус: видимая обводка `outline brand-500` (`:focus-visible`).
- Кликабельные зоны ≥ 40px по высоте.
- Вся анимация уважает `prefers-reduced-motion` (CSS + GSAP `matchMedia`).
- Поля ввода и миниатюры галереи имеют `aria-label`; изображения — осмысленный `alt`.
