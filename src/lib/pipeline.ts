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
const MS_PER_MINUTE = 60_000;

/**
 * Hours between the pinned TODAY and an ISO datetime. Negative once elapsed.
 * Derived from the pin rather than wall-clock so the seeded 72-hour offer
 * window keeps demonstrating the countdown.
 */
export function hoursUntil(isoDateTime: string): number {
  const target = new Date(isoDateTime);
  return Math.round((target.getTime() - TODAY.getTime()) / MS_PER_HOUR);
}

/**
 * Minute precision, for the window where hoursUntil has already rounded to
 * zero — "starts in 20 min" needs to survive that.
 */
export function minutesUntil(isoDateTime: string): number {
  const target = new Date(isoDateTime);
  return Math.round((target.getTime() - TODAY.getTime()) / MS_PER_MINUTE);
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

export interface CtaTarget {
  label: string;
  href: string;
}

/**
 * The one thing a student can do next on an application, given its stage.
 * Lives here rather than beside the button that renders it because the
 * workspace hub needs the same stage-to-destination map — two copies would
 * drift the moment a stage moves.
 *
 * Returns null for the stages where the student owes nothing (APPLIED,
 * SHORTLISTED, INTERVIEW_*, WITHDRAWN, EXPIRED). Callers that must always
 * show a button supply their own fallback.
 */
export function ctaFor(application: Application): CtaTarget | null {
  switch (application.stage) {
    case "TEST_PENDING":
      return {
        label: "Start assessment",
        href: `/assessment/${application.id}`,
      };
    case "TEST_SUBMITTED":
      return {
        label: "View your result",
        href: `/assessment/${application.id}/result`,
      };
    case "INVITED":
      return {
        label: application.offer
          ? `Respond · ${countdownLabel(application.offer.respondBy)} left`
          : "Respond to your invitation",
        href: `/offer/${application.id}`,
      };
    case "ACTIVE":
    case "IN_REVIEW":
    case "COMPLETED":
      return {
        label: "Open workspace",
        href: `/workspace/${application.id}`,
      };
    case "NOT_SELECTED":
      return application.testResult
        ? {
            label: "View your result",
            href: `/assessment/${application.id}/result`,
          }
        : null;
    default:
      return null;
  }
}

/** Days a student has been sitting in the current stage. */
export function daysInStage(application: Application): number {
  const entered = new Date(`${application.stageEnteredAt}T00:00:00Z`);
  return Math.round((TODAY.getTime() - entered.getTime()) / 86_400_000);
}

/**
 * The database-backed shape of an application, as the pipeline components need
 * it. Deliberately narrow: the components want a stage, a next action and
 * somewhere to send the student, not a whole application record.
 */
export interface PipelineApplicationView {
  nextAction: string | null;
  nextActionDue: string | null;
  offerRespondBy: string | null;
  publicId: string;
  stage: ApplicationStage;
}

/**
 * The database twin of `ctaFor`. Kept beside it so the two stage-to-destination
 * maps stay visibly in sync; when the mock half is finally deleted this is what
 * remains.
 */
export function ctaForView(view: PipelineApplicationView): CtaTarget | null {
  switch (view.stage) {
    case "TEST_PENDING":
      return { label: "Start assessment", href: `/assessment/${view.publicId}` };
    case "TEST_SUBMITTED":
      return { label: "View status", href: `/assessment/${view.publicId}/result` };
    case "INVITED":
      return {
        label: view.offerRespondBy
          ? `Respond · ${countdownLabel(view.offerRespondBy)} left`
          : "Respond to your invitation",
        href: `/offer/${view.publicId}`,
      };
    case "ACTIVE":
    case "IN_REVIEW":
    case "COMPLETED":
      return { label: "Open workspace", href: `/workspace/${view.publicId}` };
    default:
      return null;
  }
}
