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
    ];
  },
};

export default nextConfig;
