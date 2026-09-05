import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { milestoneReviews, milestones, projects } from "@/db/schema";

export type MilestoneMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface MilestoneContextRead {
  facultySupervisorId: bigint | null;
  milestoneStatus: string | null;
  ownerOrganizationId: bigint | null;
  projectId: bigint;
}

/**
 * Everything needed to decide whether this actor may review this milestone,
 * read in one go so the policy has no reason to fetch anything itself.
 */
export async function getMilestoneReviewContext(
  database: MilestoneMutationDatabase,
  milestoneId: bigint
): Promise<MilestoneContextRead | null> {
  const [row] = await database
    .select({
      facultySupervisorId: projects.facultySupervisorId,
      milestoneStatus: milestones.status,
      projectId: projects.id,
    })
    .from(milestones)
    .innerJoin(projects, eq(projects.id, milestones.projectId))
    .where(eq(milestones.id, milestoneId))
    .limit(1);

  if (!row) return null;
  return { ...row, ownerOrganizationId: null };
}

/**
 * Records one reviewer's decision on a milestone.
 *
 * A reviewer holds at most one standing decision per milestone per role, so a
 * supervisor who approves after having requested changes replaces their own
 * earlier verdict rather than stacking a second one. The faculty and partner
 * sign-offs are separate rows by design — that is what makes the dual sign-off
 * dual.
 */
export async function recordMilestoneReviewRow(
  database: MilestoneMutationDatabase,
  input: {
    comments: string | null;
    decision: "APPROVED" | "REVISION_REQUESTED";
    milestoneId: bigint;
    now: Date;
    reviewerId: bigint;
    reviewerOrganizationId: bigint | null;
    reviewerRole: "FACULTY" | "PARTNER" | "MANAGING_ORGANIZATION";
  }
): Promise<void> {
  const [existing] = await database
    .select({ id: milestoneReviews.id })
    .from(milestoneReviews)
    .where(
      and(
        eq(milestoneReviews.milestoneId, input.milestoneId),
        eq(milestoneReviews.reviewerId, input.reviewerId),
        eq(milestoneReviews.reviewerRole, input.reviewerRole)
      )
    )
    .orderBy(desc(milestoneReviews.id))
    .limit(1);

  if (existing) {
    await database
      .update(milestoneReviews)
      .set({
        comments: input.comments,
        createdAt: input.now,
        decision: input.decision,
      })
      .where(eq(milestoneReviews.id, existing.id));
    return;
  }

  await database.insert(milestoneReviews).values({
    comments: input.comments,
    createdAt: input.now,
    decision: input.decision,
    milestoneId: input.milestoneId,
    reviewerId: input.reviewerId,
    reviewerOrganizationId: input.reviewerOrganizationId,
    reviewerRole: input.reviewerRole,
  });
}

/**
 * Moves the milestone itself.
 *
 * REVISION_REQUESTED is one reviewer's call and takes effect immediately.
 * COMPLETED is not: it requires both sign-offs, so the caller passes it only
 * after checking that the other side has already approved.
 */
export async function updateMilestoneStatus(
  database: MilestoneMutationDatabase,
  input: {
    milestoneId: bigint;
    now: Date;
    status: "REVISION_REQUESTED" | "COMPLETED" | "SUBMITTED";
  }
): Promise<void> {
  await database
    .update(milestones)
    .set({ status: input.status, updatedAt: input.now })
    .where(eq(milestones.id, input.milestoneId));
}

/** The standing decisions on a milestone, one per reviewer role. */
export async function listMilestoneReviewDecisions(
  database: MilestoneMutationDatabase,
  milestoneId: bigint
): Promise<{ decision: string; reviewerRole: string }[]> {
  return database
    .select({
      decision: milestoneReviews.decision,
      reviewerRole: milestoneReviews.reviewerRole,
    })
    .from(milestoneReviews)
    .where(eq(milestoneReviews.milestoneId, milestoneId));
}
