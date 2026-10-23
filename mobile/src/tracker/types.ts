import type { IntakeLogRow } from "@/api/types";
import type { TrackerPlan, TrackerPlanInput, TrackerRange } from "../../../shared/tracker-contract";
export type { TrackerPlan, TrackerPlanInput, TrackerRange } from "../../../shared/tracker-contract";
export type TrackerSyncState = "local" | "synced" | "queued" | "syncing" | "conflict";
export interface TrackerConflict { id: string; planId: string; title: string; message: string; deletedRemotely: boolean }
export interface TrackerController {
  partitionKey: string;
  access: "guest" | "account";
  hydrated: boolean;
  plansKnown: boolean;
  storageError: string | null;
  syncError: string | null;
  plans: TrackerPlan[];
  /** Actual positive records; includes times removed by later schedule edits. */
  logs: IntakeLogRow[];
  ranges: TrackerRange[];
  pendingCount: number;
  syncing: boolean;
  online: boolean;
  lastSyncedAt: string | null;
  conflicts: TrackerConflict[];
  guestPlanCount: number;
  isDayKnown: (day: string) => boolean;
  planSyncState: (planId: string) => TrackerSyncState;
  /** Resolve only after durable local write. Network/reminder failures do not reject a successful save. */
  savePlan: (body: TrackerPlanInput, planId?: string, expectedRevision?: number) => Promise<string>;
  setActive: (planId: string, active: boolean) => Promise<void>;
  removePlan: (planId: string) => Promise<void>;
  setTaken: (planId: string, day: string, slot: string, taken: boolean) => Promise<void>;
  sync: () => Promise<void>;
  reload: () => Promise<void>;
  /** Explicit local choice; deleted plans are copied to a NEW ID, never resurrected. */
  resolveConflict: (id: string, choice: "server" | "local") => Promise<void>;
  importGuest: () => Promise<void>;
}
