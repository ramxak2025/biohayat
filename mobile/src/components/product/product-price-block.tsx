import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import type { Product } from "@/api/types";
import { Badge, Price } from "@/components/ui";
import { spacing } from "@/theme";

export interface ProductPriceBlockProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ценовой блок карточки — первый блок под фотографиями, ДО названия товара.
 *
 * Это не вкусовщина, а перенесённая привычка покупателя Wildberries: там взгляд
 * после фото сразу падает на цену, и только потом на название. Поэтому здесь
 * крупная цена со скидкой, ярлык процента и перечёркнутая старая цена (всё это
 * умеет общий `Price` — рисовать деньги по-своему на одном экране нельзя,
 * иначе каталог и карточка разъедутся), а следом — строка статусов: наличие и
 * метки из админки («хит», «новинка»).
 *
 * Почему «Нет в наличии» здесь только бейджем, без объяснений: развёрнутую
 * фразу говорит панель покупки внизу, рядом с заблокированной кнопкой — там она
 * и нужна, а два одинаковых предупреждения на одном экране читаются как ошибка.
 *
 * Чего здесь сознательно нет: рейтинга, отзывов, остатков и сроков доставки.
 * Таких полей у нас в API не существует, а рисовать их заглушками — врать
 * покупателю на самом ответственном месте экрана.
 */
export function ProductPriceBlock({ product, style }: ProductPriceBlockProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Price
        price={product.price}
        oldPrice={product.oldPrice}
        discountPercent={product.discountPercent}
        size="lg"
      />

      <View style={styles.badges}>
        <Badge
          label={product.inStock ? "В наличии" : "Нет в наличии"}
          tone={product.inStock ? "success" : "neutral"}
          icon={product.inStock ? "checkmark.circle.fill" : "clock"}
        />
        {product.badges.map((badge) => (
          <Badge key={badge} label={badge} tone="accent" />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
