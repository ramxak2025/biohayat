import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText, Card, Divider } from "@/components/ui";
import { spacing } from "@/theme";

import { MENU_ROW_INSET } from "./menu-row";

export interface MenuGroupProps {
  title?: string;
  /** Пояснение под группой — как footer секции в системных «Настройках». */
  footer?: string;
  /** Отступ разделителя слева; по умолчанию — под плитку иконки. */
  inset?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Группа строк одной карточкой с hairline-разделителями между ними. */
export function MenuGroup({ title, footer, inset = MENU_ROW_INSET, children, style }: MenuGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={style}>
      {title ? (
        <AppText variant="footnote" color="muted" weight="600" style={styles.title}>
          {title}
        </AppText>
      ) : null}

      <Card padded={false}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <Divider inset={inset} /> : null}
            {row}
          </Fragment>
        ))}
      </Card>

      {footer ? (
        <AppText variant="footnote" color="faint" style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  footer: { marginTop: spacing.sm, marginHorizontal: spacing.xs },
});
