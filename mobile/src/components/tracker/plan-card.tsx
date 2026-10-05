import { ActionSheetIOS, Alert, Platform, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";

import type { IntakePlan } from "@/api/types";
import { AppText, Badge, Button, Card, IconButton } from "@/components/ui";
import { plural } from "@/lib/format";
import { Duration, Ease, radii, spacing, staggerDelay, useColors, useTheme } from "@/theme";

import { SlotChip } from "./slot-chip";
import {
  dayTitle,
  isValidSlot,
  planDayNumber,
  planDayState,
  planDaysLeft,
  planStartDay,
  sortSlots,
} from "./plan-utils";

export interface PlanCardProps {
  plan: IntakePlan;
  /** День, который сейчас выбран в недельной полосе. */
  day: string;
  today: string;
  isTaken: (slot: string) => boolean;
  isPending: (slot: string) => boolean;
  onToggle: (plan: IntakePlan, slot: string) => void;
  onTogglePause: (plan: IntakePlan) => void;
  onDelete: (plan: IntakePlan) => void;
  /** Идёт мутация самого курса (пауза/удаление) — блокируем действия. */
  busy?: boolean;
  index?: number;
}

export function PlanCard({
  plan,
  day,
  today,
  isTaken,
  isPending,
  onToggle,
  onTogglePause,
  onDelete,
  busy = false,
  index = 0,
}: PlanCardProps) {
  const router = useRouter();
  const colors = useColors();
  const theme = useTheme();
  const reduced = useReducedMotion();

  const state = planDayState(plan, day);
  const slots = sortSlots(plan.times);
  const invalidSlots = plan.times.filter((time) => !isValidSlot(time));
  const daysLeft = planDaysLeft(plan, today);
  const dayNumber = planDayNumber(plan, day);

  // правку карточка открывает сама: экран трекера о ней ничего не знает,
  // и лишний проп через список курсов тянуть незачем
  const openEdit = () => {
    router.push({ pathname: "/tracker/new", params: { planId: plan.id } });
  };

  const openMenu = () => {
    const pauseLabel = plan.isActive ? "Поставить на паузу" : "Возобновить курс";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: plan.title,
          options: ["Изменить курс", pauseLabel, "Удалить курс", "Отмена"],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
          userInterfaceStyle: theme.dark ? "dark" : "light",
        },
        (selected) => {
          if (selected === 0) openEdit();
          if (selected === 1) onTogglePause(plan);
          if (selected === 2) onDelete(plan);
        },
      );
      return;
    }
    Alert.alert(plan.title, undefined, [
      { text: "Изменить курс", onPress: openEdit },
      { text: pauseLabel, onPress: () => onTogglePause(plan) },
      { text: "Удалить курс", style: "destructive", onPress: () => onDelete(plan) },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.duration(Duration.reveal).easing(Ease.power3Out).delay(staggerDelay(index))
      }
      // курсы пересортировываются при смене дня (сначала «сегодня активные»),
      // а удаление убирает карточку из середины списка — без layout-перехода
      // соседи телепортируются на новое место
      layout={reduced ? undefined : LinearTransition.duration(Duration.base).easing(Ease.power2InOut)}
      exiting={reduced ? undefined : FadeOut.duration(Duration.fast).easing(Ease.power2In)}
    >
      <Card padded={spacing.base} style={busy ? styles.busy : undefined}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}>
            <SymbolView
              name={plan.productId ? "pills.fill" : "checkmark.seal.fill"}
              size={17}
              tintColor={colors.brand}
            />
          </View>

          <View style={styles.headerText}>
            <AppText variant="headline" numberOfLines={2}>
              {plan.title}
            </AppText>
            <AppText variant="footnote" color="faint" numberOfLines={1}>
              {slots.length > 0
                ? `${slots.length} ${plural(slots.length, "приём", "приёма", "приёмов")} в день`
                : "Время приёма не задано"}
            </AppText>
          </View>

          <IconButton
            name="ellipsis"
            label="Действия с курсом"
            size={18}
            variant="soft"
            disabled={busy}
            onPress={openMenu}
          />
        </View>

        <View style={styles.badges}>
          {state === "paused" ? (
            <Badge label="На паузе" tone="neutral" size="sm" icon="pause.fill" />
          ) : null}
          {state === "finished" ? <Badge label="Курс завершён" tone="success" size="sm" /> : null}
          {state === "upcoming" ? (
            <Badge label={`Старт ${dayTitle(planStartDay(plan), today)}`} tone="accent" size="sm" />
          ) : null}
          {state === "running" && daysLeft !== null ? (
            <Badge
              label={`День ${dayNumber} из ${plan.durationDays}`}
              tone="brand"
              size="sm"
              icon="calendar"
            />
          ) : null}
          {state === "running" && daysLeft === null ? (
            <Badge label="Бессрочный курс" tone="neutral" size="sm" icon="infinity" />
          ) : null}
          {state === "running" && daysLeft !== null && daysLeft <= 7 ? (
            <Badge
              label={`Осталось ${daysLeft} ${plural(daysLeft, "день", "дня", "дней")}`}
              tone="accent"
              size="sm"
            />
          ) : null}
        </View>

        {state === "running" && slots.length > 0 ? (
          <View style={styles.slots}>
            {slots.map((slot) => (
              <SlotChip
                key={slot}
                time={slot}
                taken={isTaken(slot)}
                pending={isPending(slot)}
                disabled={busy}
                onPress={() => onToggle(plan, slot)}
              />
            ))}
          </View>
        ) : null}

        {state === "paused" ? (
          <View style={styles.inactive}>
            <AppText variant="subhead" color="muted">
              Отметки и напоминания приостановлены. Возобновите курс, когда вернётесь к приёму.
            </AppText>
            <Button
              title="Возобновить"
              variant="secondary"
              size="sm"
              leftIcon="play.fill"
              loading={busy}
              // хаптику даёт общий обработчик паузы — здесь она была бы двойной
              haptic="none"
              onPress={() => onTogglePause(plan)}
            />
          </View>
        ) : null}

        {state === "finished" ? (
          <AppText variant="subhead" color="muted" style={styles.inactiveText}>
            Курс закончился. История отметок сохранена — удалите курс, если он больше не нужен.
          </AppText>
        ) : null}

        {state === "upcoming" ? (
          <AppText variant="subhead" color="muted" style={styles.inactiveText}>
            Курс ещё не начался: отмечать приёмы можно с {dayTitle(planStartDay(plan), today).toLowerCase()}.
          </AppText>
        ) : null}

        {invalidSlots.length > 0 ? (
          <AppText variant="footnote" color="warning" style={styles.inactiveText}>
            Время «{invalidSlots.join(", ")}» задано в неизвестном формате — отметить его нельзя.
          </AppText>
        ) : null}

        {plan.note ? (
          <View style={[styles.note, { backgroundColor: colors.surfaceSoft }]}>
            <SymbolView name="text.quote" size={13} tintColor={colors.textFaint} />
            <AppText variant="footnote" color="muted" style={styles.noteText}>
              {plan.note}
            </AppText>
          </View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  busy: { opacity: 0.6 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.md },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  inactive: { marginTop: spacing.md, gap: spacing.md, alignItems: "flex-start" },
  inactiveText: { marginTop: spacing.md },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  noteText: { flex: 1 },
});
