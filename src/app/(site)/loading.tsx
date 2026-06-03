// Премиальный прелоадер при переходах: фирменный логотип с пульсацией внутри
// вращающегося градиентного кольца + тонкая полоса прогресса сверху.
export default function SiteLoading() {
  return (
    <>
      <div className="topbar-track" role="progressbar" aria-label="Загрузка">
        <div className="topbar-bar" />
      </div>
      <div className="flex min-h-[62vh] flex-col items-center justify-center gap-5">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span
            className="loader-ring absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, var(--color-brand-300) 120deg, var(--color-brand-600) 320deg, transparent 360deg)",
              WebkitMask: "radial-gradient(closest-side, transparent 68%, #000 70%)",
              mask: "radial-gradient(closest-side, transparent 68%, #000 70%)",
            }}
          />
          <span className="loader-logo flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-brand">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M12 2C7 6 4 10 4 14a8 8 0 0016 0c0-4-3-8-8-12zm0 5c2.5 2.2 4 4.7 4 7a4 4 0 01-8 0c0-2.3 1.5-4.8 4-7z" />
            </svg>
          </span>
        </div>
        <span className="text-sm font-semibold tracking-wide text-ink-faint">Загружаем…</span>
      </div>
    </>
  );
}
