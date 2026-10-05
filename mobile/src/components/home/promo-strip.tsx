import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView, type SFSymbol } from "expo-symbols";

import type { Banner } from "@/api/types";
import { AppText, PressableScale, Skeleton } from "@/components/ui";
import { radii, shadows, spacing } from "@/theme";

import { bannerGradient, DEFAULT_BANNER_COLOR, inkOn, tint } from "./banner-color";

export interface PromoStripProps {
  banners: Banner[];
  isLoading?: boolean;
  onPressBanner: (banner: Banner) => void;
}

/**
 * Иконку баннера админка не задаёт, а полоса без знака выглядит как пустая
 * плашка. Берём её по смыслу заголовка — промахнуться некритично, дефолт
 * нейтральный.
 */
function promoSymbol(title: string): SFSymbol {
  const text = title.toLowerCase();
  if (/доставк|достав/.test(text)) return "truck.box.fill";
  if (/скидк|акци|%|процент|распродаж/.test(text)) return "percent";
  if (/подар|бонус/.test(text)) return "gift.fill";
  if (/консульт|врач|специалист/.test(text)) return "stethoscope";
  if (/сертиф|качеств|провер/.test(text)) return "checkmark.seal.fill";
  return "sparkles";
}

export function PromoStrip({ banners, isLoading, onPressBanner }: PromoStripProps) {
  if (isLoading && banners.length === 0) {
    return (
      <View style={styles.wrap}>
        <Skeleton height={88} radius={radii["2xl"]} />
      </View>
    );
  }

  if (banners.length === 0) return null;

  return (
    <View style={[styles.wrap, styles.stack]}>
      {banners.map((banner) => (
        <PromoCard key={banner.id} banner={banner} onPress={onPressBanner} />
      ))}
    </View>
  );
}

function PromoCard({ banner, onPress }: { banner: Banner; onPress: (banner: Banner) => void }) {
  const background = banner.bgColor ?? DEFAULT_BANNER_COLOR;
  const ink = inkOn(background);
  const photo = banner.imageMobile ?? banner.image;
  const label = [banner.title, banner.subtitle].filter(Boolean).join(". ");

  return (
    // тень отдельным слоем: маска скруглённых углов на iOS срезала бы её
    <View style={[styles.shadow, shadows.sm, { backgroundColor: background }]}>
      <PressableScale
        onPress={() => onPress(banner)}
        disabled={!banner.link}
        haptic={banner.link ? "light" : "none"}
        accessibilityRole={banner.link ? "button" : "text"}
        accessibilityLabel={label}
        style={styles.card}
      >
        <LinearGradient
          colors={bannerGradient(background)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={[StyleSheet.absoluteFill, styles.photo]}
            contentFit="cover"
            transition={240}
            cachePolicy="memory-disk"
            recyclingKey={banner.id}
            accessibilityIgnoresInvertColors
            alt={banner.title}
          />
        ) : null}

        <View style={[styles.glyph, { backgroundColor: tint(background, 0.28) }]}>
          <SymbolView name={promoSymbol(banner.title)} size={20} tintColor={ink} />
        </View>

        <View style={styles.text}>
          <AppText variant="headline" numberOfLines={2} style={{ color: ink }}>
            {banner.title}
          </AppText>
          {banner.subtitle ? (
            <AppText variant="footnote" numberOfLines={2} style={[styles.subtitle, { color: ink }]}>
              {banner.subtitle}
            </AppText>
          ) : null}
        </View>

        {banner.link ? (
          <SymbolView name="chevron.right" size={14} tintColor={ink} weight="semibold" />
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.base },
  stack: { gap: spacing.md },
  shadow: { borderRadius: radii["2xl"] },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 88,
    padding: spacing.base,
    borderRadius: radii["2xl"],
    overflow: "hidden",
  },
  photo: { opacity: 0.45 },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  subtitle: { opacity: 0.85 },
});
