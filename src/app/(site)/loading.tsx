// Прелоадер при переходах между страницами: тонкая бегущая полоса сверху
// (показывается, пока серверный компонент страницы рендерится).
export default function SiteLoading() {
  return (
    <div className="topbar-track" role="progressbar" aria-label="Загрузка">
      <div className="topbar-bar" />
    </div>
  );
}
