import { Stack, useRouter } from "expo-router";
import { useTracker } from "@/tracker/provider";
import { useTrackerClock } from "@/tracker/clock";
import type { TrackerController } from "@/tracker/types";
import { AppText, Button, Screen } from "@/components/ui";
import { PlanCard } from "@/components/tracker/plan-card";
import { TrackerConflicts, TrackerState } from "@/components/tracker/tracker-state";
import { TrackerSkeleton } from "@/components/tracker/tracker-skeleton";
import { spacing } from "@/theme";

export function TrackerCoursesScreen() {
  const tracker: TrackerController & { partitionKey: string } = useTracker();
  return <CoursesBody key={tracker.partitionKey} tracker={tracker} />;
}
export function CoursesBody({ tracker }: { tracker: TrackerController }) {
  const router = useRouter();
  const { today } = useTrackerClock();
  return <><Stack.Screen options={{ title: "Мои курсы", headerLargeTitleEnabled: false }} />
    <Screen scroll contentContainerStyle={{ gap: spacing.base, paddingTop: spacing.md }}>
      <TrackerState tracker={tracker} />
      {!tracker.hydrated ? (!tracker.storageError ? <TrackerSkeleton /> : null) : <>
        <TrackerConflicts tracker={tracker} />
        {!tracker.plansKnown ? <AppText variant="subhead" color="muted">Список загружен не полностью. Это не означает, что курсов нет.</AppText> : tracker.plans.length === 0 ? <AppText variant="body">Курсов пока нет. Добавьте свой первый курс.</AppText> : null}
        <Button title="Добавить курс" fullWidth onPress={() => router.push("/tracker/new")} disabled={!!tracker.storageError} />
        {[...tracker.plans].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.title.localeCompare(b.title, "ru")).map((plan) => <PlanCard key={plan.id} plan={plan} today={today} syncState={tracker.planSyncState(plan.id)} onEdit={() => router.push({ pathname: "/tracker/new", params: { planId: plan.id } })} onTogglePause={() => tracker.setActive(plan.id, !plan.isActive)} onDelete={() => tracker.removePlan(plan.id)} />)}
      </>}
    </Screen>
  </>;
}
