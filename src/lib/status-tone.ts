import type { ChipVariant } from "@/components/ui/chip";
import { campusDaysUntil, effectiveApplicationDeadline } from "@/lib/dates";

/**
 * One place that decides how every database status looks.
 *
 * Colour meaning, used consistently across all roles:
 *   live (solid green)  open or running right now
 *   ok (green)          approved / accepted / done
 *   warn (amber)        waiting on someone — an action is owed
 *   accent (blue)       in progress or under review
 *   revise (pink)       needs rework
 *   danger (red)        negative outcome (rejected, declined, cancelled)
 *   draft (ivory)       not submitted yet
 *   neutral (grey)      closed, withdrawn, expired or archived
 */
export type StatusKind =
  | "challenge"
  | "review"
  | "application"
  | "offer"
  | "project"
  | "supervision"
  | "attempt"
  | "milestone"
  | "access";

export interface StatusTone {
  label: string;
  variant: ChipVariant;
}

const T = (label: string, variant: ChipVariant): StatusTone => ({ label, variant });

const TONES: Record<StatusKind, Record<string, StatusTone>> = {
  challenge: {
    DRAFT: T("Draft", "draft"),
    SUBMITTED: T("Submitted for review", "accent"),
    UNDER_REVIEW: T("Under review", "accent"),
    AWAITING_FACULTY: T("Awaiting faculty", "warn"),
    FACULTY_REVIEW: T("Faculty review", "accent"),
    REVISION_REQUESTED: T("Revision requested", "revise"),
    APPROVED: T("Approved", "ok"),
    PUBLISHED: T("Published", "ok"),
    APPLICATIONS_OPEN: T("Applications open", "live"),
    APPLICATIONS_CLOSED: T("Applications closed", "neutral"),
    MATCHING: T("Matching", "accent"),
    SHORTLISTING: T("Shortlisting", "accent"),
    ASSESSMENT: T("Assessment", "accent"),
    SELECTION_PENDING: T("Selection pending", "warn"),
    SELECTED: T("Team selected", "ok"),
    ACTIVE: T("Active", "live"),
    FINAL_REVIEW: T("Final review", "accent"),
    COMPLETED: T("Completed", "ok"),
    ARCHIVED: T("Archived", "neutral"),
    CANCELLED: T("Cancelled", "danger"),
  },
  review: {
    APPROVED: T("Approved", "ok"),
    REVISION_REQUESTED: T("Revision requested", "revise"),
    REJECTED: T("Rejected", "danger"),
  },
  application: {
    SUBMITTED: T("Submitted", "accent"),
    SHORTLISTED: T("Shortlisted", "accent"),
    ASSESSMENT: T("Assessment", "warn"),
    SELECTION_PENDING: T("Awaiting decision", "warn"),
    SELECTED: T("Selected", "ok"),
    REJECTED: T("Not selected", "danger"),
    WITHDRAWN: T("Withdrawn", "neutral"),
  },
  offer: {
    PENDING: T("Awaiting response", "warn"),
    ACCEPTED: T("Accepted", "ok"),
    DECLINED: T("Declined", "danger"),
    CANCELLED: T("Withdrawn by partner", "neutral"),
    EXPIRED: T("Expired", "neutral"),
  },
  project: {
    ACTIVE: T("Active", "live"),
    PAUSED: T("Paused", "warn"),
    FINAL_REVIEW: T("Final review", "accent"),
    COMPLETED: T("Completed", "ok"),
    ARCHIVED: T("Archived", "neutral"),
  },
  supervision: {
    PENDING: T("Pending", "warn"),
    ACCEPTED: T("Accepted", "ok"),
    DECLINED: T("Declined", "danger"),
    CANCELLED: T("Cancelled", "neutral"),
    EXPIRED: T("Expired", "neutral"),
  },
  attempt: {
    NOT_STARTED: T("Not started", "neutral"),
    IN_PROGRESS: T("In progress", "accent"),
    SUBMITTED: T("Awaiting review", "warn"),
    REVIEWED: T("Reviewed", "ok"),
  },
  milestone: {
    PENDING: T("Not started", "neutral"),
    IN_PROGRESS: T("In progress", "accent"),
    SUBMITTED: T("Submitted", "warn"),
    REVISION_REQUESTED: T("Revision requested", "revise"),
    COMPLETED: T("Approved", "ok"),
  },
  access: {
    EFFECTIVE: T("Effective", "ok"),
    APPLICATION_SUBMITTED: T("Applied", "ok"),
    EXPIRED: T("Expired", "neutral"),
    REVOKED: T("Revoked", "danger"),
  },
};

export function statusTone(kind: StatusKind, status: string | null | undefined): StatusTone {
  const key = (status ?? "").toUpperCase().replaceAll(" ", "_");
  const found = TONES[kind][key];
  if (found) return found;
  const raw = key ? key.replaceAll("_", " ").toLowerCase() : "—";
  return T(raw.charAt(0).toUpperCase() + raw.slice(1), "default");
}

/** Display-only states that are derived rather than stored. */
export const DERIVED_TONES = {
  applicationsClosed: TONES.challenge.APPLICATIONS_CLOSED,
  offerExpired: TONES.offer.EXPIRED,
  supervisionExpired: TONES.supervision.EXPIRED,
} as const;

/**
 * A challenge's tone, accounting for the derived "applications closed" state:
 * an open challenge whose deadline (end of its campus date) has passed reads as
 * closed even though its stored status is still APPLICATIONS_OPEN.
 */
export function challengeTone(
  challenge: { status: string; applicationDeadline: Date | null },
  now: Date = new Date()
): StatusTone {
  if (
    challenge.status === "APPLICATIONS_OPEN" &&
    challenge.applicationDeadline &&
    now > effectiveApplicationDeadline(challenge.applicationDeadline)
  ) {
    return TONES.challenge.APPLICATIONS_CLOSED;
  }
  return statusTone("challenge", challenge.status);
}

/**
 * How urgent an application deadline (campus date, `YYYY-MM-DD`) looks:
 * closed = grey, today/tomorrow = red, within a week = amber, otherwise plain.
 */
export function deadlineVariant(campusDate: string): ChipVariant | null {
  const days = campusDaysUntil(campusDate);
  if (days < 0) return "neutral";
  if (days <= 1) return "danger";
  if (days <= 7) return "warn";
  return null;
}
