import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { Consultation } from "@/api/types";
import { AppText, Badge, Card, EmptyState, ErrorState, ListSkeleton } from "@/components/ui";
import { formatDateRelative } from "@/lib/format";
import { Duration, Ease, spacing, staggerDelay } from "@/theme";

import { STATUS_META } from "./schema";

/** «сегодня, 14:05» — по заявке перезванивают в тот же день, время важнее даты. */
function formatSentAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateRelative(iso)}, ${hh}:${mm}`;
}

function RequestCard({ item, index }: { item: Consultation; index: number }) {
  const reduced = useReducedMotion();
  const status = STATUS_META[item.status];

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out).delay(staggerDelay(index))
      }
    >
      <Card padded={spacing.base}>
        <View style={styles.header}>
          <AppText variant="headline" numberOfLines={1} style={styles.topic}>
            {item.topic?.trim() || "Вопрос нутрициологу"}
          </AppText>
          <Badge label={status.label} tone={status.tone} size="sm" />
        </View>

        {item.message ? (
          <AppText variant="subhead" color="muted" style={styles.message}>
            {item.message}
          </AppText>
        ) : null}

        <AppText variant="caption" color="faint" style={styles.date}>
          {formatSentAt(item.createdAt)}
        </AppText>
      </Card>
    </Animated.View>
  );
}

/**
 * Свои заявки. Список без пагинации (api-contract §4.20) и короткий — рисуем
 * обычным map внутри общего ScrollView, виртуализация тут только навредила бы.
 */
export function RequestList() {
  const query = useQuery({
    queryKey: qk.consultations,
    queryFn: ({ signal }) => api.consultations.list(signal),
    staleTime: 60 * 1000,
  });

  if (query.isLoading) return <ListSkeleton variant="row" count={2} />;

  if (query.error && !query.data) {
    return <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />;
  }

  const items = query.data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon="tray"
        title="Заявок пока нет"
        subtitle="Отправьте первый вопрос — нутрициолог ответит по телефону."
      />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <RequestCard key={item.id} item={item} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  topic: { flex: 1 },
  message: { marginTop: spacing.sm },
  date: { marginTop: spacing.md },
});
