import type { MetadataRoute } from "next";

// PWA-манифест: сайт устанавливается на главный экран как приложение
// (мостик к будущему мобильному приложению на React Native).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ХАЯТ — витамины и БАД",
    short_name: "ХАЯТ",
    description:
      "Натуральные витамины и БАД для всей семьи: каталог, личный кабинет, трекер приёма.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F4",
    theme_color: "#3a9447",
    lang: "ru",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
