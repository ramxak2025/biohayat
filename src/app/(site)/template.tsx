// Шаблон сегмента: пересоздаётся при каждом переходе, поэтому даёт плавную
// анимацию появления контента при навигации между страницами.
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
