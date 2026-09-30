import { db } from "@/db";
import {
  countMilestones,
  getCurrentSubmission,
  getProjectWorkContextByApplicationPublicId,
  getProjectWorkContextByMilestoneId,
  hasCloseoutFeedbackFrom,
  insertCloseoutFeedback,
  insertDeliverable,
  insertFinalReview,
  insertMilestone,
  insertMilestoneReview,
  insertSubmissionRound,
  listFinalReviewsForWrite,
  listRoundDecisions,
  lockMilestoneForWork,
  lockProjectForWork,
  transitionMilestone,
  transitionProject,
  type MilestoneMutationDatabase,
  type ProjectWorkContext,
} from "@/db/mutations/milestones";
import { isProjectMember } from "@/db/queries/projects";
import {
  hasOneOfActiveOrganizationRoles,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";
import { isPublicId } from "@/lib/public-id";

/** Who on the partner side may act for the owning organization (existing policy). */
const PARTNER_SIGNOFF_ROLES = ["ADMIN", "CONTACT_PERSON", "PROJECT_MANAGER"] as const;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const BANDS = ["Strong", "Proficient", "Developing", "Below threshold"] as const;
const HOST_AGAIN = ["Yes", "With reservations", "No"] as const;

export type MilestoneReviewErrorCode =
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class MilestoneReviewError extends Error {
  readonly code: MilestoneReviewErrorCode;

  constructor(code: MilestoneReviewErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MilestoneReviewError";
  }
}

export interface MilestoneReviewOptions {
  database?: MilestoneMutationDatabase;
  /** Verification-only fault injection; server actions never pass these. */
  injectFailureAfterReviewInsert?: () => Promise<void> | void;
  injectFailureAfterSubmissionInsert?: () => Promise<void> | void;
  now?: Date;
}

type ReviewRole = "FACULTY" | "PARTNER";
type ReviewDecision = "APPROVED" | "REVISION_REQUESTED";

function isAuthorizedReviewer(actor: AuthenticatedActor, context: ProjectWorkContext, role: ReviewRole) {
  return role === "FACULTY"
    ? Boolean(actor.facultyProfile) && context.facultySupervisorId === actor.user.userId
    : hasOneOfActiveOrganizationRoles(actor, context.ownerOrganizationId, [...PARTNER_SIGNOFF_ROLES]);
}

function notFound(): never {
  // Not yours reads the same as not existing, so no project relationship leaks.
  throw new MilestoneReviewError("NOT_FOUND", "That project work is not available to you.");
}

async function inTransaction<T>(
  options: MilestoneReviewOptions,
  run: (tx: MilestoneMutationDatabase) => Promise<T>
): Promise<T> {
  if (options.database) return run(options.database);
  return db.transaction((tx) => run(tx));
}

// ---------------------------------------------------------------------------
// Milestone creation — approved 2026-09-29: supervisor or owner partner, ACTIVE only.
// ---------------------------------------------------------------------------

export async function createProjectMilestone(
  applicationPublicId: string,
  input: { deadline: string | null; description: string | null; title: string },
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
) {
  if (!isPublicId(applicationPublicId)) notFound();
  const title = input.title.trim();
  if (!title || title.length > 255) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Give the milestone a title (up to 255 characters).");
  }
  if (input.deadline && !DATE_ONLY.test(input.deadline)) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Use a valid due date.");
  }
  const now = options.now ?? new Date();

  return inTransaction(options, async (tx) => {
    const initial = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!initial) notFound();
    if (!isAuthorizedReviewer(actor, initial, "FACULTY") && !isAuthorizedReviewer(actor, initial, "PARTNER")) {
      notFound();
    }
    await lockProjectForWork(tx, initial.projectId);
    const context = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!context) notFound();
    if (context.projectStatus !== "ACTIVE") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "Milestones can only be added while the project is active.");
    }
    return insertMilestone(tx, {
      deadline: input.deadline || null,
      description: input.description?.trim() || null,
      now,
      projectId: context.projectId,
      title,
    });
  });
}

// ---------------------------------------------------------------------------
// Submission — each submission opens a new round.
// ---------------------------------------------------------------------------

export interface MilestoneSubmissionInput {
  deliverableType: "FILE" | "LINK" | "OTHER" | "TEXT";
  description: string | null;
  title: string;
  /** External reference for LINK, or an object-storage/document reference for FILE. */
  url: string | null;
}

