/* eslint-disable react-hooks/immutability -- Reanimated shared values: запись в `.value`
 * из эффекта — штатный способ анимировать на UI-потоке. Правило React Compiler
 * про shared values не знает и даёт ложное срабатывание. */
import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText, PressableScale } from "@/components/ui";
import { Duration, Ease, MIN_TAP_SIZE, radii, spacing, useColors } from "@/theme";

/** Сколько строк видно у длинного текста до «Показать полностью». */
const CLAMP_LINES = 8;
/**
 * С какой длины текст считаем длинным. Меряем символы, а не строки: измерение
 * через onTextLayout даёт кадр нерасчёсанной вёрстки и прыжок высоты, а порог
 * ≈ CLAMP_LINES × 45 символов (столько влезает в строку callout на iPhone)
 * ошибается только на пограничных абзацах — там кнопка просто не появится.
 */
const LONG_TEXT_CHARS = CLAMP_LINES * 45;

export interface AccordionSectionProps {
  title: string;
  text: string;
  icon?: SFSymbol;
  /** Первую секцию («Описание») открываем сразу — иначе экран выглядит пустым. */
  defaultOpen?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Раскрывающийся блок описания/состава.
 *
 * Длинный текст внутри открытой секции сначала обрезан до CLAMP_LINES строк с
 * кнопкой «Показать полностью» — ровно та привычка, с которой покупатель
 * приходит из Wildberries: сначала суть, подробности по требованию.
 *
 * Высоту не измеряем и не анимируем руками: `LinearTransition` на самой карточке
 * доводит её до новой высоты сам, а `overflow: hidden` не даёт тексту вылезти
 * за границы, пока карточка растёт.
 */
export function AccordionSection({
  title,
  text,
  icon,
  defaultOpen = false,
  style,
}: AccordionSectionProps) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);

  const long = text.length > LONG_TEXT_CHARS;
  const clamped = long && !expanded;

  const turn = useSharedValue(defaultOpen ? 1 : 0);

  useEffect(() => {
    turn.value = reduced
      ? (open ? 1 : 0)
      : withTiming(open ? 1 : 0, { duration: Duration.fast, easing: Ease.power2Out });
  }, [open, reduced, turn]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));

  return (
    <Animated.View
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2Out)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}
    >
      <PressableScale
        scale={0.99}
        onPress={() =>
          setOpen((value) => {
            // свернули секцию — длинный текст снова показываем с начала
            if (value) setExpanded(false);
            return !value;
          })
        }
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={open ? "Свернуть" : "Развернуть"}
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.brandSoft }]}>
            <SymbolView name={icon} size={15} tintColor={colors.brand} weight="medium" />
          </View>
        ) : null}

        <AppText variant="headline" numberOfLines={2} style={styles.title}>
          {title}
        </AppText>

        <Animated.View style={chevronStyle}>
          <SymbolView name="chevron.down" size={13} tintColor={colors.textFaint} weight="semibold" />
        </Animated.View>
      </PressableScale>

      {open ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(Duration.base).easing(Ease.power2Out)}
          exiting={reduced ? undefined : FadeOut.duration(Duration.instant)}
          style={styles.body}
        >
          <AppText
            variant="callout"
            color="muted"
            numberOfLines={clamped ? CLAMP_LINES : undefined}
            style={styles.text}
          >
            {text}
          </AppText>

          {long ? (
            <PressableScale
              haptic="none"
              scale={0.99}
              onPress={() => setExpanded((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Свернуть текст" : "Показать полностью"}
              accessibilityState={{ expanded }}
              style={styles.more}
            >
              {/* мелкая ссылка — brandText: основной бренд на белом не добирает 4.5:1 */}
              <AppText variant="subhead" weight="600" style={{ color: colors.brandText }}>
                {expanded ? "Свернуть" : "Показать полностью"}
              </AppText>
              <SymbolView
                name={expanded ? "chevron.up" : "chevron.down"}
                size={11}
                tintColor={colors.brandText}
                weight="semibold"
              />
            </PressableScale>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    // пока карточка растёт, текст не должен вылезать за её скруглённые углы
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: MIN_TAP_SIZE + 8,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1 },
  body: { paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  text: { lineHeight: 23 },
  more: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    alignSelf: "flex-start",
    minHeight: MIN_TAP_SIZE,
    paddingRight: spacing.md,
  },
});
