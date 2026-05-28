import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHero, Prose } from "@/components/ui/prose";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { formatMoney } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    { title: "Публичная оферта", description: "Публичная оферта интернет-магазина ХАЯТ.", path: "/oferta" },
    settings,
  );
}

export default async function OfertaPage() {
  const settings = await getSettings();
  const seller = settings.legalName || "Продавец";
  return (
    <>
      <PageHero title="Публичная оферта" subtitle="Договор розничной купли-продажи" />
      <Container className="py-8 sm:py-12">
        <Prose>
          <h2>1. Общие положения</h2>
          <p>
            Настоящий документ является публичной офертой {seller}
            {settings.inn ? ` (ИНН ${settings.inn})` : ""} (далее — Продавец) и содержит все
            существенные условия договора розничной купли-продажи товаров дистанционным способом
            через сайт {settings.email ? "" : ""}. Оформляя заказ, Покупатель принимает условия
            настоящей оферты в полном объёме.
          </p>

          <h2>2. Предмет договора</h2>
          <p>
            Продавец обязуется передать в собственность Покупателя товар (биологически активные
            добавки и фитопродукцию), а Покупатель обязуется принять и оплатить товар на условиях
            настоящей оферты.
          </p>

          <h2>3. Оформление заказа</h2>
          <p>
            Заказ оформляется Покупателем самостоятельно на сайте. Оформленный заказ является
            заявкой; менеджер связывается с Покупателем для подтверждения состава, стоимости и
            условий доставки. Договор считается заключённым с момента подтверждения заказа.
          </p>

          <h2>4. Цена и оплата</h2>
          <p>
            Цены на товары указаны в рублях. Оплата производится при получении товара. Бесплатная
            доставка предоставляется при заказе на сумму от{" "}
            {formatMoney(settings.freeDeliveryThresholdKopecks)}.
          </p>

          <h2>5. Доставка</h2>
          <p>
            Условия и сроки доставки указаны в разделе «Доставка и оплата» и уточняются при
            подтверждении заказа.
          </p>

          <h2>6. Возврат товара</h2>
          <p>
            Возврат и обмен осуществляются в соответствии с Законом РФ «О защите прав
            потребителей» и Правилами продажи товаров дистанционным способом.
          </p>

          <h2>7. Важная информация</h2>
          <p>
            Реализуемая продукция является биологически активными добавками к пище и не является
            лекарственным средством. Имеются противопоказания, необходима консультация
            специалиста.
          </p>

          <h2>8. Реквизиты Продавца</h2>
          <ul>
            {settings.legalName ? <li>{settings.legalName}</li> : null}
            {settings.inn ? <li>ИНН: {settings.inn}</li> : null}
            {settings.ogrn ? <li>ОГРН: {settings.ogrn}</li> : null}
            {settings.legalAddress ? <li>Адрес: {settings.legalAddress}</li> : null}
            <li>Телефон: {settings.phone}</li>
            <li>E-mail: {settings.email}</li>
          </ul>
        </Prose>
      </Container>
    </>
  );
}
