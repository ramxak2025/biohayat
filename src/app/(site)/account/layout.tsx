// Личный кабинет: всегда рендер на запрос (персональные данные).
// Также гарантирует, что страницы ЛК не пререндерятся на сборке без БД.
export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
