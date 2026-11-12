import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Авторы фотографий",
  description: "Авторы и лицензии пейзажных фотографий ХАЯТ.",
};

const commons = "https://commons.wikimedia.org/wiki/File:";
const licenses = {
  by: { label: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/" },
  bySa: { label: "CC BY-SA 4.0", href: "https://creativecommons.org/licenses/by-sa/4.0/" },
  unsplash: { label: "Unsplash License", href: "https://unsplash.com/license" },
} as const;

const photos = [
  {
    scene: "Главная панорама",
    title: "Зелёные склоны Дагестана",
    author: "Vladislav Bychkov",
    source: "https://unsplash.com/photos/a-lush-green-hillside-with-trees-and-mountains-in-the-background-DUJcmxe8kDA",
    license: licenses.unsplash,
  },
  {
    scene: "Сунна",
    title: "Заброшенный аул Гамсутль",
    author: "Sofi Kaveller",
    source: `${commons}${encodeURIComponent("Заброшенный_аул_Гамсутль.jpg")}`,
    license: licenses.bySa,
  },
  {
    scene: "Семья",
    title: "Mountains, Republick of Dagestan, Evening",
    author: "Liudmilaabramova",
    source: `${commons}Mountains,_Republick_of_Dagestan,_Evening.jpg`,
    license: licenses.by,
  },
  {
    scene: "Основа здоровья",
    title: "View on Shalbuzdag from Samur",
    author: "Горбунова М.С.",
    source: `${commons}View_on_Shalbuzdag_from_Samur.jpg`,
    license: licenses.bySa,
  },
  {
    scene: "Спорт",
    title: "Landscape near Khuchada, Dagestan 1",
    author: "Горбунова М.С.",
    source: `${commons}Landscape_near_Khuchada,_Dagestan_1.jpg`,
    license: licenses.bySa,
  },
];

export default function PhotoCreditsPage() {
  return (
    <Container className="py-10 pb-24 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Авторы фотографий</h1>
        <p className="mt-4 text-ink-muted">
          Для сайта и приложения фотографии уменьшены и переведены в WebP. При показе снимки кадрируются под размер экрана.
        </p>
        <dl className="mt-8 divide-y divide-line rounded-[var(--r-lg)] bg-white px-5 sm:px-8">
          {photos.map(({ scene, title, author, source, license }) => (
            <div className="grid gap-1 py-5 sm:grid-cols-[170px_1fr] sm:gap-4" key={scene}>
              <dt className="font-medium text-ink-muted">{scene}</dt>
              <dd className="min-w-0">
                <p className="font-semibold">{title}</p>
                <p className="text-ink-muted">{author}</p>
                <div className="flex flex-wrap items-center gap-x-4">
                  <a href={source} className="inline-flex min-h-11 items-center gap-1 underline">
                    Оригинал <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                  <a href={license.href} className="inline-flex min-h-11 items-center underline">{license.label}</a>
                </div>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Container>
  );
}
