/**
 * Display labels for database enums.
 *
 * These are explicit maps, not a mechanical transform, because the product's
 * vocabulary is not a case-transform of the enum. A milestone that is `PENDING`
 * reads as "Not started"; one that is `COMPLETED` reads as "Approved" — the
 * approval is the thing a student cares about, not the row state.
 *
 * Follows the existing label-map pattern (`STAGE_LABELS` in `./types`,
 * `PIPELINE_LABELS` in `./provider`, `HUB_GROUP_LABELS` in `./workspace`).
 */

export const APPLICATION_STATUS_LABELS = {
  SUBMITTED: "Submitted",
  SHORTLISTED: "Shortlisted",
  ASSESSMENT: "Assessment",
  SELECTION_PENDING: "Awaiting decision",
  SELECTED: "Selected",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
} as const;

export const OFFER_STATUS_LABELS = {
  PENDING: "Awaiting your response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELLED: "Withdrawn by partner",
} as const;

export const PROJECT_STATUS_LABELS = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  FINAL_REVIEW: "Final review",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
} as const;

export const MILESTONE_STATUS_LABELS = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  REVISION_REQUESTED: "Revision requested",
  COMPLETED: "Approved",
} as const;

export const MILESTONE_REVIEW_DECISION_LABELS = {
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision requested",
} as const;

export const MILESTONE_REVIEW_ROLE_LABELS = {
  FACULTY: "Faculty",
  PARTNER: "Partner",
  MANAGING_ORGANIZATION: "Managing unit",
} as const;

export const ORGANIZATION_ROLE_LABELS = {
  ADMIN: "Administrator",
  PROJECT_MANAGER: "Project manager",
  CONTACT_PERSON: "Partner contact",
  REVIEWER: "Reviewer",
  MEMBER: "Team member",
} as const;

export const MEETING_KIND_LABELS = {
  KICKOFF: "Kickoff",
  WEEKLY_SYNC: "Weekly sync",
  SUPERVISOR_ONE_ON_ONE: "Supervisor 1:1",
  MILESTONE_REVIEW: "Milestone review",
  FINAL_PRESENTATION: "Final presentation",
} as const;

export const RESOURCE_SENSITIVITY_LABELS = {
  PUBLIC: "Public",
  TEAM_ONLY: "Team only",
  CONFIDENTIAL: "Confidential",
  RESTRICTED: "Restricted",
} as const;

export const DELIVERABLE_TYPE_LABELS = {
  FILE: "File",
  LINK: "Link",
  TEXT: "Text",
  OTHER: "Other",
} as const;

/**
 * Last resort for a value with no entry above — a new enum member that reached
 * the UI before its label did. Note `replaceAll`: `SELECTION_PENDING` has two
 * underscores, and `.replace` would leave the second one in place.
 */
export function titleCaseEnum(value: string): string {
  const spaced = value.replaceAll("_", " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function lookup<T extends Record<string, string>>(
  labels: T,
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  return labels[value as keyof T] ?? titleCaseEnum(value);
}

export const applicationStatusLabel = (v?: string | null, fallback = "—") =>
  lookup(APPLICATION_STATUS_LABELS, v, fallback);

export const offerStatusLabel = (v?: string | null, fallback = "—") =>
  lookup(OFFER_STATUS_LABELS, v, fallback);

export const projectStatusLabel = (v?: string | null, fallback = "—") =>
  lookup(PROJECT_STATUS_LABELS, v, fallback);

export const milestoneStatusLabel = (v?: string | null, fallback = "—") =>
  lookup(MILESTONE_STATUS_LABELS, v, fallback);

export const milestoneReviewDecisionLabel = (
  v?: string | null,
  fallback = "pending"
) => lookup(MILESTONE_REVIEW_DECISION_LABELS, v, fallback);

export const milestoneReviewRoleLabel = (v?: string | null, fallback = "—") =>
  lookup(MILESTONE_REVIEW_ROLE_LABELS, v, fallback);

export const organizationRoleLabel = (v?: string | null, fallback = "—") =>
  lookup(ORGANIZATION_ROLE_LABELS, v, fallback);

export const meetingKindLabel = (v?: string | null, fallback = "Meeting") =>
  lookup(MEETING_KIND_LABELS, v, fallback);

export const resourceSensitivityLabel = (v?: string | null, fallback = "—") =>
  lookup(RESOURCE_SENSITIVITY_LABELS, v, fallback);

export const deliverableTypeLabel = (v?: string | null, fallback = "Resource") =>
  lookup(DELIVERABLE_TYPE_LABELS, v, fallback);
