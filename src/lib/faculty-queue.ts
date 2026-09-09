/**
 * The faculty action queue, as one priority order.
 *
 * A supervisor's obligations arrive from three different tables — a
 * supervision request they have not answered, a milestone waiting on their
 * sign-off, and a finished project owed a closing note. The queue's whole
 * point is that these are one list sorted by how soon each is due, not three
 * lists a supervisor has to reconcile themselves.
 *
 * These are view models rather than the prototype's fixture types: every field
 * here is something the database can actually answer, so nothing on screen is
 * derived from a roster that had to be invented to satisfy a type.
 */

export interface FacultyQueueItemBase {
  applicationPublicId: string;
  challengeTitle: string;
  /** Days until due. Negative is overdue, and sorts to the top. */
  daysLeft: number;
  teamName: string;
}

export interface InviteQueueItem extends FacultyQueueItemBase {
  colleges: string[];
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  kind: "invite";
  requestId: string;
  teamSize: number;
}

export interface MilestoneQueueItem extends FacultyQueueItemBase {
  /** False once this supervisor has signed off — the row then shows the wait on the partner. */
  actionNeeded: boolean;
  deliverable: string;
  dueDate: string | null;
  kind: "milestone";
  milestoneId: string;
  milestoneTitle: string;
  partnerApproved: boolean;
}

export interface FeedbackQueueItem extends FacultyQueueItemBase {
  kind: "feedback";
}

export type FacultyQueueItem =
  | FeedbackQueueItem
  | InviteQueueItem
  | MilestoneQueueItem;

/** A supervised team with nothing outstanding — otherwise unreachable. */
export interface SettledSupervision {
  applicationPublicId: string;
  challengeTitle: string;
  teamName: string;
}

export interface FacultyLoad {
  name: string;
  slotsTotal: number;
  slotsUsed: number;
}
