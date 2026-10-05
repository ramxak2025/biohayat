/** Составные части трекера приёма БАД. Экраны импортируют только отсюда. */
export { DayRing, type DayRingProps } from "./day-ring";
export { AnimatedCount, type AnimatedCountProps } from "./animated-count";
export { DaySummary, type DaySummaryProps } from "./day-summary";
export { WeekStrip, type WeekStripProps } from "./week-strip";
export { SlotChip, type SlotChipProps } from "./slot-chip";
export { PlanCard, type PlanCardProps } from "./plan-card";
export { RemindersCard, type RemindersCardProps } from "./reminders-card";
export { AuthInvite, type AuthInviteProps } from "./auth-invite";
export { TrackerSkeleton } from "./tracker-skeleton";
export { TimeList, type TimeListProps } from "./time-list";
export { useIntakeReminders, type RemindersState } from "./use-reminders";
export * from "./plan-utils";

/**
 * TimePickerSheet намеренно НЕ в бочке: он тянет нативный SwiftUI-модуль
 * (@expo/ui). Если модуль не попал в сборку, падать должен только экран
 * создания курса, а не весь трекер. Импортировать так:
 *   import { TimePickerSheet } from "@/components/tracker/time-picker-sheet";
 */
