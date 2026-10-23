import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTracker } from "@/tracker/provider";
import { useTrackerClock } from "@/tracker/clock";
import type { TrackerController } from "@/tracker/types";
import { PlanForm } from "@/components/tracker/plan-form";
import { TrackerState } from "@/components/tracker/tracker-state";
import { TrackerSkeleton } from "@/components/tracker/tracker-skeleton";
import { AppText, Button, Screen } from "@/components/ui";
import { spacing } from "@/theme";

export function TrackerNewScreen() {
  const tracker: TrackerController & { partitionKey: string } = useTracker();
  const { today } = useTrackerClock();
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; productId?: string; title?: string }>();
  const planId = typeof params.planId === "string" ? params.planId : undefined;
  const plan = tracker.plans.find((item) => item.id === planId);
  const done = () => { if (router.canGoBack()) router.back(); else router.replace("/tracker"); };
  const header = <Stack.Screen options={{ title: planId ? "Изменить курс" : "Новый курс", headerLargeTitleEnabled: false }} />;
  if (!tracker.hydrated) return <>{header}<Screen scroll><TrackerState key={tracker.partitionKey} tracker={tracker} />{!tracker.storageError ? <TrackerSkeleton /> : null}</Screen></>;
  if (planId && !plan) return <>{header}<Screen scroll contentContainerStyle={{ gap: spacing.base, paddingTop: spacing.base }}><TrackerState key={tracker.partitionKey} tracker={tracker} /><AppText variant="headline">{tracker.plansKnown ? "Курс не найден" : "Курс пока не загружен"}</AppText><AppText variant="subhead" color="muted">{tracker.plansKnown ? "Вернитесь к списку и проверьте сохранённые курсы." : "Неполный список не означает, что курс удалён."}</AppText><Button title="К списку курсов" variant="secondary" onPress={done} /></Screen></>;
  return <>{header}<PlanForm key={`${tracker.partitionKey}:${planId ?? "new"}`} tracker={tracker} today={today} plan={plan} productId={typeof params.productId === "string" ? params.productId : undefined} initialTitle={typeof params.title === "string" ? params.title : undefined} onDone={done} /></>;
}
