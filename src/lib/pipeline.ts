import { TODAY } from "@/lib/dates";
import { STAGE_ORDER, type Application, type ApplicationStage } from "@/lib/types";

/**
 * Derivations over the pipeline state. Everything here is shared by the
 * assessment, offer and workspace screens — it lives in one place so the three
 * cannot drift on what a stage means.
 */

export type StageVariant =
  | "default"
  | "accent"
  | "warn"
  | "ok"
  | "outline-dashed";

/**
 * Chip treatment per stage. `warn` is reserved for stages where the student
 * personally owes an action — it is the colour that means "you", not "urgent".
 */
export const STAGE_VARIANT: Record<ApplicationStage, StageVariant> = {
  APPLIED: "default",
  SHORTLISTED: "accent",
  TEST_PENDING: "warn",
  TEST_SUBMITTED: "default",
  INTERVIEW_SCHEDULING: "warn",
  INTERVIEW_SCHEDULED: "default",
  INVITED: "warn",
  ACTIVE: "ok",
  IN_REVIEW: "accent",
  COMPLETED: "ok",
  NOT_SELECTED: "outline-dashed",
  WITHDRAWN: "outline-dashed",
  EXPIRED: "outline-dashed",
};

export const TERMINAL_STAGES: ApplicationStage[] = [
  "COMPLETED",
  "NOT_SELECTED",
  "WITHDRAWN",
  "EXPIRED",
];

export function isTerminal(stage: ApplicationStage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

/**
 * The earned-disclosure switch (PRD §5, §10). T3 content — full brief,
 * datasets, poster contact — is visible only from ACTIVE onward. Every
 * workspace surface gates on this; it is the product's core invariant.
 */
export function isRevealed(application: Application): boolean {
  return (
    application.stage === "ACTIVE" ||
    application.stage === "IN_REVIEW" ||
    application.stage === "COMPLETED"
  );
}

export function stageIndex(stage: ApplicationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * How far along the six-node selection timeline this stage sits. Terminal
 * states other than COMPLETED return -1 — the timeline stops rather than
 * pretending the pipeline finished.
 */
export function timelineIndex(stage: ApplicationStage): number {
  switch (stage) {
    case "APPLIED":
      return 0;
    case "SHORTLISTED":
      return 1;
    case "TEST_PENDING":
    case "TEST_SUBMITTED":
      return 2;
    case "INTERVIEW_SCHEDULING":
    case "INTERVIEW_SCHEDULED":
      return 3;
    case "INVITED":
      return 4;
    case "ACTIVE":
    case "IN_REVIEW":
    case "COMPLETED":
      return 5;
    default:
      return -1;
  }
}

const MS_PER_HOUR = 3_600_000;

/**
 * Hours between the pinned TODAY and an ISO datetime. Negative once elapsed.
 * Derived from the pin rather than wall-clock so the seeded 72-hour offer
 * window keeps demonstrating the countdown.
 */
export function hoursUntil(isoDateTime: string): number {
  const target = new Date(isoDateTime);
  return Math.round((target.getTime() - TODAY.getTime()) / MS_PER_HOUR);
}

/** "2 days 4 hrs" / "18 hrs" / "Expired". */
export function countdownLabel(isoDateTime: string): string {
  const hours = hoursUntil(isoDateTime);
  if (hours <= 0) return "Expired";
  if (hours < 24) return plural(hours, "hr");
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0
    ? plural(days, "day")
    : `${plural(days, "day")} ${plural(rest, "hr")}`;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Days a student has been sitting in the current stage. */
export function daysInStage(application: Application): number {
  const entered = new Date(`${application.stageEnteredAt}T00:00:00Z`);
  return Math.round((TODAY.getTime() - entered.getTime()) / 86_400_000);
}
