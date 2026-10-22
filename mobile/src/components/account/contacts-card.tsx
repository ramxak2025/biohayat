import type { Settings } from "@/api/types";
import { Card, ListSkeleton } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { useColors } from "@/theme";

import { mailHref, openExternalUrl, telHref } from "./links";
import { MenuGroup } from "./menu-group";
import { MenuRow } from "./menu-row";
import { SocialIcon } from "./social-icon";

export interface ContactsCardProps {
  settings: Settings | undefined;
}

/** Контакты и соцсети магазина. Всё тянется из /settings — ничего не зашито в код. */
export function ContactsCard({ settings }: ContactsCardProps) {
  const colors = useColors();
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
  const footer = [address, workingHours, instagram ? "Instagram — сервис Meta Platforms Inc., признанной экстремистской организацией; её деятельность в России запрещена." : null].filter(Boolean).join(" · ");

  return (
    <MenuGroup title="Связаться с нами" footer={footer || undefined}>
      {phone ? <MenuRow
        icon={{ ios: "phone.fill", android: "call", web: "call" }}
        title="Позвонить"
        subtitle={formatPhone(phone)}
        accessibilityHint="Откроется приложение «Телефон»"
        onPress={() => void openExternalUrl(telHref(phone), "Звонки недоступны на этом устройстве.")}
      /> : null}

      {whatsapp ? (
        <MenuRow
          iconElement={<SocialIcon brand="whatsapp" color={colors.brandText} />}
          title="WhatsApp"
          onPress={() => void openExternalUrl(whatsapp, "Установите WhatsApp, чтобы написать нам.")}
        />
      ) : null}

      {telegram ? (
        <MenuRow
          iconElement={<SocialIcon brand="telegram" color={colors.brandText} />}
          title="Telegram"
          onPress={() => void openExternalUrl(telegram, "Установите Telegram, чтобы написать нам.")}
        />
      ) : null}

      {instagram ? (
        <MenuRow
          iconElement={<SocialIcon brand="instagram" color={colors.brandText} />}
          tone="accent"
          title="Instagram"
          onPress={() => void openExternalUrl(instagram)}
        />
      ) : null}

      {vk ? (
        <MenuRow
          iconElement={<SocialIcon brand="vk" color={colors.brandText} />}
          tone="accent"
          title="ВКонтакте"
          onPress={() => void openExternalUrl(vk)}
        />
      ) : null}

      {wildberries ? (
        <MenuRow
          iconElement={<SocialIcon brand="wildberries" color={colors.brandText} />}
          tone="accent"
          title="Магазин на Wildberries"
          onPress={() => void openExternalUrl(wildberries)}
        />
      ) : null}

      {email ? <MenuRow
        icon={{ ios: "envelope.fill", android: "mail", web: "mail" }}
        tone="neutral"
        title="Написать на почту"
        subtitle={email}
        onPress={() => void openExternalUrl(mailHref(email), "Почтовый клиент не настроен.")}
      /> : null}
    </MenuGroup>
  );
}
