import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { CATALOG_DIRECTIONS, type CatalogDirectionId } from "../../../../shared/catalog-directions";

import { AppText, GlassSurface, PressableScale } from "@/components/ui";
import { directionColors, radii, spacing, vysota } from "@/theme";

const photographs = {
  sunna: require("../../../assets/vysota/hayat-sunna.webp"),
  semya: require("../../../assets/vysota/hayat-semya.webp"),
  osnova: require("../../../assets/vysota/hayat-osnova.webp"),
  sport: require("../../../assets/vysota/hayat-sport.webp"),
};

export function VysotaHomeHero({ topClearance, onLayout, onOpenCatalog }: {
  topClearance: number;
  onLayout: (height: number) => void;
  onOpenCatalog: () => void;
}) {
  const { height, width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const minimumHeight = Math.min(760, Math.max(620, height * 0.88));
  const fontSize = Math.min(56, Math.max(34, width * .113));

  return (
    <View
      style={[styles.hero, { minHeight: minimumHeight, paddingTop: topClearance + spacing.xl }]}
      onLayout={(event) => onLayout(event.nativeEvent.layout.height)}
    >
      <Image
        source={require("../../../assets/vysota/hayat-hero.webp")}
        contentFit="cover"
        contentPosition={{ left: "30%", top: "50%" }}
        transition={reduced ? 0 : 500}
        priority="high"
        style={StyleSheet.absoluteFill}
        accessible={false}
      />
      <LinearGradient
        colors={["rgba(8,18,12,.45)", "rgba(8,18,12,0)", "rgba(8,18,12,.15)", "rgba(8,18,12,.7)"]}
        locations={[0, .3, .55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <AppText variant="hero" accessibilityRole="header" style={[styles.heroTitle, { fontSize, lineHeight: fontSize * 1.05 }]}>
          Природа — в точной дозе
        </AppText>
        <AppText variant="callout" style={styles.onPhoto}>Мёд, масла, витамины и спортивные добавки.</AppText>
        <PressableScale onPress={onOpenCatalog} accessibilityRole="button" style={styles.heroAction}>
          <AppText variant="callout" weight="500" style={styles.actionLabel}>Перейти в каталог</AppText>
          <SymbolView name="arrow.right" size={18} tintColor={vysota.ink} />
        </PressableScale>
      </View>
    </View>
  );
}

export function VysotaDirectionRail({ onSelect }: { onSelect: (direction: CatalogDirectionId) => void }) {
  return (
    <View style={styles.directionSection}>
      <AppText variant="title2" accessibilityRole="header" style={styles.directionTitle}>Направления</AppText>
      <ScrollView
        horizontal
        snapToInterval={142}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {CATALOG_DIRECTIONS.map((direction) => (
          <PressableScale
            key={direction.id}
            onPress={() => onSelect(direction.id)}
            accessibilityRole="button"
            accessibilityLabel={direction.label}
            accessibilityHint={direction.summary}
            style={styles.arch}
          >
            <Image source={photographs[direction.id]} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            <LinearGradient
              colors={["rgba(8,18,12,0)", "rgba(8,18,12,.55)"]}
              locations={[.4, 1]}
              style={StyleSheet.absoluteFill}
            />
            <GlassSurface photo dark style={styles.archLabel}>
              <View style={[styles.dot, { backgroundColor: directionColors[direction.id].onDark }]} />
              <AppText variant="title3" align="center" maxScale={1.35} style={styles.archTitle}>{direction.label}</AppText>
            </GlassSurface>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: vysota.slope,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.base,
    paddingBottom: spacing["3xl"],
  },
  heroContent: { gap: spacing.base, width: "100%", maxWidth: 540, alignSelf: "center" },
  heroTitle: { color: vysota.mist, textShadowColor: vysota.night, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 16 },
  onPhoto: { color: vysota.mist, maxWidth: 360 },
  heroAction: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: vysota.mist,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  actionLabel: { color: vysota.ink, flexShrink: 1, textAlign: "center" },
  directionSection: { backgroundColor: vysota.pine, paddingVertical: spacing["2xl"], gap: spacing.lg },
  directionTitle: { color: vysota.mist, paddingHorizontal: spacing.base },
  rail: { gap: 10, paddingHorizontal: spacing.base },
  arch: {
    width: 132,
    height: 230,
    borderRadius: 70,
    padding: 6,
    justifyContent: "flex-end",
    backgroundColor: vysota.slope,
    overflow: "hidden",
  },
  archLabel: {
    minHeight: 89,
    borderRadius: radii.pill,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(238,241,234,.2)",
    paddingHorizontal: 6,
    paddingTop: 11,
    paddingBottom: 22,
    gap: 8,
    alignItems: "center",
  },
  archTitle: { color: vysota.mist, fontSize: 13, lineHeight: 15 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
