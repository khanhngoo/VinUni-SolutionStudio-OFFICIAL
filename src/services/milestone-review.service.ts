import { db } from "@/db";
import {
  getMilestoneReviewContext,
  listMilestoneReviewDecisions,
  recordMilestoneReviewRow,
  updateMilestoneStatus,
  type MilestoneMutationDatabase,
} from "@/db/mutations/milestones";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";

export type MilestoneReviewErrorCode = "FORBIDDEN" | "INVALID_TRANSITION" | "NOT_FOUND";

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
  now?: Date;
}

/**
 * Records a faculty sign-off on a milestone.
 *
 * The reviewer role is derived from the actor's relationship to the project —
 * they must be its supervisor — rather than from the route they arrived on, so
 * a faculty account cannot sign off on a project that is not theirs by finding
 * the right URL.
 *
 * A milestone only reaches COMPLETED when both sides have approved. That rule
 * is the whole point of the dual sign-off, so it is enforced here by reading
 * the standing decisions rather than trusting whoever wrote last.
 */
export async function recordFacultyMilestoneReview(
  milestoneId: bigint,
  decision: "APPROVED" | "REVISION_REQUESTED",
  comments: string | null,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
): Promise<void> {
  if (!actor.facultyProfile) {
    throw new MilestoneReviewError(
      "FORBIDDEN",
      "Only a faculty account can sign off as supervisor."
    );
  }

  const now = options.now ?? new Date();

  const run = async (tx: MilestoneMutationDatabase) => {
    const context = await getMilestoneReviewContext(tx, milestoneId);
    if (!context) {
      throw new MilestoneReviewError("NOT_FOUND", "Milestone was not found.");
    }

    // Not their project reads the same as not existing, so no supervision
    // relationship leaks through the difference.
    if (context.facultySupervisorId !== actor.user.userId) {
      throw new MilestoneReviewError("NOT_FOUND", "Milestone was not found.");
    }

    if (context.milestoneStatus === "COMPLETED") {
      throw new MilestoneReviewError(
        "INVALID_TRANSITION",
        "This milestone is already complete."
      );
    }

    await recordMilestoneReviewRow(tx, {
      comments,
      decision,
      milestoneId,
      now,
      reviewerId: actor.user.userId,
      reviewerOrganizationId: null,
      reviewerRole: "FACULTY",
    });

    if (decision === "REVISION_REQUESTED") {
      await updateMilestoneStatus(tx, { milestoneId, now, status: "REVISION_REQUESTED" });
      return;
    }

    const decisions = await listMilestoneReviewDecisions(tx, milestoneId);
    const partnerApproved = decisions.some(
      (row) =>
        (row.reviewerRole === "PARTNER" ||
          row.reviewerRole === "MANAGING_ORGANIZATION") &&
        row.decision === "APPROVED"
    );

    // Approving alone does not complete anything; it removes one of the two
    // things the milestone is waiting on.
    if (partnerApproved) {
      await updateMilestoneStatus(tx, { milestoneId, now, status: "COMPLETED" });
    }
  };

  if (options.database) {
    await run(options.database);
    return;
  }

  await db.transaction(async (tx) => {
    await run(tx);
  });
}
