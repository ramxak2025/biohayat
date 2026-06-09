import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHero, Prose } from "@/components/ui/prose";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { formatMoney } from "@/lib/utils";

// Рендер на запрос: пререндер на сборке требовал бы доступную БД (layout читает категории).
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    { title: "Доставка и оплата", description: "Условия доставки и оплаты в магазине ХАЯТ.", path: "/delivery" },
    settings,
  );
}

export default async function DeliveryPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHero title="Доставка и оплата" />
      <Container className="py-8 sm:py-12">
        <Prose>
          <h2>Доставка</h2>
          <p>
            Доставляем по всей России. Бесплатная доставка при заказе на сумму от{" "}
            <strong>{formatMoney(settings.freeDeliveryThresholdKopecks)}</strong>. Стоимость и
            сроки доставки зависят от вашего региона и уточняются менеджером при подтверждении
            заказа.
          </p>
          <ul>
            <li>Курьерская доставка по городу</li>
            <li>Доставка транспортными компаниями и почтой по России</li>
            <li>Самовывоз из розничных точек (Грозный, Хасавюрт, Махачкала, Назрань и др.)</li>
          </ul>
          <h2>Оплата</h2>
          <p>
            Оплата производится при получении заказа — наличными или картой. Оформление заказа на
            сайте является заявкой: после её отправки менеджер свяжется с вами для подтверждения
            состава, адреса и способа доставки.
          </p>
          <h2>Возврат</h2>
          <p>
            Возврат и обмен товара осуществляются в соответствии с законодательством РФ (Закон
            «О защите прав потребителей»). По вопросам возврата свяжитесь с нами по телефону{" "}
            {settings.phone} или e-mail {settings.email}.
          </p>
        </Prose>
      </Container>
    </>
  );
}
