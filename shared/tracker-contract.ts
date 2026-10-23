/** Versioned tracker protocol. Legacy /intake clients must not interpret new schedules as daily. */
export interface TrackerPlanInput {
  productId: string | null;
  title: string;
  anchorDay: string;
  intervalDays: number;
  durationDays: number | null;
  times: string[];
  note: string | null;
  isActive: boolean;
}
export interface TrackerPlan extends TrackerPlanInput {
  id: string;
  startDate: string;
  revision: number;
  scheduleVersion: number;
  /** Compatibility only. Actual history is separate and never inferred from this array. */
  logs: { day: string; slot: string; takenAt: string }[];
}
export interface TrackerCell {
  planId: string; day: string; slot: string; taken: boolean; revision: number; takenAt: string;
}
export interface TrackerRange { from: string; to: string }
export interface TrackerSnapshot {
  protocol: 1;
  complete: true;
  plans: TrackerPlan[];
  cells: TrackerCell[];
  range: TrackerRange;
  serverDay: string;
}
interface OperationBase { operationId: string; planId: string; expectedRevision: number }
export type TrackerOperation =
  | (OperationBase & { action: "create"; body: TrackerPlanInput; initialLogs?: { day: string; slot: string; takenAt: string }[] })
  | (OperationBase & { action: "update"; body: Partial<TrackerPlanInput> })
  | (OperationBase & { action: "delete" })
  | (OperationBase & { action: "log"; body: { day: string; slot: string; taken: boolean } });
export interface TrackerAck {
  operationId: string;
  /** Original acknowledgment revision, even if a later writer has already changed/deleted the entity. */
  acknowledgedRevision: number;
  currentPlan: TrackerPlan | null;
  currentCell: TrackerCell | null;
}
