import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { TrackerController } from "@/tracker/types";
import { AppText, Button, Card } from "@/components/ui";
import { plural } from "@/lib/format";
import { spacing } from "@/theme";

export function TrackerState({ tracker }: { tracker: TrackerController }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось выполнить действие. Попробуйте ещё раз."); }
    finally { running.current = false; setBusy(false); }
  };
  return <View style={styles.stack}>
    {tracker.access === "guest" ? <Card tone="soft">
      <AppText variant="headline">Гостевой трекер</AppText>
      <AppText variant="subhead" color="muted" style={styles.copy}>Данные хранятся только на этом устройстве. При удалении приложения или смене устройства они потеряются.</AppText>
      <Button title="Войти для сохранения в аккаунте" variant="ghost" size="sm" onPress={() => router.push("/auth")} />
    </Card> : <View style={styles.status}>
      <AppText variant="footnote" color="muted">{tracker.syncing ? "Синхронизируем изменения…" : !tracker.online ? "Без сети · данные на устройстве" : tracker.pendingCount > 0 ? `${tracker.pendingCount} ${plural(tracker.pendingCount, "изменение ожидает", "изменения ожидают", "изменений ожидают")} отправки` : "Трекер связан с аккаунтом"}</AppText>
      {tracker.pendingCount > 0 || tracker.syncError ? <Button title="Синхронизировать" variant="ghost" size="sm" disabled={!tracker.online} loading={busy || tracker.syncing} onPress={() => void run(tracker.sync)} /> : null}
    </View>}
    {tracker.access === "account" && tracker.guestPlanCount > 0 ? <Card tone="soft">
      <AppText variant="headline">Перенести гостевые курсы?</AppText>
      <AppText variant="subhead" color="muted" style={styles.copy}>На телефоне есть {tracker.guestPlanCount} {plural(tracker.guestPlanCount, "гостевой курс", "гостевых курса", "гостевых курсов")}. Они не добавляются в аккаунт автоматически.</AppText>
      <Button title="Перенести в этот аккаунт" variant="secondary" loading={busy} onPress={() => void run(tracker.importGuest)} />
    </Card> : null}
    {tracker.storageError ? <Card>
      <AppText variant="headline">Данные на устройстве недоступны</AppText>
      <AppText variant="subhead" color="muted" style={styles.copy}>{tracker.storageError}</AppText>
      <Button title="Повторить загрузку" variant="secondary" loading={busy} onPress={() => void run(tracker.reload)} />
    </Card> : null}
    {tracker.syncError ? <AppText variant="footnote" color="danger" accessibilityRole="alert">Синхронизация не завершена: {tracker.syncError}</AppText> : null}
    {error ? <AppText variant="footnote" color="danger" accessibilityRole="alert">{error}</AppText> : null}
  </View>;
}

export function TrackerConflicts({ tracker }: { tracker: TrackerController }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const resolve = async (id: string, choice: "server" | "local") => {
    if (running.current) return;
    running.current = true; setBusy(id); setError(null);
    try { await tracker.resolveConflict(id, choice); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить выбор"); }
    finally { running.current = false; setBusy(null); }
  };
  return <View style={styles.stack}>
    {tracker.conflicts.map((conflict) => <Card key={conflict.id} tone="soft">
      <AppText variant="headline">Нужно выбрать версию</AppText>
      <AppText variant="body" style={styles.copy}>{conflict.title}</AppText>
      <AppText variant="subhead" color="muted" style={styles.copy}>{conflict.message}</AppText>
      {conflict.deletedRemotely ? <AppText variant="footnote" color="muted">Ваш вариант можно сохранить отдельным новым курсом. Удалённый курс не восстановится.</AppText> : null}
      <View style={styles.actions}>
        <Button title={conflict.deletedRemotely ? "Принять удаление" : "Принять версию из аккаунта"} variant="secondary" fullWidth loading={busy === conflict.id} disabled={busy !== null} onPress={() => void resolve(conflict.id, "server")} />
        <Button title={conflict.deletedRemotely ? "Сохранить отдельным курсом" : "Оставить мой вариант"} variant="outline" fullWidth disabled={busy !== null} onPress={() => void resolve(conflict.id, "local")} />
      </View>
    </Card>)}
    {error ? <AppText variant="footnote" color="danger" accessibilityRole="alert">{error}</AppText> : null}
  </View>;
}
const styles = StyleSheet.create({ stack: { gap: spacing.md }, copy: { marginTop: spacing.sm, marginBottom: spacing.md }, status: { gap: spacing.xs }, actions: { gap: spacing.sm, marginTop: spacing.md } });
