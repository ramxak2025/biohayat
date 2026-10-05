import { memo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from "react-native-reanimated";

import { AppText, IconButton, Price, PressableScale, Stepper } from "@/components/ui";
import { formatKopecks } from "@/lib/format";
import { useCart, type CartLine } from "@/store/cart";
import { Duration, Ease, radii, shadows, spacing, staggerDelay, useColors } from "@/theme";

import { lineOldPriceKopecks } from "./pricing";

/** Ширина «ящика» с кнопкой удаления, который открывается свайпом влево. */
const ACTION_WIDTH = 92;
const IMAGE_SIZE = 80;

export interface CartLineRowProps {
  line: CartLine;
  index: number;
  /** Удаление с undo: подтверждение — сам двухшаговый жест (свайп → тап). */
  onRemove: (line: CartLine) => void;
}

function DeleteAction({
  drag,
  onPress,
}: {
  drag: SharedValue<number>;
  onPress: () => void;
}) {
  const colors = useColors();

  // кнопка «приклеена» к правому краю строки и выезжает вместе с ней
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + ACTION_WIDTH }],
  }));

  return (
    <Animated.View style={[styles.actionWrap, style]}>
      <PressableScale
        onPress={onPress}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel="Удалить из корзины"
        style={[styles.action, { backgroundColor: colors.danger }]}
      >
        <SymbolView name="trash.fill" size={20} tintColor={colors.textOnBrand} weight="semibold" />
        <AppText variant="caption2" weight="700" maxScale={1.3} style={{ color: colors.textOnBrand }}>
          Удалить
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Строка корзины в привычном для маркетплейсов порядке: фото слева, справа
 * название в две строки, под ним цена, ещё ниже — количество и удаление.
 * Плотно: человек листает корзину, а не читает её.
 *
 * Свайп влево открывает деструктивное действие, тап по нему удаляет позицию —
 * это и есть подтверждение (HIG не советует спрашивать лишний раз о том, что
 * легко отменить; отмена живёт в плашке «Вернуть»). Тот же сценарий без жеста —
 * кнопка-корзина справа: она же единственная точка удаления для VoiceOver.
 */
export const CartLineRow = memo(function CartLineRow({ line, index, onRemove }: CartLineRowProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const router = useRouter();
  const setQty = useCart((state) => state.setQty);
  const swipeable = useRef<SwipeableMethods | null>(null);

  const lineTotal = line.priceKopecks * line.qty;
  const oldUnit = lineOldPriceKopecks(line);
  const oldTotal = oldUnit === null ? null : oldUnit * line.qty;

  const remove = () => {
    swipeable.current?.close();
    onRemove(line);
  };

  const openProduct = () => {
    router.push(`./product/${line.slug}` as `./${string}`, { relativeToDirectory: true });
  };

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(staggerDelay(index)).duration(Duration.reveal).easing(Ease.power3Out)
      }
      exiting={reduced ? undefined : FadeOut.duration(Duration.fast)}
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2Out)}
      // тень живёт снаружи: контейнер свайпа обязан обрезать содержимое
      // (overflow: hidden), иначе красная кнопка торчит за краем экрана
      style={[styles.outer, shadows.sm, { backgroundColor: colors.surface }]}
    >
      <ReanimatedSwipeable
        ref={swipeable}
        friction={1.6}
        rightThreshold={ACTION_WIDTH / 2}
        overshootRight={false}
        containerStyle={styles.swipeContainer}
        renderRightActions={(_progress, drag) => <DeleteAction drag={drag} onPress={remove} />}
      >
        <PressableScale
          onPress={openProduct}
          haptic="none"
          accessibilityRole="button"
          accessibilityLabel={`${line.name}. ${line.qty} шт. ${formatKopecks(lineTotal)}`}
          accessibilityHint="Открыть товар. Свайп влево — удалить из корзины"
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <View style={[styles.image, { backgroundColor: colors.surfaceSunken }]}>
            {line.image ? (
              <Image
                source={{ uri: line.image }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={line.id}
                accessibilityIgnoresInvertColors
                alt={line.name}
              />
            ) : (
              <View style={styles.noImage}>
                <SymbolView name="leaf" size={20} tintColor={colors.brand} />
              </View>
            )}
          </View>

          <View style={styles.body}>
            <AppText variant="subhead" weight="600" numberOfLines={2}>
              {line.name}
            </AppText>
            {line.volume ? (
              <AppText variant="caption" color="faint" numberOfLines={1}>
                {line.volume}
              </AppText>
            ) : null}

            {/* inline — как в маркетплейсах: «сколько платить / сколько было» одной строкой */}
            <Price price={lineTotal} oldPrice={oldTotal} size="sm" layout="inline" style={styles.price} />
            {line.qty > 1 ? (
              <AppText variant="caption" color="faint" numberOfLines={1}>
                по {formatKopecks(line.priceKopecks)}
              </AppText>
            ) : null}

            <View style={styles.footer}>
              {/* `onRemove` степперу не даём: иначе на количестве 1 «−» тоже
                  превращается в корзину и в строке оказываются две одинаковые
                  иконки удаления рядом */}
              <Stepper
                value={line.qty}
                size="sm"
                onChange={(next) => setQty(line.id, next)}
              />
              <IconButton
                name="trash"
                label={`Удалить из корзины: ${line.name}`}
                size={17}
                haptic="none"
                color={colors.textFaint}
                onPress={remove}
                style={styles.trash}
              />
            </View>
          </View>
        </PressableScale>
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  outer: { marginBottom: spacing.sm, borderRadius: radii["2xl"] },
  // радиус на контейнере свайпа, иначе красная кнопка торчит углами из-под карточки
  swipeContainer: { borderRadius: radii["2xl"] },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: radii.lg, overflow: "hidden" },
  noImage: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  price: { marginTop: spacing.xs },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  // кнопка «висит» на правом краю карточки: её зона нажатия шире глифа
  trash: { marginRight: -spacing.sm },
  actionWrap: { width: ACTION_WIDTH, paddingLeft: spacing.sm },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radii["2xl"],
  },
});
