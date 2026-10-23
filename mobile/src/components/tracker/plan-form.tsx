import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, View } from "react-native";
import { useNavigation } from "expo-router";
import { newTrackerId } from "@/tracker/ids";
import type { TrackerController, TrackerPlan, TrackerPlanInput } from "@/tracker/types";
import { endDay, isCalendarDay, isSlot, nextDueDays } from "@/tracker/calendar";
import { AppText, Button, Card, Chip, Input, PressableScale, Screen } from "@/components/ui";
import { spacing, useColors } from "@/theme";
import { TimeList } from "./time-list";
import { SchedulePicker } from "./schedule-picker";
import { cadenceLabel, trackerDate } from "./presentation";

interface PlanFormProps { tracker: TrackerController; today: string; plan?: TrackerPlan; productId?: string; initialTitle?: string; onDone: () => void }
interface Fields { title?: string; interval?: string; duration?: string; anchor?: string; times?: string }

export function PlanForm({ tracker, today, plan, productId, initialTitle, onDone }: PlanFormProps) {
  const colors = useColors();
  const navigation = useNavigation();
  const [editRevision] = useState(plan?.revision);
  const [draftId] = useState<string>(() => newTrackerId());
  const [title, setTitle] = useState(plan?.title ?? initialTitle ?? "");
  const [interval, setInterval] = useState(String(plan?.intervalDays ?? 1));
  const [anchor, setAnchor] = useState(plan?.anchorDay ?? today);
  const [times, setTimes] = useState<string[]>(() => [...new Set(plan?.times ?? ["09:00"])].sort());
  const [forever, setForever] = useState(plan ? plan.durationDays === null : false);
  const [duration, setDuration] = useState(String(plan?.durationDays ?? 30));
  const [note, setNote] = useState(plan?.note ?? "");
  const [errors, setErrors] = useState<Fields>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ mode: "date" | "time"; value: string; oldTime?: string } | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const intervalNumber = /^\d+$/.test(interval) ? Number(interval) : NaN;
  const durationNumber = forever ? null : /^\d+$/.test(duration) ? Number(duration) : NaN;
  const validSchedule = isCalendarDay(anchor) && Number.isInteger(intervalNumber) && intervalNumber >= 1 && intervalNumber <= 365 && (durationNumber === null || Number.isInteger(durationNumber) && durationNumber >= 1 && durationNumber <= 3650) && times.length > 0 && times.every(isSlot);
  const candidate: TrackerPlanInput = { productId: plan?.productId ?? productId ?? null, title: title.trim(), anchorDay: anchor, intervalDays: intervalNumber, durationDays: durationNumber, times: [...new Set(times)].sort(), note: note.trim() || null, isActive: plan?.isActive ?? true };
  const preview = validSchedule ? nextDueDays({ ...candidate, isActive: true }, anchor > today ? anchor : today, 3) : [];
  const end = validSchedule ? endDay(candidate) : null;
  const submit = async () => {
    if (running.current) return;
    const next: Fields = {};
    if (!title.trim() || title.trim().length > 200) next.title = "Укажите название до 200 символов";
    if (!Number.isInteger(intervalNumber) || intervalNumber < 1 || intervalNumber > 365) next.interval = "Введите целое число от 1 до 365";
    if (!isCalendarDay(anchor)) next.anchor = "Выберите первый день приёма";
    if (durationNumber !== null && (!Number.isInteger(durationNumber) || durationNumber < 1 || durationNumber > 3650)) next.duration = "Введите от 1 до 3650 календарных дней";
    if (times.length === 0 || times.length > 24 || !times.every(isSlot)) next.times = "Добавьте от 1 до 24 корректных времён приёма";
    setErrors(next); setSaveError(null);
    if (Object.keys(next).length > 0) return;
    running.current = true; setSaving(true);
    try {
      await tracker.savePlan(candidate, plan?.id ?? draftId, editRevision);
      if (mounted.current && navigation.isFocused()) onDone();
    } catch (cause) { if (mounted.current) setSaveError(cause instanceof Error ? cause.message : "Курс не сохранён на устройстве. Попробуйте ещё раз."); }
    finally { running.current = false; if (mounted.current) setSaving(false); }
  };
  const changeTime = (value: string) => {
    if (!picker || !isSlot(value)) return;
    setTimes((previous) => [...new Set([...previous.filter((time) => time !== picker.oldTime), value])].sort());
    setPicker(null);
  };
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
    <Screen scroll scrollProps={{ keyboardShouldPersistTaps: "handled" }} footer={<View style={[styles.footer, { backgroundColor: colors.surface }]}><Button title={plan ? "Сохранить изменения" : "Создать курс"} loading={saving} fullWidth onPress={() => void submit()} /></View>} contentContainerStyle={styles.content}>
      {tracker.access === "guest" ? <Card tone="soft"><AppText variant="footnote" color="muted">Гостевой курс хранится только на этом устройстве. При удалении приложения или смене устройства данные потеряются. Перенос в аккаунт доступен после входа и только по вашему выбору.</AppText></Card> : null}
      <Input label="Название курса" placeholder="Например, Витамин D3" value={title} onChangeText={setTitle} editable={!saving} maxLength={200} error={errors.title} />
      {candidate.productId ? <AppText variant="footnote" color="muted">Курс связан с товаром из каталога. Эта связь сохранится.</AppText> : null}
      <View style={styles.section}>
        <AppText variant="headline" accessibilityRole="header">Повторение</AppText>
        <View style={styles.choices}><Chip label="Ежедневно" selected={interval === "1"} onPress={() => { if (!saving) setInterval("1"); }} /><Chip label="С интервалом" selected={interval !== "1"} onPress={() => { if (!saving && interval === "1") setInterval("4"); }} /></View>
        {interval !== "1" ? <Input label="Интервал, дней" value={interval} onChangeText={setInterval} keyboardType="number-pad" maxLength={8} editable={!saving} error={errors.interval} hint="Целое число от 1 до 365" /> : errors.interval ? <AppText color="danger" variant="footnote">{errors.interval}</AppText> : null}
        <PressableScale onPress={() => setPicker({ mode: "date", value: anchor })} disabled={saving} haptic="none" accessibilityRole="button" accessibilityLabel={`Первый день приёма: ${trackerDate(anchor, true)}`} style={[styles.date, { borderColor: colors.line, backgroundColor: colors.surface }]}><AppText variant="footnote" color="muted">Первый день приёма</AppText><AppText variant="body">{trackerDate(anchor, true)}</AppText></PressableScale>
        {errors.anchor ? <AppText variant="footnote" color="danger">{errors.anchor}</AppText> : null}
      </View>
      <View style={styles.section}>
        <AppText variant="headline" accessibilityRole="header">Время приёма</AppText>
        <AppText variant="footnote" color="muted">По местному времени устройства</AppText>
        <TimeList times={times} disabled={saving} addDisabled={saving || times.length >= 24} onAdd={() => setPicker({ mode: "time", value: "09:00" })} onEdit={(time) => setPicker({ mode: "time", value: time, oldTime: time })} onRemove={(time) => setTimes((previous) => previous.filter((value) => value !== time))} />
        {errors.times ? <AppText variant="footnote" color="danger">{errors.times}</AppText> : null}
      </View>
      <View style={styles.section}>
        <AppText variant="headline" accessibilityRole="header">Окончание курса</AppText>
        <View style={styles.switchRow}><AppText variant="body" style={styles.switchLabel}>Без даты окончания</AppText><Switch value={forever} onValueChange={setForever} disabled={saving} accessibilityLabel="Без даты окончания" trackColor={{ true: colors.brand }} /></View>
        {!forever ? <Input label="Длительность, календарных дней" value={duration} onChangeText={setDuration} keyboardType="number-pad" editable={!saving} maxLength={8} error={errors.duration} hint={end ? `Последний день — ${trackerDate(end, true)}` : "От 1 до 3650 дней; это не количество приёмов"} /> : null}
      </View>
      {validSchedule ? <Card tone="soft"><AppText variant="headline">{cadenceLabel(intervalNumber)}</AppText><AppText variant="subhead" color="muted" style={styles.preview}>Ближайшие даты: {preview.length ? preview.map((day) => trackerDate(day, true)).join("; ") : "в выбранном периоде ближайших приёмов нет"}</AppText>{!candidate.isActive ? <AppText variant="footnote" color="muted">Курс на паузе. Расписание начнёт работать после возобновления.</AppText> : null}</Card> : null}
      <Input label="Заметка (необязательно)" value={note} onChangeText={setNote} editable={!saving} multiline maxLength={1000} placeholder="Ваша заметка к курсу" />
      <AppText variant="footnote" color="muted">Курс сначала сохраняется на устройстве. Напоминания настраиваются отдельно в трекере и не влияют на сохранение.</AppText>
      {tracker.storageError ? <AppText variant="subhead" color="danger" accessibilityRole="alert">{tracker.storageError}</AppText> : null}
      {saveError ? <AppText variant="subhead" color="danger" accessibilityRole="alert">{saveError}</AppText> : null}
    </Screen>
    {picker ? <SchedulePicker key={`${picker.mode}:${picker.value}`} mode={picker.mode} value={picker.value} onCancel={() => setPicker(null)} onSubmit={picker.mode === "date" ? (value) => { setAnchor(value); setPicker(null); } : changeTime} /> : null}
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, content: { paddingTop: spacing.base, gap: spacing.xl }, section: { gap: spacing.md }, choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, date: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: spacing.base, minHeight: 56, gap: spacing.xs }, switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md }, switchLabel: { flex: 1 }, footer: { padding: spacing.base }, preview: { marginVertical: spacing.sm } });
