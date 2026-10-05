import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { AppText, Divider } from "@/components/ui";
import { radii, spacing, typography, useColors } from "@/theme";

import { openExternalLink } from "./links";
import type { ArticleBlock, InlineNode } from "./parse-content";

/**
 * Межстрочный интервал для длинного чтения — 1.6 от кегля. Системные 22 pt при
 * 17 pt (1.29) хороши для интерфейса, но в статье строки слипаются.
 */
const READING_LINE_HEIGHT = 27;
/** Комфортная длина строки. На iPhone ограничение не срабатывает, на iPad — да. */
export const READING_MAX_WIDTH = 640;

export interface ArticleContentProps {
  blocks: ArticleBlock[];
}

/** Рендер разобранного контента статьи нативными компонентами. */
export function ArticleContent({ blocks }: ArticleContentProps) {
  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => (
        <ArticleBlockView key={index} block={block} />
      ))}
    </View>
  );
}

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  const colors = useColors();

  switch (block.kind) {
    case "heading":
      return (
        <AppText
          variant={block.level === 2 ? "title2" : "title3"}
          accessibilityRole="header"
          style={block.level === 2 ? styles.heading2 : styles.heading3}
        >
          <InlineNodes nodes={block.nodes} />
        </AppText>
      );

    case "paragraph":
      return (
        <AppText variant="body" selectable style={styles.paragraph}>
          <InlineNodes nodes={block.nodes} />
        </AppText>
      );

    case "list":
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <AppText variant="body" color="brand" weight="600" style={styles.marker}>
                {block.ordered ? `${index + 1}.` : "•"}
              </AppText>
              <AppText variant="body" selectable style={styles.listText}>
                <InlineNodes nodes={item} />
              </AppText>
            </View>
          ))}
        </View>
      );

    case "quote":
      return (
        <View style={[styles.quote, { borderLeftColor: colors.brand, backgroundColor: colors.brandSoft }]}>
          <AppText variant="callout" color="muted" selectable style={styles.quoteText}>
            <InlineNodes nodes={block.nodes} />
          </AppText>
        </View>
      );

    case "code":
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.code, { backgroundColor: colors.surfaceSunken }]}
          contentContainerStyle={styles.codeContent}
        >
          <Text selectable style={[styles.codeText, { color: colors.text }]}>
            {block.text}
          </Text>
        </ScrollView>
      );

    case "image":
      return <ContentImage uri={block.uri} alt={block.alt} />;

    case "rule":
      return <Divider style={styles.rule} />;
  }
}

/** Картинка из текста статьи: пропорции берём из самого файла, чтобы не кадрировать. */
function ContentImage({ uri, alt }: { uri: string; alt: string | null }) {
  const colors = useColors();
  const [ratio, setRatio] = useState(16 / 9);

  return (
    <View style={styles.imageBlock}>
      <Image
        source={{ uri }}
        style={[styles.image, { aspectRatio: ratio, backgroundColor: colors.surfaceSunken }]}
        contentFit="cover"
        transition={240}
        cachePolicy="memory-disk"
        accessibilityIgnoresInvertColors
        alt={alt ?? undefined}
        onLoad={(event) => {
          const { width, height } = event.source;
          if (width > 0 && height > 0) setRatio(width / height);
        }}
      />
      {alt ? (
        <AppText variant="caption" color="faint" style={styles.caption}>
          {alt}
        </AppText>
      ) : null}
    </View>
  );
}

function InlineNodes({ nodes }: { nodes: InlineNode[] }) {
  const colors = useColors();

  return (
    <>
      {nodes.map((node, index) => {
        const style = [
          node.bold ? styles.bold : null,
          node.italic ? styles.italic : null,
          node.code ? [styles.inlineCode, { color: colors.text, backgroundColor: colors.surfaceSunken }] : null,
          node.href ? [styles.link, { color: colors.brand }] : null,
        ];

        if (node.href) {
          const href = node.href;
          return (
            <Text
              key={index}
              style={style}
              accessibilityRole="link"
              accessibilityHint="Откроется во встроенном браузере"
              onPress={() => void openExternalLink(href, colors.brand)}
            >
              {node.text}
            </Text>
          );
        }

        return (
          <Text key={index} style={style}>
            {node.text}
          </Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },

  paragraph: { lineHeight: READING_LINE_HEIGHT, marginBottom: spacing.base },
  heading2: { marginTop: spacing.lg, marginBottom: spacing.sm },
  heading3: { marginTop: spacing.base, marginBottom: spacing.xs },

  list: { marginBottom: spacing.base, gap: spacing.sm },
  listItem: { flexDirection: "row", gap: spacing.sm },
  marker: { lineHeight: READING_LINE_HEIGHT, minWidth: 18 },
  listText: { flex: 1, lineHeight: READING_LINE_HEIGHT },

  quote: {
    borderLeftWidth: 3,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.base,
  },
  quoteText: { lineHeight: 24 },

  code: { borderRadius: radii.md, marginBottom: spacing.base },
  codeContent: { padding: spacing.md },
  codeText: { fontFamily: "Menlo", fontSize: 13, lineHeight: 19 },

  imageBlock: { marginBottom: spacing.base, gap: spacing.xs },
  image: { width: "100%", borderRadius: radii.lg },
  caption: { textAlign: "center" },

  rule: { marginVertical: spacing.lg },

  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  link: { textDecorationLine: "underline" },
  inlineCode: { fontFamily: "Menlo", fontSize: typography.footnote.fontSize },
});