export async function submitMilestoneWork(
  milestoneId: bigint,
  input: MilestoneSubmissionInput,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
) {
  if (!actor.studentProfile) notFound();
  const deliverable = normalizeDeliverable(input);
  const now = options.now ?? new Date();

  return inTransaction(options, async (tx) => {
    const initial = await getProjectWorkContextByMilestoneId(tx, milestoneId);
    if (!initial) notFound();
    if (!(await isProjectMember(tx, initial.projectId, actor.user.userId))) notFound();

    await lockProjectForWork(tx, initial.projectId);
    await lockMilestoneForWork(tx, milestoneId);
    const context = await getProjectWorkContextByMilestoneId(tx, milestoneId);
    if (!context) notFound();

    if (context.projectStatus !== "ACTIVE") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "This project is no longer accepting work.");
    }
    if (context.milestoneStatus === "COMPLETED") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "This milestone is already complete.");
    }
    if (context.milestoneStatus === "SUBMITTED") {
      throw new MilestoneReviewError("CONFLICT", "This milestone already has a submission awaiting review.");
    }

    const current = await getCurrentSubmission(tx, milestoneId);
    const round = await insertSubmissionRound(tx, {
      milestoneId,
      now,
      roundNumber: (current?.roundNumber ?? 0) + 1,
      submittedBy: actor.user.userId,
    });
    if (!round) {
      throw new MilestoneReviewError("CONFLICT", "Another submission was recorded at the same time. Refresh and try again.");
    }
    await options.injectFailureAfterSubmissionInsert?.();
    await insertDeliverable(tx, {
      ...deliverable,
      milestoneId,
      now,
      submissionId: round.id,
      submittedBy: actor.user.userId,
    });
    const moved = await transitionMilestone(tx, {
      expected: ["PENDING", "IN_PROGRESS", "REVISION_REQUESTED"],
      milestoneId,
      next: "SUBMITTED",
      now,
    });
    if (!moved) {
      throw new MilestoneReviewError("CONFLICT", "The milestone changed while submitting. Refresh and try again.");
    }
    return { roundNumber: round.roundNumber, submissionId: round.id };
  });
}

function normalizeDeliverable(input: MilestoneSubmissionInput) {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  const url = input.url?.trim() || null;
  if (!title || title.length > 255) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Give the deliverable a title (up to 255 characters).");
  }
  if (!["FILE", "LINK", "OTHER", "TEXT"].includes(input.deliverableType)) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Choose a deliverable type.");
  }
  if ((input.deliverableType === "LINK" || input.deliverableType === "FILE") && !isHttpsUrl(url)) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Provide an https:// link to the work.");
  }
  if ((input.deliverableType === "TEXT" || input.deliverableType === "OTHER") && !description) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Describe the work being submitted.");
  }
  return {
    deliverableType: input.deliverableType,
    description,
    externalUrl: input.deliverableType === "LINK" ? url : null,
    fileUrl: input.deliverableType === "FILE" ? url : null,
    title,
  };
}

function isHttpsUrl(value: string | null) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Milestone review — one decision per side per round; quorum from the current round only.
// ---------------------------------------------------------------------------

export function recordFacultyMilestoneReview(
  milestoneId: bigint,
  submissionId: bigint,
  decision: ReviewDecision,
  comments: string | null,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
) {
  if (!actor.facultyProfile) {
    throw new MilestoneReviewError("FORBIDDEN", "Only a faculty account can sign off as supervisor.");
  }
  return reviewMilestone(milestoneId, submissionId, decision, comments, actor, "FACULTY", options);
}

export function recordPartnerMilestoneReview(
  milestoneId: bigint,
  submissionId: bigint,
  decision: ReviewDecision,
  comments: string | null,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
) {
  return reviewMilestone(milestoneId, submissionId, decision, comments, actor, "PARTNER", options);
}

