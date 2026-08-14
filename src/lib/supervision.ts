import { supervisionInvites } from "@/lib/data/supervision-invites";
import { daysUntil } from "@/lib/dates";
import {
  getApplicationsWithChallenge,
  type ApplicationWithChallenge,
} from "@/lib/queries";
import type {
  Application,
  Challenge,
  Milestone,
  SupervisionInvite,
} from "@/lib/types";

/**
 * An application whose nominated supervisor hasn't answered yet. The
 * nomination writes `Application.facultySupervisorId` at apply time, so that
 * field alone cannot distinguish "supervises this" from "has been asked to" —
 * everything below has to exclude the pending ones explicitly, or a team gets
 * a supervisor's queue before the supervisor has agreed to anything.
 */
function hasPendingInvite(applicationId: string): boolean {
  return supervisionInvites.some(
    (invite) =>
      invite.applicationId === applicationId && invite.status === "pending",
  );
}

/** Applications this faculty member has actually agreed to supervise. */
export function getSupervisedRows(facultyId: string): ApplicationWithChallenge[] {
  return getApplicationsWithChallenge().filter(
    ({ application }) =>
      application.facultySupervisorId === facultyId &&
      !hasPendingInvite(application.id),
  );
}

export function getSupervisedRow(
  facultyId: string,
  applicationId: string,
): ApplicationWithChallenge | undefined {
  return getSupervisedRows(facultyId).find(
    ({ application }) => application.id === applicationId,
  );
}

export interface InviteQueueItem {
  kind: "invite";
  invite: SupervisionInvite;
  application: Application;
  challenge: Challenge;
  /** Days until the response deadline — drives queue order and the urgency copy. */
  daysLeft: number;
}

export interface MilestoneQueueItem {
  kind: "milestone";
  milestone: Milestone;
  application: Application;
  challenge: Challenge;
  /** False once this faculty has signed off — the row then shows the wait on the partner. */
  actionNeeded: boolean;
  daysLeft: number;
}

export interface FeedbackQueueItem {
  kind: "feedback";
  application: Application;
  challenge: Challenge;
  /** Negative — days since the project closed, so the oldest sorts first. */
  daysLeft: number;
}

export function getPendingInvites(facultyId: string): InviteQueueItem[] {
  const rows = getApplicationsWithChallenge();
  return supervisionInvites
    .filter((invite) => invite.facultyId === facultyId && invite.status === "pending")
    .map((invite) => {
      const row = rows.find(({ application }) => application.id === invite.applicationId);
      return row
        ? {
            kind: "invite" as const,
            invite,
            application: row.application,
            challenge: row.challenge,
            daysLeft: daysUntil(invite.respondBy),
          }
        : undefined;
    })
    .filter((item): item is InviteQueueItem => item !== undefined);
}

/**
 * Milestones waiting on this faculty member. Only `Submitted` qualifies:
 * `Revision requested` means they already sent it back and the work now sits
 * with the team, so resurfacing it would invite approving a deliverable
 * nobody has resubmitted.
 *
 * Ones this faculty already signed off stay in the list with
 * `actionNeeded: false`, so the queue still shows what is merely waiting on
 * the partner rather than dropping it the moment their own part is done.
 */
export function getMilestoneQueue(facultyId: string): MilestoneQueueItem[] {
  return getSupervisedRows(facultyId).flatMap(({ application, challenge }) =>
    (application.project?.milestones ?? [])
      .filter((m) => m.status === "Submitted")
      .map((milestone) => ({
        kind: "milestone" as const,
        milestone,
        application,
        challenge,
        actionNeeded: !milestone.facultyApproved,
        daysLeft: daysUntil(milestone.dueDate),
      })),
  );
}

export function getFeedbackQueue(facultyId: string): FeedbackQueueItem[] {
  return getSupervisedRows(facultyId)
    .filter(
      ({ application }) =>
        application.stage === "COMPLETED" &&
        application.project?.facultyFeedback == null,
    )
    .map(({ application, challenge }) => ({
      kind: "feedback" as const,
      application,
      challenge,
      daysLeft: daysUntil(application.stageEnteredAt),
    }));
}

/** Teams this faculty supervises that need nothing right now. */
export function getSettledRows(facultyId: string): ApplicationWithChallenge[] {
  const busy = new Set([
    ...getMilestoneQueue(facultyId).map((m) => m.application.id),
    ...getFeedbackQueue(facultyId).map((f) => f.application.id),
  ]);
  return getSupervisedRows(facultyId).filter(({ application }) => !busy.has(application.id));
}
