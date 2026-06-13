export const dynamic = "force-dynamic";

/**
 * Route-группа кабинета опта (URL не меняет). Провайдер оптовой корзины
 * смонтирован уровнем выше (src/app/opt/layout.tsx) — он нужен и нижнему
 * бару; здесь только фон. Гейтинг доступа — на каждой странице.
 */
export default function OptCabinetLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
