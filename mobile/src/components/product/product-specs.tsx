import { Fragment } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useRouter, type Href } from "expo-router";

import { AUDIENCES, GOALS, type Product } from "@/api/types";
import { AppText, Card, Chip, Divider, SectionHeader } from "@/components/ui";
import { spacing } from "@/theme";

export interface ProductSpecsProps {
  product: Product;
  style?: StyleProp<ViewStyle>;
}

interface SpecChip {
  key: string;
  label: string;
  href: string;
}

type SpecRow =
  | { kind: "text"; key: string; label: string; value: string }
  | { kind: "chips"; key: string; label: string; chips: SpecChip[] };

const nameBySlug = (
  list: readonly { readonly slug: string; readonly name: string }[],
  slug: string,
): string => list.find((item) => item.slug === slug)?.name ?? slug;

/** Строки таблицы. Ссылки — просто строки, роутер нужен только на нажатие. */
function buildRows(product: Product): SpecRow[] {
  const rows: SpecRow[] = [];

  if (product.volume) {
    rows.push({ kind: "text", key: "volume", label: "Форма выпуска", value: product.volume });
  }

  if (product.nutrients.length > 0) {
    rows.push({
      kind: "chips",
      key: "nutrients",
      label: "Компоненты",
      chips: product.nutrients.map((nutrient) => ({
        key: `nutrient-${nutrient}`,
        label: nutrient,
        // у компонентов нет своей оси фильтра — честный вариант это поиск по названию
        href: `/catalog?q=${encodeURIComponent(nutrient)}`,
      })),
    });
  }

  if (product.audiences.length > 0) {
    rows.push({
      kind: "chips",
      key: "audiences",
      label: "Кому подходит",
      chips: product.audiences.map((slug) => ({
        key: `audience-${slug}`,
        label: nameBySlug(AUDIENCES, slug),
        href: `/catalog?audience=${encodeURIComponent(slug)}`,
      })),
    });
  }

  if (product.goals.length > 0) {
    rows.push({
      kind: "chips",
      key: "goals",
      label: "Зачем принимают",
      chips: product.goals.map((slug) => ({
        key: `goal-${slug}`,
        label: nameBySlug(GOALS, slug),
        href: `/catalog?goal=${encodeURIComponent(slug)}`,
      })),
    });
  }

  if (product.sku) {
    // артикул внизу таблицы: как в WB — нужен редко, но должен быть под рукой
    rows.push({ kind: "text", key: "sku", label: "Артикул", value: product.sku });
  }

  return rows;
}

/** Есть ли что показывать: экран спрашивает до того, как отдать блоку отступы. */
export function hasProductSpecs(product: Product): boolean {
  return buildRows(product).length > 0;
}

/**
 * «Характеристики» — таблица «свойство → значение», как в карточке Wildberries.
 *
 * Почему таблица, а не абзац: покупатель, пришедший из WB, ищет здесь глазами
 * конкретную строку («Артикул», «Форма выпуска»), а не читает текст. Поэтому
 * слева — свойство серым, справа — значение, и строки разделены волосяной
 * линией, как в системных списках iOS.
 *
 * Отличие от WB в нашу пользу: значения-таксономии здесь не мёртвый текст, а
 * чипсы — тап уводит в каталог с уже наложенным фильтром.
 *
 * Строк со «звёздами», отзывами, остатками и сроками доставки тут нет: этих
 * полей нет в API, а выдумывать характеристики товара нельзя.
 */
export function ProductSpecs({ product, style }: ProductSpecsProps) {
  const router = useRouter();

  const rows = buildRows(product);

  if (rows.length === 0) return null;

  return (
    <View style={style}>
      <SectionHeader title="Характеристики" />

      <Card padded={false}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 ? <Divider inset={spacing.base} /> : null}

            {row.kind === "text" ? (
              <View
                style={[styles.row, styles.textRow]}
                accessible
                accessibilityLabel={`${row.label}: ${row.value}`}
              >
                <AppText variant="footnote" color="faint" style={styles.label}>
                  {row.label}
                </AppText>
                <AppText variant="subhead" style={styles.value}>
                  {row.value}
                </AppText>
              </View>
            ) : (
              <View style={[styles.row, styles.chipsRow]}>
                <AppText variant="footnote" color="faint" style={[styles.label, styles.chipsLabel]}>
                  {row.label}
                </AppText>
                <View style={styles.chips}>
                  {row.chips.map((chip) => (
                    <Chip
                      key={chip.key}
                      label={chip.label}
                      onPress={() => router.push(chip.href as Href)}
                    />
                  ))}
                </View>
              </View>
            )}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.base },
  textRow: { alignItems: "center", paddingVertical: spacing.md },
  // у чипсов своя зона нажатия 44 pt — вертикальные отступы им нужны меньше
  chipsRow: { paddingVertical: spacing.xs },
  // свойство не тянется за значением: колонка фиксированной ширины читается
  // как столбец, но при крупном Dynamic Type может ужаться
  label: { flexGrow: 0, flexShrink: 1, flexBasis: 124 },
  // у чипсы высота 44 pt, у подписи — 18: без сдвига подпись висела бы выше
  // первой чипсы, а не на одной с ней линии
  chipsLabel: { paddingTop: spacing.md + 1 },
  value: { flex: 1 },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