async function reviewMilestone(
  milestoneId: bigint,
  submissionId: bigint,
  decision: ReviewDecision,
  comments: string | null,
  actor: AuthenticatedActor,
  role: ReviewRole,
  options: MilestoneReviewOptions
) {
  const note = comments?.trim() || null;
  if (decision === "REVISION_REQUESTED" && !note) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Say what needs changing — the team sees this verbatim.");
  }
  const now = options.now ?? new Date();

  return inTransaction(options, async (tx) => {
    const initial = await getProjectWorkContextByMilestoneId(tx, milestoneId);
    if (!initial || !isAuthorizedReviewer(actor, initial, role)) notFound();

    await lockProjectForWork(tx, initial.projectId);
    await lockMilestoneForWork(tx, milestoneId);
    const context = await getProjectWorkContextByMilestoneId(tx, milestoneId);
    if (!context) notFound();

    if (context.projectStatus !== "ACTIVE" && context.projectStatus !== "FINAL_REVIEW") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "This project is closed; milestone reviews are read-only.");
    }
    if (context.milestoneStatus === "COMPLETED") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "This milestone is already complete.");
    }
    if (context.milestoneStatus !== "SUBMITTED") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "There is no submission awaiting review on this milestone.");
    }

    const current = await getCurrentSubmission(tx, milestoneId);
    if (!current || current.id !== submissionId) {
      throw new MilestoneReviewError("CONFLICT", "A newer submission exists. Refresh to review the current round.");
    }
    const existing = await listRoundDecisions(tx, current.id);
    if (existing.some((row) => row.reviewerRole === role)) {
      throw new MilestoneReviewError("CONFLICT", "Your side has already recorded a decision for this round.");
    }

    const inserted = await insertMilestoneReview(tx, {
      comments: note,
      decision,
      milestoneId,
      now,
      reviewerId: actor.user.userId,
      reviewerOrganizationId: role === "PARTNER" ? context.ownerOrganizationId : null,
      reviewerRole: role,
      submissionId: current.id,
    });
    if (!inserted) {
      throw new MilestoneReviewError("CONFLICT", "Your side has already recorded a decision for this round.");
    }
    await options.injectFailureAfterReviewInsert?.();

    if (decision === "REVISION_REQUESTED") {
      const moved = await transitionMilestone(tx, { expected: ["SUBMITTED"], milestoneId, next: "REVISION_REQUESTED", now });
      if (!moved) throw new MilestoneReviewError("CONFLICT", "The milestone changed during review. Refresh and try again.");
      return { milestoneStatus: "REVISION_REQUESTED" as const, projectStatus: context.projectStatus };
    }

    const decisions = await listRoundDecisions(tx, current.id);
    const approved = (side: ReviewRole) =>
      decisions.some((row) => row.reviewerRole === side && row.decision === "APPROVED");
    if (!approved("FACULTY") || !approved("PARTNER")) {
      return { milestoneStatus: "SUBMITTED" as const, projectStatus: context.projectStatus };
    }

    const completed = await transitionMilestone(tx, { expected: ["SUBMITTED"], milestoneId, next: "COMPLETED", now });
    if (!completed) throw new MilestoneReviewError("CONFLICT", "The milestone changed during review. Refresh and try again.");

    let projectStatus = context.projectStatus;
    if (projectStatus === "ACTIVE") {
      const counts = await countMilestones(tx, context.projectId);
      if (counts.total > 0 && counts.incomplete === 0) {
        const moved = await transitionProject(tx, { expected: ["ACTIVE"], next: "FINAL_REVIEW", now, projectId: context.projectId });
        if (!moved) throw new MilestoneReviewError("CONFLICT", "The project changed during review. Refresh and try again.");
        projectStatus = "FINAL_REVIEW";
      }
    }
    return { milestoneStatus: "COMPLETED" as const, projectStatus };
  });
}

// ---------------------------------------------------------------------------
// Final project review — FACULTY + PARTNER in the same round → COMPLETED.
// ---------------------------------------------------------------------------

/**
 * The current final-review round is derived from persisted rounds, not time:
 * the highest round unless it already holds a revision request (which closed
 * it and returned the project to ACTIVE), in which case the next one.
 */
export function currentFinalRound(rows: Array<{ decision: string; roundNumber: number }>) {
  const highest = rows.reduce((max, row) => Math.max(max, row.roundNumber), 0);
  if (highest === 0) return 1;
  const closed = rows.some((row) => row.roundNumber === highest && row.decision === "REVISION_REQUESTED");
  return closed ? highest + 1 : highest;
}

