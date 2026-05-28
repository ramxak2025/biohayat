import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHero, Prose } from "@/components/ui/prose";
import { SmartImage } from "@/components/ui/smart-image";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    { title: "О компании", description: "О компании ХАЯТ: натуральная фитопродукция и БАД.", path: "/about" },
    settings,
  );
}

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero title="О компании ХАЯТ" subtitle="Натуральная фитопродукция, проверенная временем" />
      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <Prose>
            <p>
              Компания «ХАЯТ» занимается производством и реализацией биологически активных
              добавок и натуральной фитопродукции. В основе нашей продукции — знания, рецепты и
              принципы, проверенные временем и положительными результатами наших клиентов.
            </p>
            <h2>Наш подход</h2>
            <p>
              Мы используем натуральное сырьё и традиционные рецептуры. Продукция изготавливается
              на производстве ООО «Восток» (Россия) и соответствует требованиям технических
              регламентов ЕАЭС к биологически активным добавкам.
            </p>
            <h2>Ассортимент</h2>
            <p>
              В каталоге — витамины (D3, C, A, E), коллаген, масло чёрного тмина, мёд, бальзамы,
              семена и травы, а также специализированные подборки для мужчин, женщин, детей и
              спортсменов.
            </p>
            <h2>Реквизиты</h2>
            <ul>
              {settings.legalName ? <li>Наименование: {settings.legalName}</li> : null}
              {settings.inn ? <li>ИНН: {settings.inn}</li> : null}
              {settings.ogrn ? <li>ОГРН: {settings.ogrn}</li> : null}
              {settings.legalAddress ? <li>Адрес: {settings.legalAddress}</li> : null}
            </ul>
          </Prose>
          <div className="space-y-4">
            <SmartImage src={null} alt="Производство ХАЯТ" ratio="4/3" label="Фото производства" spec="1200×900" rounded="rounded-2xl" />
            <SmartImage src={null} alt="Команда ХАЯТ" ratio="4/3" label="Фото команды" spec="1200×900" rounded="rounded-2xl" />
          </div>
        </div>
      </Container>
    </>
  );
}
