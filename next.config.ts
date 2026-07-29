import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Меньше JS в бандле: точечный импорт иконок и удаление console в проде.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Месяц кэша оптимизированных изображений: не пережимать одни и те же
    // картинки повторно (на VPS это заметная нагрузка на CPU).
    minimumCacheTTL: 2678400,
    remotePatterns: [
      // Изображения, мигрированные со старого сайта (заменяются по мере готовности).
      { protocol: "https", hostname: "biohayat.ru" },
      { protocol: "https", hostname: "www.biohayat.ru" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Долгий кэш для загруженных изображений (immutable, имена уникальны).
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        /*
         * Витрина: ответ можно переиспользовать общим кэшем (nginx proxy_cache,
         * CDN) 60 секунд, а дальше ещё сутки отдавать устаревшую копию, пока
         * обновление готовится в фоне.
         *
         * Почему заголовком, а не ISR: главная и каталог — динамические
         * маршруты (каталог читает ?sort=/?page=, главную нельзя пререндерить
         * на сборке без БД), и Next по умолчанию помечает их `no-store`. То
         * есть каждый заход, включая повторный, означал полный рендер.
         *
         * max-age=0 намеренно: личное состояние (корзина, вход) живёт в
         * cookie-флагах и подставляется на клиенте, но браузеру собственную
         * копию страницы отдавать не стоит — иначе «назад» покажет чужие
         * счётчики. Общему кэшу отдавать можно: разметка для всех одинаковая.
         *
         * Исключения — всё, что сервер рисует по-разному для разных людей:
         * кабинет, корзина, оформление, опт, админка и каталог (в нём есть
         * блок «Вы уже заказывали»). Их общий кэш обслуживать не должен, иначе
         * один покупатель увидит историю другого.
         */
        source: "/:path((?!api|admin|account|opt|checkout|cart|catalog)[^.]*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
