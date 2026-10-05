import type { Settings } from "@/api/types";
import { Card, ListSkeleton } from "@/components/ui";
import { formatPhone } from "@/lib/format";

import { mailHref, openExternalUrl, telHref } from "./links";
import { MenuGroup } from "./menu-group";
import { MenuRow } from "./menu-row";

export interface ContactsCardProps {
  settings: Settings | undefined;
}

/** Контакты и соцсети магазина. Всё тянется из /settings — ничего не зашито в код. */
export function ContactsCard({ settings }: ContactsCardProps) {
  if (!settings) {
    return (
      <Card>
        <ListSkeleton variant="line" count={3} />
      </Card>
    );
  }

  // деструктуризация в const, чтобы сужение типов доживало до колбэков
  const { whatsapp, telegram, instagram, vk, wildberries } = settings.socials;
  const { phone, email, address, workingHours } = settings;
  const footer = [address, workingHours].filter(Boolean).join(" · ");

  return (
    <MenuGroup title="Связаться с нами" footer={footer || undefined}>
      <MenuRow
        icon="phone.fill"
        title="Позвонить"
        value={formatPhone(phone)}
        accessibilityHint="Откроется приложение «Телефон»"
        onPress={() => void openExternalUrl(telHref(phone), "Звонки недоступны на этом устройстве.")}
      />

      {whatsapp ? (
        <MenuRow
          icon="message.fill"
          title="WhatsApp"
          onPress={() => void openExternalUrl(whatsapp, "Установите WhatsApp, чтобы написать нам.")}
        />
      ) : null}

      {telegram ? (
        <MenuRow
          icon="paperplane.fill"
          title="Telegram"
          onPress={() => void openExternalUrl(telegram, "Установите Telegram, чтобы написать нам.")}
        />
      ) : null}

      {instagram ? (
        <MenuRow
          icon="camera.fill"
          tone="accent"
          title="Instagram"
          onPress={() => void openExternalUrl(instagram)}
        />
      ) : null}

      {vk ? (
        <MenuRow
          icon="person.2.fill"
          tone="accent"
          title="ВКонтакте"
          onPress={() => void openExternalUrl(vk)}
        />
      ) : null}

      {wildberries ? (
        <MenuRow
          icon="bag.fill"
          tone="accent"
          title="Магазин на Wildberries"
          onPress={() => void openExternalUrl(wildberries)}
        />
      ) : null}

      <MenuRow
        icon="envelope.fill"
        tone="neutral"
        title="Написать на почту"
        value={email}
        onPress={() => void openExternalUrl(mailHref(email), "Почтовый клиент не настроен.")}
      />
    </MenuGroup>
  );
}
