import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";

import { api } from "@/api/endpoints";
import { qk } from "@/api/keys";
import type { CreateIntakePlanBody, IntakePlan, UpdateIntakePlanBody } from "@/api/types";
import {
  AuthInvite,
  TimeList,
  formatDayLabel,
  isValidSlot,
  planStartDay,
  sortSlots,
} from "@/components/tracker";
// нативный SwiftUI-пикер держим вне бочки — см. комментарий в @/components/tracker/index.ts
import { TimePickerSheet } from "@/components/tracker/time-picker-sheet";
import {
  AppText,
  BadDisclaimer,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  GlassSurface,
  Input,
  Screen,
  Skeleton,
  errorMessage,
  useDetailScreenOptions,
} from "@/components/ui";
import { localDay, plural } from "@/lib/format";
import {
  areRemindersEnabled,
  registerPushToken,
  requestNotificationPermission,
  setRemindersEnabled,
  syncIntakeReminders,
} from "@/lib/notifications";
import { useIsAuthenticated } from "@/store/auth";
import { radii, spacing, useColors } from "@/theme";

/** Ограничения из zod-схемы сервера (§4.19.2 контракта). */
const TITLE_MAX = 200;
const NOTE_MAX = 1000;
const DURATION_MIN = 1;
const DURATION_MAX = 3650;
/** Столько времён принимает PATCH; держим тот же предел и при создании. */
const TIMES_MAX = 24;

const QUICK_TIMES = ["08:00", "09:00", "12:00", "14:00", "18:00", "21:00"] as const;
const DURATIONS: { label: string; value: number | null }[] = [
  { label: "14 дней", value: 14 },
  { label: "30 дней", value: 30 },
  { label: "60 дней", value: 60 },
  { label: "90 дней", value: 90 },
  { label: "Бессрочно", value: null },
];

interface FormErrors {
  title?: string;
  times?: string;
  duration?: string;
  note?: string;
}

interface DurationState {
  duration: number | null;
  custom: string;
  customMode: boolean;
}

/** Длительность курса → состояние двух контролов: чипсы и поле «Другое». */
function initialDuration(plan?: IntakePlan): DurationState {
  const value = plan?.durationDays;
  if (value === undefined) return { duration: 30, custom: "", customMode: false };
  if (value === null || DURATIONS.some((item) => item.value === value)) {
    return { duration: value, custom: "", customMode: false };
  }
  return { duration: 30, custom: String(value), customMode: true };
}

/**
 * Экран курса приёма: создание и правка.
 *
 * Режим правки включает query-параметр `planId`. Отдельный экран заводить не
 * стали: поля, валидация и перепланировка напоминаний совпадают один-в-один,
 * а расходятся только тексты и метод запроса (POST против PATCH).
 *
 * Здесь — только загрузка курса; саму форму монтируем, когда данные уже есть,
 * чтобы поля заполнялись начальным состоянием, а не эффектом-гидратацией.
 */
export function TrackerNewScreen() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const detailOptions = useDetailScreenOptions();

  const params = useLocalSearchParams<{ productId?: string; title?: string; planId?: string }>();
  const planId = typeof params.planId === "string" && params.planId.length > 0 ? params.planId : undefined;
  const isEditing = planId !== undefined;

  /**
   * Курс берём из общего списка (qk.intakePlans): с трекера мы приходим с уже
   * прогретым кэшом и форма открывается заполненной без единого запроса. Сам
   * запрос нужен только при холодном старте — например, по ссылке извне.
   */
  const plansQuery = useQuery({
    queryKey: qk.intakePlans,
    queryFn: ({ signal }) => api.intake.plans(localDay(), signal),
    enabled: isEditing && isAuthenticated,
    staleTime: 30_000,
  });

  const plan = useMemo(
    () => (planId ? plansQuery.data?.find((item) => item.id === planId) : undefined),
    [plansQuery.data, planId],
  );

  const screenOptions = (
    <Stack.Screen options={{ ...detailOptions, title: isEditing ? "Изменить курс" : "Новый курс" }} />
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/tracker" as Href);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <>
        {screenOptions}
        <AuthInvite
          title="Курс сохраняется в кабинете"
          subtitle="Войдите, чтобы завести курс приёма и получать напоминания."
        />
      </>
    );
  }

  // правку без загруженного курса показывать нечем: поля были бы пустыми,
  // и первое же сохранение затёрло бы настоящие данные
  if (isEditing && !plan) {
    if (plansQuery.isError) {
      return (
        <>
          {screenOptions}
          <Screen>
            <View style={styles.center}>
              <ErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
            </View>
          </Screen>
        </>
      );
    }

    if (plansQuery.isPending) {
      return (
        <>
          {screenOptions}
          <Screen scroll>
            <View style={styles.loading}>
              <Skeleton height={18} width="45%" />
              <Skeleton height={52} radius={radii.lg} />
              <Skeleton height={18} width="35%" />
              <Skeleton height={132} radius={radii.lg} />
              <Skeleton height={18} width="30%" />
              <Skeleton height={44} radius={radii.pill} />
            </View>
          </Screen>
        </>
      );
    }

    return (
      <>
        {screenOptions}
        <Screen>
          <View style={styles.center}>
            <EmptyState
              icon="pills"
              title="Курс не найден"
              subtitle="Похоже, его удалили — возможно, с другого устройства. Вернитесь к списку курсов."
              actionLabel="К трекеру"
              onAction={goBack}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      {screenOptions}
      <PlanForm
        plan={plan}
        productId={typeof params.productId === "string" ? params.productId : undefined}
        initialTitle={typeof params.title === "string" ? params.title : undefined}
        onDone={goBack}
      />
    </>
  );
}

