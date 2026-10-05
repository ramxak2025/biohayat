import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { Money } from "@/api/types";
import { formatKopecks } from "@/lib/format";
import { spacing, useColors } from "@/theme";

import { AppText, type TextVariant } from "./app-text";
import { Badge } from "./badge";

export type PriceValue = Money | number;
export type PriceSize = "sm" | "md" | "lg";

/**
 * Как расставлены две цены относительно друг друга.
 *
 * `stack` — старая цена ПОД текущей. Историческое поведение и значение по
 *   умолчанию: так вызывает экран товара и панель покупки, менять их вёрстку
 *   эта правка не должна.
 * `inline` — старая цена СПРАВА от текущей, в одну строку. Ровно так цену
 *   показывают маркетплейсы: блок занимает одну строку вместо двух (в плитке
 *   каждый лишний ряд текста — это минус к площади фото), и глаз читает
 *   «сколько платить / сколько было» одним движением слева направо.
 */
export type PriceLayout = "stack" | "inline";

export interface PriceProps {
  /** Money из API либо просто копейки. */
  price: PriceValue;
  oldPrice?: PriceValue | null;
  discountPercent?: number | null;
  /**
   * Масштаб блока. Компактный для плитки каталога — `size="md" layout="inline"`,
   * крупный для карточки товара — `size="lg"`.
   */
  size?: PriceSize;
  layout?: PriceLayout;
  /** Показывать бейдж «−N %» рядом с ценой. В плитке он живёт на фото — там выключаем. */
  showDiscount?: boolean;
  align?: "left" | "center" | "right";
  style?: StyleProp<ViewStyle>;
}

const kopecks = (value: PriceValue): number => (typeof value === "number" ? value : value.kopecks);

/** Текущая цена — главный герой, поэтому шкала идёт крупными ступенями. */
const CURRENT: Record<PriceSize, TextVariant> = { sm: "callout", md: "title3", lg: "title1" };
/** Старая цена под текущей читается как подпись. */
const OLD_STACK: Record<PriceSize, TextVariant> = { sm: "caption", md: "footnote", lg: "callout" };
/**
 * Старая цена в одной строке с текущей — на ступень мельче, чем в `stack`:
 * рядом с крупной ценой она не должна спорить за внимание, её задача —
 * показать выгоду, а не сумму.
 */
const OLD_INLINE: Record<PriceSize, TextVariant> = { sm: "caption2", md: "caption", lg: "subhead" };

export function Price({
  price,
  oldPrice,
  discountPercent,
  size = "md",
  layout = "stack",
  showDiscount = true,
  align = "left",
  style,
}: PriceProps) {
  const colors = useColors();

  const current = kopecks(price);
  const old = oldPrice == null ? null : kopecks(oldPrice);
  const hasOld = old !== null && old > current;
  // сервер уже считает процент; если не прислал — берём из цен, чтобы не врать округлением
  const percent = discountPercent ?? (hasOld && old ? Math.round(((old - current) / old) * 100) : null);

  // Скидка перекрашивает цену в sale — это единственный способ увидеть выгоду
  // с расстояния вытянутой руки. Без скидки цена остаётся обычным текстом:
  // красный «просто так» обесценивает красный на распродаже.
  const currentNode = (
    <AppText
      variant={CURRENT[size]}
      weight="800"
      maxScale={1.5}
      style={[styles.amount, { color: hasOld ? colors.sale : colors.text }]}
    >
      {formatKopecks(current)}
    </AppText>
  );

  const oldNode =
    hasOld && old !== null ? (
      <AppText
        variant={(layout === "inline" ? OLD_INLINE : OLD_STACK)[size]}
        color="faint"
        weight="500"
        maxScale={1.4}
        // зачёркивание — чистая графика: без подписи VoiceOver прочтёт просто
        // второе число и получится «тысяча триста рублей две тысячи рублей»
        accessibilityLabel={`Старая цена ${formatKopecks(old)}`}
        style={[styles.amount, styles.old]}
      >
        {formatKopecks(old)}
      </AppText>
    ) : null;

  const badgeNode =
    hasOld && showDiscount && percent ? <Badge label={`−${percent}%`} tone="sale" size="sm" solid /> : null;

  if (layout === "inline") {
    return (
      // baseline, а не center: цены разного кегля должны стоять на одной линии
      // шрифта, иначе мелкая старая цена «висит» посреди крупной новой.
      // flexWrap — страховка Dynamic Type: на крупном шрифте старая цена
      // переедет на вторую строку, а не обрежется.
      <View style={[styles.inline, { justifyContent: alignment[align] }, style]}>
        {currentNode}
        {oldNode}
        {badgeNode}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { alignItems: alignment[align] }, style]}>
      <View style={styles.row}>
        {currentNode}
        {badgeNode}
      </View>
      {oldNode}
    </View>
  );
}

/** Одна карта на оба режима: в колонке это alignItems, в строке — justifyContent. */
const alignment = { left: "flex-start", center: "center", right: "flex-end" } as const;

const styles = StyleSheet.create({
  wrap: { gap: 2, maxWidth: "100%" },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, maxWidth: "100%" },
  inline: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    maxWidth: "100%",
  },
  amount: { maxWidth: "100%" },
  old: { textDecorationLine: "line-through" },
});
