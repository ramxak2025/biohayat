import type { MetadataRoute } from "next";

/** Манифест PWA: установка на главный экран, иконки, splash. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ХАЯТ — натуральные витамины и БАД",
    short_name: "ХАЯТ",
    description:
      "Фитопродукция и биологически активные добавки ХАЯТ: витамины, коллаген, масло чёрного тмина, мёд и бальзамы.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ru",
    dir: "ltr",
    background_color: "#ffffff",
    theme_color: "#3a9447",
    categories: ["shopping", "health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