interface PlanFormProps {
  /** Курс, который правим. undefined — режим создания. */
  plan?: IntakePlan;
  /** Товар из каталога, с которого пришли заводить курс (только при создании). */
  productId?: string;
  initialTitle?: string;
  onDone: () => void;
}

function PlanForm({ plan, productId: productParam, initialTitle, onDone }: PlanFormProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const isEditing = plan !== undefined;

  // при создании товар приходит параметром, при правке — из самого курса
  const productId = plan ? (plan.productId ?? undefined) : productParam;

  const [title, setTitle] = useState(() => plan?.title ?? initialTitle ?? "");
  // sortSlots заодно выбрасывает времена в неизвестном формате — PATCH их всё
  // равно не примет, так что правка чинит такой курс, а не ломается об него
  const [times, setTimes] = useState<string[]>(() => (plan ? sortSlots(plan.times) : ["09:00"]));
  const [duration, setDuration] = useState<number | null>(() => initialDuration(plan).duration);
  const [customDuration, setCustomDuration] = useState(() => initialDuration(plan).custom);
  const [customMode, setCustomMode] = useState(() => initialDuration(plan).customMode);
  const [note, setNote] = useState(() => plan?.note ?? "");
  const [remindMe, setRemindMe] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  const [picker, setPicker] = useState<{ open: boolean; editing: string | null; initial: string }>({
    open: false,
    editing: null,
    initial: "09:00",
  });

  const sortedTimes = useMemo(() => sortSlots(times), [times]);

  const applyTimes = useCallback((next: string[]) => {
    setTimes(sortSlots(next));
    setErrors((prev) => ({ ...prev, times: undefined }));
  }, []);

  const addTime = useCallback(
    (time: string) => {
      if (!isValidSlot(time)) return;
      // Chip сам отдаёт selection-хаптику — своя здесь была бы двойной
      setTimes((prev) => (prev.includes(time) ? prev : sortSlots([...prev, time])));
      setErrors((prev) => ({ ...prev, times: undefined }));
    },
    [],
  );

  /**
   * Общий хвост сохранения для обоих режимов.
   *
   * `askPermission` — только для нового курса: там системный диалог уместен,
   * а при правке разрешение уже спрашивали. Список тянем заново, потому что
   * `syncIntakeReminders` перепланирует ВСЕ напоминания разом и должен видеть
   * новые времена приёма — иначе после правки будильники останутся старыми.
   */
  const finishSave = useCallback(
    async (askPermission: boolean) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const plans = await queryClient.fetchQuery<IntakePlan[]>({
        queryKey: qk.intakePlans,
        queryFn: ({ signal }) => api.intake.plans(localDay(), signal),
        staleTime: 0,
      });

      if (askPermission) {
        // системный диалог показываем именно здесь: курс создан, польза очевидна
        const permission = await requestNotificationPermission();
        if (permission === "granted") {
          await setRemindersEnabled(true);
          await syncIntakeReminders(plans);
          void registerPushToken();
        }
      } else if (await areRemindersEnabled()) {
        await syncIntakeReminders(plans);
      }

      onDone();
    },
    [queryClient, onDone],
  );

  const create = useMutation({
    mutationFn: (body: CreateIntakePlanBody) => api.intake.create(body),
    onSuccess: () => finishSave(remindMe),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateIntakePlanBody }) => api.intake.update(id, body),
    onSuccess: () => finishSave(false),
  });

  const saving = create.isPending || update.isPending;
  const saveError: unknown = update.isError ? update.error : create.isError ? create.error : null;

  const submit = () => {
    const cleanTitle = title.trim();
    const cleanNote = note.trim();
    const next: FormErrors = {};

    // при правке название обязательно всегда: PATCH с пустым title сервер отвергает
    if (cleanTitle.length === 0 && (isEditing || !productId)) next.title = "Введите название курса";
    if (cleanTitle.length > TITLE_MAX) next.title = `Не длиннее ${TITLE_MAX} символов`;
    if (sortedTimes.length === 0) next.times = "Добавьте хотя бы одно время приёма";
    if (cleanNote.length > NOTE_MAX) next.note = `Не длиннее ${NOTE_MAX} символов`;

    let durationDays: number | undefined;
    if (customMode) {
      const parsed = Number(customDuration.replace(/\D/g, ""));
      if (!Number.isInteger(parsed) || parsed < DURATION_MIN || parsed > DURATION_MAX) {
        next.duration = `Укажите от ${DURATION_MIN} до ${DURATION_MAX} дней`;
      } else {
        durationDays = parsed;
      }
    } else if (duration !== null) {
      durationDays = duration;
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (plan) {
      update.mutate({
        id: plan.id,
        body: {
          title: cleanTitle,
          times: sortedTimes,
          // явный null — иначе «Бессрочно» не отличить от «поле не меняли»
          durationDays: durationDays ?? null,
          // пустая строка очищает заметку на сервере
          note: cleanNote,
        },
      });
      return;
    }

    create.mutate({
      ...(productId ? { productId } : {}),
      // без title сервер подставит название товара — но только если товар найден
      ...(cleanTitle ? { title: cleanTitle } : {}),
      times: sortedTimes,
      ...(durationDays !== undefined ? { durationDays } : {}),
      ...(cleanNote ? { note: cleanNote } : {}),
    });
  };

  return (
    <>
      <Screen
        scroll
        footer={
          <GlassSurface style={styles.glass}>
            <Button
              title={isEditing ? "Сохранить" : "Создать курс"}
              size="lg"
              fullWidth
              leftIcon="checkmark"
              loading={saving}
              onPress={submit}
            />
          </GlassSurface>
        }
      >
        {productId ? (
          <Card tone="brand" padded={spacing.md} style={styles.block}>
            <View style={styles.productRow}>
              <SymbolView name="pills.fill" size={17} tintColor={colors.brand} />
              <AppText variant="footnote" color="brand" style={styles.productText}>
                {isEditing
                  ? "Курс связан с товаром из каталога — связь сохранится, менять можно всё остальное."
                  : "Курс связан с товаром из каталога — название подставим из его карточки."}
              </AppText>
            </View>
          </Card>
        ) : null}

        <Input
          label="Название курса"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
          hint={productId && !isEditing ? "Можно оставить пустым — подставим название товара" : undefined}
          placeholder="Например, Витамин D3"
          maxLength={TITLE_MAX}
          returnKeyType="done"
          containerStyle={styles.block}
        />

        <View style={styles.section}>
          <AppText variant="headline">Время приёма</AppText>
          <AppText variant="footnote" color="muted">
            {isEditing
              ? "Новые времена заменят старые, а уже поставленные отметки останутся."
              : "Напоминание придёт в каждое из указанных времён."}
          </AppText>
        </View>

        <TimeList
          times={sortedTimes}
          addDisabled={sortedTimes.length >= TIMES_MAX}
          onAdd={() => setPicker({ open: true, editing: null, initial: "09:00" })}
          onEdit={(time) => setPicker({ open: true, editing: time, initial: time })}
          onRemove={(time) => applyTimes(sortedTimes.filter((item) => item !== time))}
        />

        {errors.times ? (
          <AppText variant="footnote" color="danger" style={styles.error} accessibilityLiveRegion="polite">
            {errors.times}
          </AppText>
        ) : null}

        <View style={styles.chips}>
          {QUICK_TIMES.filter((time) => !sortedTimes.includes(time)).map((time) => (
            <Chip key={time} label={`+ ${time}`} onPress={() => addTime(time)} />
          ))}
        </View>

        <View style={styles.section}>
          <AppText variant="headline">Длительность</AppText>
          <AppText variant="footnote" color="muted">
            {plan
              ? `Курс идёт с ${formatDayLabel(planStartDay(plan))} — длительность считаем от этой даты.`
              : "Курс начнётся сегодня. Мы покажем, сколько дней осталось."}
          </AppText>
        </View>

        <View style={styles.chips}>
          {DURATIONS.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              selected={!customMode && duration === item.value}
              onPress={() => {
                setCustomMode(false);
                setDuration(item.value);
                setErrors((prev) => ({ ...prev, duration: undefined }));
              }}
            />
          ))}
          <Chip
            label="Другое"
            selected={customMode}
            onPress={() => {
              setCustomMode(true);
              setErrors((prev) => ({ ...prev, duration: undefined }));
            }}
          />
        </View>

        {customMode ? (
          <Input
            label="Сколько дней"
            value={customDuration}
            onChangeText={(value) => {
              setCustomDuration(value.replace(/\D/g, "").slice(0, 4));
              setErrors((prev) => ({ ...prev, duration: undefined }));
            }}
            error={errors.duration}
            hint={`От ${DURATION_MIN} до ${DURATION_MAX} дней`}
            keyboardType="number-pad"
            placeholder="45"
            containerStyle={styles.block}
          />
        ) : null}

        <Input
          label="Заметка"
          value={note}
          onChangeText={(value) => {
            setNote(value);
            setErrors((prev) => ({ ...prev, note: undefined }));
          }}
          error={errors.note}
          hint={
            note.length > NOTE_MAX - 200
              ? `Осталось ${NOTE_MAX - note.length} ${plural(NOTE_MAX - note.length, "символ", "символа", "символов")}`
              : "Например, «после еды» или «запивать водой»"
          }
          placeholder="После еды"
          multiline
          maxLength={NOTE_MAX}
          inputStyle={styles.noteInput}
          containerStyle={styles.blockLarge}
        />

        {/* при правке разрешение уже спрашивали, а общий тумблер напоминаний живёт на трекере */}
        {isEditing ? null : (
          <Card padded={spacing.base} style={styles.block}>
            <View style={styles.remindRow}>
              <View style={[styles.remindIcon, { backgroundColor: colors.brandSoft }]}>
                <SymbolView name="bell.badge.fill" size={17} tintColor={colors.brand} />
              </View>
              <View style={styles.remindText}>
                <AppText variant="headline">Напоминать о приёме</AppText>
                <AppText variant="footnote" color="muted">
                  Разрешение на уведомления спросим сразу после создания курса.
                </AppText>
              </View>
              <Switch
                value={remindMe}
                onValueChange={(value) => {
                  void Haptics.selectionAsync();
                  setRemindMe(value);
                }}
                trackColor={{ true: colors.brand, false: colors.surfaceSunken }}
                accessibilityLabel="Напоминать о приёме"
              />
            </View>
          </Card>
        )}

        {saveError ? (
          <AppText variant="subhead" color="danger" style={styles.blockLarge} accessibilityRole="alert">
            {errorMessage(saveError)}
          </AppText>
        ) : null}

        <BadDisclaimer variant="compact" style={styles.blockLarge} />
      </Screen>

      <TimePickerSheet
        visible={picker.open}
        initial={picker.initial}
        title={picker.editing ? "Изменить время" : "Время приёма"}
        onCancel={() => setPicker((prev) => ({ ...prev, open: false }))}
        onSubmit={(time) => {
          const rest = picker.editing ? sortedTimes.filter((item) => item !== picker.editing) : sortedTimes;
          applyTimes([...rest, time]);
          setPicker((prev) => ({ ...prev, open: false }));
          void Haptics.selectionAsync();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.base },
  blockLarge: { marginTop: spacing.xl },
  section: { marginTop: spacing.xl, marginBottom: spacing.md, gap: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  error: { marginTop: spacing.sm },
  noteInput: { minHeight: 76, textAlignVertical: "top" },
  productRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  productText: { flex: 1 },
  remindRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  remindIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  remindText: { flex: 1, gap: 2 },
  glass: { borderRadius: radii["3xl"], marginHorizontal: spacing.base, padding: spacing.md },
  center: { flex: 1, justifyContent: "center" },
  loading: { gap: spacing.base, marginTop: spacing.base },
});
