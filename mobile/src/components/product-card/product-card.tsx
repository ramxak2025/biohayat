import type { ReactElement } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useRouter, useSegments } from "expo-router";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { Product } from "@/api/types";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { PressableScale } from "@/components/ui/press-scale";
import { Price } from "@/components/ui/price";
import { Duration, Ease, radii, shadows, spacing, staggerDelay, useColors } from "@/theme";

import { AddToCart } from "./add-to-cart";
import { FavoriteButton } from "./favorite-button";
import { productHref } from "./product-href";
import { ProductLink, ProductZoomSource } from "./product-link";

export type ProductCardLayout = "grid" | "row";

/**
 * Радиус плитки. Фото прижато к краям карточки, поэтому его верхние углы
 * повторяют этот же радиус — иначе между фото и рамкой появляется «ободок».
 */
const GRID_RADIUS = radii.xl;

export interface ProductCardProps {
  product: Product;
  /** grid — плитка в 2 колонки; row — горизонтальная строка списка. */
  layout?: ProductCardLayout;
  /** Позиция в списке: задаёт задержку появления. */
  index?: number;
  /** Фиксированная ширина — для горизонтальной карусели. */
  width?: number;
  onPress?: (product: Product) => void;
  showAddToCart?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Карточка товара.
 *
 * Плитка собрана по логике маркетплейса: покупку решают фото, цена и одно
 * нажатие «в корзину», поэтому в сетке остаются только они. Категория, объём и
 * маркетинговые метки переехали в строку списка (`layout="row"`), где под текст
 * есть ширина — в плитке каждая лишняя строка отнимает площадь у фото.
 *
 * Доступность: PressableScale по умолчанию `accessible`, а это склеивает
 * вложенные кнопки в один элемент — сердечко и «в корзину» переставали быть
 * досягаемыми для VoiceOver. Поэтому сама карточка помечена `accessible={false}`,
 * а сводным элементом сделан отдельный контейнер с фото и текстом: VoiceOver
 * получает три остановки — товар, избранное, корзина, — и двойное нажатие по
 * сводке уходит тапом в ту же карточку.
 */
export function ProductCard({
  product,
  layout = "grid",
  index = 0,
  width,
  onPress,
  showAddToCart = true,
  style,
}: ProductCardProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const router = useRouter();
  const segments = useSegments();

  const open = () => {
    if (onPress) {
      onPress(product);
      return;
    }
    router.push(productHref(segments, product.slug));
  };

  const navigate = (child: ReactElement<{ style?: StyleProp<ViewStyle> }>) => onPress ? child : <ProductLink href={productHref(segments, product.slug)}>{child}</ProductLink>;

  const discount = product.discountPercent;
  const extraBadge = product.badges[0];

  // Всё, что на карточке нарисовано графикой (процент скидки, зачёркнутая цена,
  // приглушённое фото «нет в наличии»), обязано прозвучать в подписи: сводный
  // элемент читается целиком и содержимое детей в него не попадает.
  const label = [
    product.name,
    product.price.formatted,
    discount ? `скидка ${discount} процентов` : null,
    product.oldPrice ? `старая цена ${product.oldPrice.formatted}` : null,
    product.inStock ? null : "нет в наличии",
  ]
    .filter((part): part is string => part !== null)
    .join(". ");

  /** Фото. Форма (размер и радиусы) приходит снаружи — она разная у плитки и строки. */
  const photo = (shape: StyleProp<ViewStyle>) => (
    <ProductZoomSource enabled={!onPress}>
    <View
      style={[
        styles.photo,
        { backgroundColor: colors.surfaceSunken },
        shape,
        // «нет в наличии» показываем приглушённым фото, а не ещё одним бейджем:
        // текстом об этом и так говорит кнопка внизу карточки
        product.inStock ? null : styles.photoDimmed,
      ]}
    >
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={220}
          cachePolicy="memory-disk"
          recyclingKey={product.id}
          accessibilityIgnoresInvertColors
          alt={product.name}
        />
      ) : (
        <View style={styles.noImage}>
          <Image source={require("../../../assets/brand/logo-mark.png")} style={{ width: 32, height: 32 }} contentFit="contain" accessible={false} />
          <AppText variant="caption2" color="faint" numberOfLines={1}>
            ХАЯТ
          </AppText>
        </View>
      )}
    </View>
    </ProductZoomSource>
  );

  /**
   * Угловой ярлык на фото — ровно один. Скидка важнее любой метки, поэтому
   * «−25 %» сплошной заливкой sale вытесняет «хит»; без скидки место отдаём
   * метке товара мягкой акцентной плашкой, чтобы красный остался языком выгоды.
   */
  const corner = discount ? (
    <Badge label={`−${discount}%`} tone="sale" size="sm" solid />
  ) : extraBadge ? (
    <Badge label={extraBadge} tone="accent" size="sm" />
  ) : null;

  const summary = (row: boolean) => navigate(
    <PressableScale
      onPress={onPress ? open : undefined}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Открывает карточку товара"
      onAccessibilityTap={open}
      style={row ? styles.rowMain : undefined}
    >
      <View style={row ? styles.rowImage : undefined}>
        {photo(row ? styles.rowPhoto : styles.gridPhoto)}
        {corner ? <View style={row ? styles.rowCorner : styles.corner} pointerEvents="none">{corner}</View> : null}
      </View>
      <View style={row ? styles.rowBody : styles.gridBody}>
        {row && product.category ? <AppText variant="caption" color="brand" weight="600" numberOfLines={1}>{product.category.name}</AppText> : null}
        <AppText variant={row ? "subhead" : "footnote"} weight={row ? "600" : "500"} numberOfLines={2} style={row ? styles.rowName : styles.gridName}>{product.name}</AppText>
        {row && product.volume ? <AppText variant="caption" color="faint">{product.volume}</AppText> : null}
        <Price price={product.price} oldPrice={product.oldPrice} discountPercent={product.discountPercent} size={row ? "sm" : "md"} layout="inline" showDiscount={false} />
      </View>
    </PressableScale>
  );

  const body = layout === "grid" ? (
    <View accessible={false} style={[styles.card, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: GRID_RADIUS }, width ? { width } : null, style]}>
      {summary(false)}
      {showAddToCart ? <View style={styles.gridCta}><AddToCart product={product} /></View> : null}
      <View style={styles.favorite}><FavoriteButton productId={product.id} /></View>
    </View>
  ) : (
    <View accessible={false} style={[styles.rowCard, { flexDirection: "column" }, shadows.sm, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>
      {summary(true)}
      {showAddToCart ? <View style={styles.rowActions}><AddToCart product={product} /></View> : null}
      <View style={styles.rowFavorite}><FavoriteButton productId={product.id} onImage={false} /></View>
    </View>
  );

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index)).duration(Duration.reveal).easing(Ease.power3Out)
      }
    >
      {body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // без overflow: "hidden" — iOS обрезает по нему и тень; фото клипует себя само
  card: { borderWidth: StyleSheet.hairlineWidth },
  photo: { overflow: "hidden" },
  photoDimmed: { opacity: 0.45 },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },

  // фото во всю ширину плитки: внутренние поля забирали у него 16 pt по ширине
  gridPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: GRID_RADIUS,
    borderTopRightRadius: GRID_RADIUS,
  },
  corner: { position: "absolute", top: spacing.sm, left: spacing.sm },
  favorite: { position: "absolute", top: 0, right: 0 },
  gridBody: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, gap: spacing.xs },
  // две строки footnote: карточки соседей по ряду встают на одну высоту
  gridName: { minHeight: 36 },
  gridCta: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },

  rowMain: { flexDirection: "row", gap: spacing.md },
  rowActions: { alignSelf: "flex-end", marginTop: spacing.sm },
  rowCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  rowImage: { width: 88, height: 88 },
  rowPhoto: { width: "100%", height: "100%", borderRadius: radii.xl },
  rowCorner: { position: "absolute", top: spacing.xs, left: spacing.xs },
  rowBody: { flex: 1, gap: 2 },
  rowName: { minHeight: 40 },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // при крупном Dynamic Type кнопка уходит на вторую строку вместо обрезки
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rowFavorite: { alignSelf: "flex-start", marginTop: -spacing.sm, marginRight: -spacing.sm },
});
