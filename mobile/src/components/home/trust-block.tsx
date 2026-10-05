import { Linking, StyleSheet, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";

import type { Settings } from "@/api/types";
import { AppText, Card, Divider, PressableScale, Skeleton } from "@/components/ui";
import { formatKopecks, normalizePhone } from "@/lib/format";
import { MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

import { openExternal } from "./banner-link";

export interface TrustBlockProps {
  settings: Settings | undefined;
  isLoading?: boolean;
}

interface SocialLink {
  key: keyof Settings["socials"];
  label: string;
  icon: SFSymbol;
}

const SOCIALS: SocialLink[] = [
  { key: "whatsapp", label: "WhatsApp", icon: "message.fill" },
  { key: "telegram", label: "Telegram", icon: "paperplane.fill" },
  { key: "instagram", label: "Instagram", icon: "camera.fill" },
  { key: "vk", label: "ВКонтакте", icon: "bubble.left.fill" },
  { key: "wildberries", label: "Wildberries", icon: "bag.fill" },
];

/** Порог, пока настройки не приехали: тот же дефолт, что зашит на бэкенде. */
const FALLBACK_THRESHOLD_KOPECKS = 2_000_000;

export function TrustBlock({ settings, isLoading }: TrustBlockProps) {
  const colors = useColors();

  if (isLoading && !settings) {
    return (
      <View style={styles.wrap}>
        <Card padded>
          <View style={styles.skeleton}>
            <Skeleton height={18} width="70%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="60%" />
          </View>
        </Card>
      </View>
    );
  }

  const threshold = settings?.freeDeliveryThreshold?.kopecks ?? FALLBACK_THRESHOLD_KOPECKS;
  const phone = settings?.phone;
  const email = settings?.email;
  const socials = SOCIALS.map((social) => ({
    ...social,
    url: settings?.socials[social.key] ?? null,
  })).filter((social): social is SocialLink & { url: string } => !!social.url);

  return (
    <View style={styles.wrap}>
      <Card padded={false}>
        <Row
          icon="truck.box.fill"
          title="Бесплатная доставка"
          value={`При заказе от ${formatKopecks(threshold)} — по всей России`}
        />

        {phone ? (
          <>
            <RowDivider />
            <Row
              icon="phone.fill"
              title="Позвонить"
              value={phone}
              onPress={() => void Linking.openURL(`tel:${normalizePhone(phone)}`)}
              hint="Откроется приложение «Телефон»"
            />
          </>
        ) : null}

        {email ? (
          <>
            <RowDivider />
            <Row
              icon="envelope.fill"
              title="Написать"
              value={email}
              onPress={() => void Linking.openURL(`mailto:${email}`)}
              hint="Откроется почта"
            />
          </>
        ) : null}

        {settings?.workingHours ? (
          <>
            <RowDivider />
            <Row icon="clock.fill" title="Режим работы" value={settings.workingHours} />
          </>
        ) : null}

        {settings?.address ? (
          <>
            <RowDivider />
            <Row icon="mappin.and.ellipse" title="Адрес" value={settings.address} />
          </>
        ) : null}
      </Card>

      {socials.length > 0 ? (
        <View style={styles.socials}>
          {socials.map((social) => (
            <PressableScale
              key={social.key}
              onPress={() => openExternal(social.url)}
              accessibilityRole="link"
              accessibilityLabel={`Открыть ${social.label}`}
              style={[styles.social, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <SymbolView name={social.icon} size={15} tintColor={colors.brand} />
              <AppText variant="footnote" weight="600">
                {social.label}
              </AppText>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Divider из набора рисуется на 100% ширины и уезжает за правый край, если
 * задать ему inset. Отступ даём контейнером — так линия остаётся внутри карточки.
 */
function RowDivider() {
  return (
    <View style={styles.divider}>
      <Divider />
    </View>
  );
}

interface RowProps {
  icon: SFSymbol;
  title: string;
  value: string;
  onPress?: () => void;
  hint?: string;
}

function Row({ icon, title, value, onPress, hint }: RowProps) {
  const colors = useColors();

  const body = (
    <>
      <View style={[styles.glyph, { backgroundColor: colors.brandSoft }]}>
        <SymbolView name={icon} size={17} tintColor={colors.brand} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="footnote" color="muted">
          {title}
        </AppText>
        <AppText variant="callout" weight="600">
          {value}
        </AppText>
      </View>
      {onPress ? (
        <SymbolView name="chevron.right" size={13} tintColor={colors.textFaint} weight="semibold" />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={`${title}: ${value}`}>
        {body}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      accessibilityHint={hint}
      style={styles.row}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base, gap: spacing.md },
  skeleton: { gap: spacing.sm },
  divider: { paddingLeft: spacing.base + 36 + spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 12,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 1 },
  socials: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  social: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    minHeight: MIN_TAP_SIZE - 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
