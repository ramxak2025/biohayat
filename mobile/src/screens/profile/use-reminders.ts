import { useTracker } from "@/tracker/provider";
import { useIntakeReminders as useTrackerReminders } from "@/components/tracker/use-reminders";
/** Profile and tracker operate the same owner-scoped native reminder setting. */
export function useIntakeReminders() {
  const tracker = useTracker();
  const reminders = useTrackerReminders(tracker.plans, tracker.hydrated && !tracker.storageError);
  return { enabled: reminders.enabled, ready: tracker.hydrated && reminders.ready && !reminders.busy, setEnabled: reminders.toggle, error: reminders.error };
}