export async function recordFinalProjectReview(
  applicationPublicId: string,
  role: ReviewRole,
  decision: ReviewDecision,
  comments: string | null,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions & { expectedRound?: number } = {}
) {
  if (!isPublicId(applicationPublicId)) notFound();
  if (role === "FACULTY" && !actor.facultyProfile) {
    throw new MilestoneReviewError("FORBIDDEN", "Only a faculty account can sign off as supervisor.");
  }
  const note = comments?.trim() || null;
  if (decision === "REVISION_REQUESTED" && !note) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Say what still needs to happen before close-out.");
  }
  const now = options.now ?? new Date();

  return inTransaction(options, async (tx) => {
    const initial = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!initial || !isAuthorizedReviewer(actor, initial, role)) notFound();

    await lockProjectForWork(tx, initial.projectId);
    const context = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!context) notFound();
    if (context.projectStatus !== "FINAL_REVIEW") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "This project is not in final review.");
    }
    const counts = await countMilestones(tx, context.projectId);
    if (counts.total === 0 || counts.incomplete > 0) {
      throw new MilestoneReviewError("CONFLICT", "Every milestone must be complete before final approval.");
    }

    const round = currentFinalRound(await listFinalReviewsForWrite(tx, context.projectId));
    if (options.expectedRound !== undefined && options.expectedRound !== round) {
      throw new MilestoneReviewError("CONFLICT", "The final review moved on. Refresh to see the current round.");
    }
    const inserted = await insertFinalReview(tx, {
      comments: note,
      decision,
      now,
      projectId: context.projectId,
      reviewerId: actor.user.userId,
      reviewerOrganizationId: role === "PARTNER" ? context.ownerOrganizationId : null,
      reviewerRole: role,
      roundNumber: round,
    });
    if (!inserted) {
      throw new MilestoneReviewError("CONFLICT", "Your side has already recorded a final decision for this round.");
    }
    await options.injectFailureAfterReviewInsert?.();

    if (decision === "REVISION_REQUESTED") {
      const moved = await transitionProject(tx, { expected: ["FINAL_REVIEW"], next: "ACTIVE", now, projectId: context.projectId });
      if (!moved) throw new MilestoneReviewError("CONFLICT", "The project changed during review. Refresh and try again.");
      return { projectStatus: "ACTIVE" as const, round };
    }

    const rows = (await listFinalReviewsForWrite(tx, context.projectId)).filter((row) => row.roundNumber === round);
    const approved = (side: ReviewRole) => rows.some((row) => row.reviewerRole === side && row.decision === "APPROVED");
    if (!approved("FACULTY") || !approved("PARTNER")) {
      return { projectStatus: "FINAL_REVIEW" as const, round };
    }
    // The end date is the real completion date. A project closed before its
    // recorded start date keeps none rather than an end that precedes its start.
    const today = campusDate(now);
    const moved = await transitionProject(tx, {
      endDate: !context.startDate || context.startDate <= today ? today : null,
      expected: ["FINAL_REVIEW"],
      next: "COMPLETED",
      now,
      projectId: context.projectId,
    });
    if (!moved) throw new MilestoneReviewError("CONFLICT", "The project changed during review. Refresh and try again.");
    return { projectStatus: "COMPLETED" as const, round };
  });
}

function campusDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
  }).format(now);
}

// ---------------------------------------------------------------------------
// Close-out feedback — optional, during FINAL_REVIEW, separate from approval.
// ---------------------------------------------------------------------------

export async function submitPartnerCloseoutFeedback(
  applicationPublicId: string,
  input: { hostAgain: string; note: string; privateNote: string | null; quality: string; reliability: string },
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
) {
  if (!isPublicId(applicationPublicId)) notFound();
  const note = input.note.trim();
  if (!note) throw new MilestoneReviewError("VALIDATION_ERROR", "Write the feedback the team will read.");
  if (!(BANDS as readonly string[]).includes(input.quality) || !(BANDS as readonly string[]).includes(input.reliability)) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Choose a band for quality and for reliability.");
  }
  if (!(HOST_AGAIN as readonly string[]).includes(input.hostAgain)) {
    throw new MilestoneReviewError("VALIDATION_ERROR", "Say whether you would host this team again.");
  }
  const now = options.now ?? new Date();

  return inTransaction(options, async (tx) => {
    const initial = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!initial || !isAuthorizedReviewer(actor, initial, "PARTNER")) notFound();
    await lockProjectForWork(tx, initial.projectId);
    const context = await getProjectWorkContextByApplicationPublicId(tx, applicationPublicId);
    if (!context) notFound();
    if (context.projectStatus !== "FINAL_REVIEW") {
      throw new MilestoneReviewError("INVALID_TRANSITION", "Close-out feedback is written during final review.");
    }
    if (await hasCloseoutFeedbackFrom(tx, context.projectId, actor.user.userId)) {
      throw new MilestoneReviewError("CONFLICT", "You have already sent close-out feedback for this project.");
    }
    await insertCloseoutFeedback(tx, {
      authorId: actor.user.userId,
      content: note,
      metrics: { hostAgain: input.hostAgain, quality: input.quality, reliability: input.reliability },
      now,
      projectId: context.projectId,
      visibility: "PROJECT_TEAM",
    });
    const privateNote = input.privateNote?.trim();
    if (privateNote) {
      await insertCloseoutFeedback(tx, {
        authorId: actor.user.userId,
        content: privateNote,
        metrics: null,
        now,
        projectId: context.projectId,
        visibility: "PRIVATE_ADMIN",
      });
    }
  });
}
