import type { TrackerPlan } from '../../../shared/tracker-contract';
import { addCalendarDays, isDueOn } from './calendar';
export interface ReminderOccurrence { day: string; slot: string; at: Date; planIds: string[]; titles: string[] }
/** Finite, exact calendar occurrences. No daily repeat can outlive a course or ignore a gap. */
export function reminderOccurrences(plans: readonly TrackerPlan[], now: Date, today: string, budget: number): ReminderOccurrence[] {
  const result: ReminderOccurrence[] = [];
  for (let n = 0; n <= 366 && result.length < budget; n++) {
    const day = addCalendarDays(today, n); const buckets = new Map<string, TrackerPlan[]>();
    for (const p of plans) if (isDueOn(p, day)) for (const slot of p.times) {
      const bucket = buckets.get(slot) ?? []; bucket.push(p); buckets.set(slot, bucket);
    }
    for (const [slot, due] of [...buckets].sort(([a], [b]) => a.localeCompare(b))) {
      const [y, m, d] = day.split('-').map(Number); const [hour, minute] = slot.split(':').map(Number);
      const at = new Date(y, m - 1, d, hour, minute);
      if (at <= now) continue;
      result.push({ day, slot, at, planIds: due.map(p => p.id), titles: due.map(p => p.title) });
      if (result.length >= budget) break;
    }
  }
  return result;
}
