import { db } from "@/db";
import {
  getMilestoneReviewContext,
  listMilestoneReviewDecisions,
  recordMilestoneReviewRow,
  updateMilestoneStatus,
  type MilestoneMutationDatabase,
} from "@/db/mutations/milestones";
import {
  hasOneOfActiveOrganizationRoles,
  type AuthenticatedActor,
} from "@/auth/authenticated-actor";

/** Who on the partner side may sign a milestone off on the org's behalf. */
const PARTNER_SIGNOFF_ROLES = ["ADMIN", "CONTACT_PERSON", "PROJECT_MANAGER"] as const;

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

  return record(milestoneId, decision, comments, actor, "FACULTY", options);
}

/**
 * Records the partner's sign-off on a milestone.
 *
 * Authority comes from an active role in the organization that owns the
 * challenge, taken from the milestone's own row rather than from anything the
 * caller supplies — the same reason the faculty path reads the supervisor off
 * the project instead of trusting the route.
 */
export async function recordPartnerMilestoneReview(
  milestoneId: bigint,
  decision: "APPROVED" | "REVISION_REQUESTED",
  comments: string | null,
  actor: AuthenticatedActor,
  options: MilestoneReviewOptions = {}
): Promise<void> {
  return record(milestoneId, decision, comments, actor, "PARTNER", options);
}

async function record(
  milestoneId: bigint,
  decision: "APPROVED" | "REVISION_REQUESTED",
  comments: string | null,
  actor: AuthenticatedActor,
  reviewerRole: "FACULTY" | "PARTNER",
  options: MilestoneReviewOptions
): Promise<void> {
  const now = options.now ?? new Date();

  const run = async (tx: MilestoneMutationDatabase) => {
    const context = await getMilestoneReviewContext(tx, milestoneId);
    if (!context) {
      throw new MilestoneReviewError("NOT_FOUND", "Milestone was not found.");
    }

    // Not yours reads the same as not existing, so no relationship to a
    // project leaks through the difference between the two.
    const authorized =
      reviewerRole === "FACULTY"
        ? context.facultySupervisorId === actor.user.userId
        : context.ownerOrganizationId !== null &&
          hasOneOfActiveOrganizationRoles(actor, context.ownerOrganizationId, [
            ...PARTNER_SIGNOFF_ROLES,
          ]);

    if (!authorized) {
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
      reviewerOrganizationId:
        reviewerRole === "PARTNER" ? context.ownerOrganizationId : null,
      reviewerRole,
    });

    if (decision === "REVISION_REQUESTED") {
      await updateMilestoneStatus(tx, { milestoneId, now, status: "REVISION_REQUESTED" });
      return;
    }

    // Approving alone does not complete anything; it removes one of the two
    // things the milestone is waiting on. The other side has to have said yes
    // too, which is the whole point of a dual sign-off.
    const decisions = await listMilestoneReviewDecisions(tx, milestoneId);
    const otherSideApproved = decisions.some((row) =>
      reviewerRole === "FACULTY"
        ? (row.reviewerRole === "PARTNER" ||
            row.reviewerRole === "MANAGING_ORGANIZATION") &&
          row.decision === "APPROVED"
        : row.reviewerRole === "FACULTY" && row.decision === "APPROVED"
    );

    if (otherSideApproved) {
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
