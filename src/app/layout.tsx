import type { Metadata, Viewport } from "next";
import { Golos_Text } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { buildMetadata, organizationJsonLd, siteUrl } from "@/lib/seo";

/*
 * Один шрифт на весь магазин — Golos Text (Paratype), переменный, 400–900.
 *
 * Почему не Manrope, который стоял раньше. У Manrope кириллица есть, но она
 * подчинена геометрии латиницы: выносные элементы у ц, щ, Ц, Щ — 9–10 единиц
 * на кегле 100 против 12–13 у Golos и 16–20 у Inter и Onest (замер по
 * actualBoundingBoxDescent). На тексте 13px это хвостик в один пиксель —
 * при беглом чтении «ц» перестаёт отличаться от «н», «щ» от «ш». В русском
 * тексте этих букв много, и узнавание слова по форме держится как раз на
 * них. Строчная «ж» у Manrope тоже самая узкая из сравнённых (70 против 80).
 * Golos рисовался под кириллицу как основной алфавит, а не как дополнение,
 * и по отношению строчной к прописной (0.757) он лучший в наборе.
 *
 * Почему больше нет пары с серифом. Сериф в кириллице читается как книга,
 * учебник или официальный документ: русский читатель встречает засечки
 * почти только там. Для магазина БАД это чужой регистр — он мешает главному,
 * ради чего человек пришёл: быстро понять состав, дозировку и цену. Ни один
 * крупный русский магазин (Озон, Wildberries, Яндекс Маркет, ВкусВилл,
 * аптечные сервисы) заголовки серифом не набирает. Иерархию даёт один
 * переменный шрифт: 400–900 плюс кегль и цвет.
 *
 * Побочно это ещё и легче: одно семейство вместо двух — 77 КБ против 85 КБ,
 * и запасной шрифт больше не подменяет замысел (при Lora с display: optional
 * часть посетителей вообще видела Georgia).
 */
const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    ...buildMetadata({ path: "/" }, settings),
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "ХАЯТ",
      statusBarStyle: "default",
    },
    verification: {
      yandex: settings.yandexVerification || undefined,
      google: settings.googleVerification || undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#3a9447",
  width: "device-width",
  initialScale: 1,
  // Запрет масштабирования (как в нативных приложениях): любой зум в iOS
  // «отклеивает» fixed-бары от экрана — они плавают при скролле.
  maximumScale: 1,
  userScalable: false,
  // БЕЗ viewportFit cover: с ним env(safe-area-inset-*) меняется при
  // сворачивании панелей Safari во время скролла, и шапка с нижним баром
  // «гуляют» на эти пиксели. Без cover инсеты стабильны (нулевые).
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="ru" className={`${golos.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd(settings)),
          }}
        />
      </head>
      <body className="min-h-full bg-surface text-ink flex flex-col">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { borderRadius: "16px" } }}
        />
        {/* Яндекс.Метрика — отложенная загрузка, чтобы не блокировать рендер */}
        {settings.yandexMetrikaId ? (
          <Script id="ym" strategy="lazyOnload">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${settings.yandexMetrikaId},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
          </Script>
        ) : null}
      </body>
    </html>
  );
}
