import { StyleSheet, View } from "react-native";

import type { MaterialListItem } from "@/api/types";
import { SectionHeader } from "@/components/ui";
import { ArticleCard, ArticleCardSkeleton } from "@/screens/articles/article-card";
import { spacing } from "@/theme";

export interface MoreArticlesProps {
  items: MaterialListItem[];
  isLoading?: boolean;
  onPress: (item: MaterialListItem) => void;
  onShowAll?: () => void;
}

/** Блок «Другие материалы» под статьёй: 2–3 карточки, чтобы чтение не обрывалось. */
export function MoreArticles({ items, isLoading, onPress, onShowAll }: MoreArticlesProps) {
  if (!isLoading && items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Другие материалы" onAction={onShowAll} style={styles.header} />

      {isLoading && items.length === 0 ? (
        <View style={styles.list}>
          {[0, 1].map((key) => (
            <ArticleCardSkeleton key={key} />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <ArticleCard key={item.id} item={item} index={index} onPress={onPress} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  header: { marginBottom: spacing.md },
  list: { gap: spacing.md },
});
