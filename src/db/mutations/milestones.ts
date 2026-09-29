import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  challenges,
  deliverables,
  feedback,
  milestoneReviews,
  milestoneSubmissions,
  milestones,
  projectFinalReviews,
  projects,
} from "@/db/schema";

export type MilestoneMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type ProjectStatus = NonNullable<typeof projects.$inferSelect.status>;
type MilestoneStatus = NonNullable<typeof milestones.$inferSelect.status>;
type ReviewRole = "FACULTY" | "PARTNER";
type ReviewDecision = "APPROVED" | "REVISION_REQUESTED";

export interface ProjectWorkContext {
  applicationPublicId: string;
  facultySupervisorId: bigint | null;
  ownerOrganizationId: bigint;
  projectId: bigint;
  projectStatus: ProjectStatus;
  startDate: string | null;
}

const projectContextColumns = {
  applicationPublicId: applications.publicId,
  facultySupervisorId: projects.facultySupervisorId,
  ownerOrganizationId: challenges.ownerOrganizationId,
  projectId: projects.id,
  projectStatus: sql<ProjectStatus>`coalesce(${projects.status}, 'ACTIVE')`,
  startDate: projects.startDate,
};

export async function getProjectWorkContextByApplicationPublicId(
  database: MilestoneMutationDatabase,
  applicationPublicId: string
): Promise<ProjectWorkContext | null> {
  const [row] = await database
    .select(projectContextColumns)
    .from(projects)
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(applications.publicId, applicationPublicId))
    .limit(1);
  return row ?? null;
}

export async function getProjectWorkContextByMilestoneId(
  database: MilestoneMutationDatabase,
  milestoneId: bigint
): Promise<(ProjectWorkContext & { milestoneStatus: MilestoneStatus }) | null> {
  const [row] = await database
    .select({
      ...projectContextColumns,
      milestoneStatus: sql<MilestoneStatus>`coalesce(${milestones.status}, 'PENDING')`,
    })
    .from(milestones)
    .innerJoin(projects, eq(projects.id, milestones.projectId))
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(milestones.id, milestoneId))
    .limit(1);
  return row ?? null;
}

/**
 * Lock order is always project row, then milestone row. Every project-work
 * write takes the project lock first, so a milestone completion and the
 * project's FINAL_REVIEW/COMPLETED transition can never interleave.
 */
export async function lockProjectForWork(database: MilestoneMutationDatabase, projectId: bigint) {
  await database.execute(
    sql`select ${projects.id} from ${projects} where ${projects.id} = ${projectId} for update`
  );
}

export async function lockMilestoneForWork(database: MilestoneMutationDatabase, milestoneId: bigint) {
  await database.execute(
    sql`select ${milestones.id} from ${milestones} where ${milestones.id} = ${milestoneId} for update`
  );
}

export async function insertMilestone(
  database: MilestoneMutationDatabase,
  values: { deadline: string | null; description: string | null; now: Date; projectId: bigint; title: string }
) {
  const [row] = await database
    .insert(milestones)
    .values({
      createdAt: values.now,
      deadline: values.deadline,
      description: values.description,
      projectId: values.projectId,
      status: "PENDING",
      title: values.title,
      updatedAt: values.now,
    })
    .returning({ id: milestones.id });
  return row;
}

/** The effective round is the highest round number — never inferred from timestamps. */
export async function getCurrentSubmission(database: MilestoneMutationDatabase, milestoneId: bigint) {
  const [row] = await database
    .select({ id: milestoneSubmissions.id, roundNumber: milestoneSubmissions.roundNumber })
    .from(milestoneSubmissions)
    .where(eq(milestoneSubmissions.milestoneId, milestoneId))
    .orderBy(desc(milestoneSubmissions.roundNumber))
    .limit(1);
  return row ?? null;
}

export async function insertSubmissionRound(
  database: MilestoneMutationDatabase,
  values: { milestoneId: bigint; now: Date; roundNumber: number; submittedBy: bigint }
) {
  const [row] = await database
    .insert(milestoneSubmissions)
    .values({
      createdAt: values.now,
      milestoneId: values.milestoneId,
      roundNumber: values.roundNumber,
      submittedAt: values.now,
      submittedBy: values.submittedBy,
    })
    .onConflictDoNothing({ target: [milestoneSubmissions.milestoneId, milestoneSubmissions.roundNumber] })
    .returning({ id: milestoneSubmissions.id, roundNumber: milestoneSubmissions.roundNumber });
  return row ?? null;
}

export async function insertDeliverable(
  database: MilestoneMutationDatabase,
  values: {
    deliverableType: "FILE" | "LINK" | "OTHER" | "TEXT";
    description: string | null;
    externalUrl: string | null;
    fileUrl: string | null;
    milestoneId: bigint;
    now: Date;
    submissionId: bigint;
    submittedBy: bigint;
    title: string;
  }
) {
  const [row] = await database
    .insert(deliverables)
    .values({
      deliverableType: values.deliverableType,
      description: values.description,
      externalUrl: values.externalUrl,
      fileUrl: values.fileUrl,
      milestoneId: values.milestoneId,
      submissionId: values.submissionId,
      submittedAt: values.now,
      submittedBy: values.submittedBy,
      title: values.title,
    })
    .returning({ id: deliverables.id });
  return row;
}

/**
 * Append-only. `(submission_id, reviewer_role)` is unique, so a second
 * decision by the same side on the same round resolves to `null` here and the
 * caller reports a conflict; earlier rounds are never touched.
 */
export async function insertMilestoneReview(
  database: MilestoneMutationDatabase,
  values: {
    comments: string | null;
    decision: ReviewDecision;
    milestoneId: bigint;
    now: Date;
    reviewerId: bigint;
    reviewerOrganizationId: bigint | null;
    reviewerRole: ReviewRole;
    submissionId: bigint;
  }
) {
  const [row] = await database
    .insert(milestoneReviews)
    .values({
      comments: values.comments,
      createdAt: values.now,
      decision: values.decision,
      milestoneId: values.milestoneId,
      reviewerId: values.reviewerId,
      reviewerOrganizationId: values.reviewerOrganizationId,
      reviewerRole: values.reviewerRole,
      submissionId: values.submissionId,
      updatedAt: values.now,
    })
    .onConflictDoNothing({ target: [milestoneReviews.submissionId, milestoneReviews.reviewerRole] })
    .returning({ id: milestoneReviews.id });
  return row ?? null;
}

export async function listRoundDecisions(database: MilestoneMutationDatabase, submissionId: bigint) {
  return database
    .select({ decision: milestoneReviews.decision, reviewerRole: milestoneReviews.reviewerRole })
    .from(milestoneReviews)
    .where(eq(milestoneReviews.submissionId, submissionId));
}

/** Compare-and-set so a stale transition can never overwrite a newer one. */
export async function transitionMilestone(
  database: MilestoneMutationDatabase,
  values: { expected: MilestoneStatus[]; milestoneId: bigint; next: MilestoneStatus; now: Date }
) {
  const [row] = await database
    .update(milestones)
    .set({ status: values.next, updatedAt: values.now })
    .where(and(eq(milestones.id, values.milestoneId), inArray(milestones.status, values.expected)))
    .returning({ id: milestones.id });
  return row ?? null;
}

export async function transitionProject(
  database: MilestoneMutationDatabase,
  values: { endDate?: string | null; expected: ProjectStatus[]; next: ProjectStatus; now: Date; projectId: bigint }
) {
  const [row] = await database
    .update(projects)
    .set({
      status: values.next,
      updatedAt: values.now,
      ...(values.endDate !== undefined ? { endDate: values.endDate } : {}),
    })
    .where(and(eq(projects.id, values.projectId), inArray(projects.status, values.expected)))
    .returning({ id: projects.id });
  return row ?? null;
}

export async function countMilestones(database: MilestoneMutationDatabase, projectId: bigint) {
  const [total] = await database
    .select({ value: count() })
    .from(milestones)
    .where(eq(milestones.projectId, projectId));
  const [incomplete] = await database
    .select({ value: count() })
    .from(milestones)
    .where(and(eq(milestones.projectId, projectId), ne(milestones.status, "COMPLETED")));
  return { incomplete: Number(incomplete?.value ?? 0), total: Number(total?.value ?? 0) };
}

export async function listFinalReviewsForWrite(database: MilestoneMutationDatabase, projectId: bigint) {
  return database
    .select({
      decision: projectFinalReviews.decision,
      reviewerRole: projectFinalReviews.reviewerRole,
      roundNumber: projectFinalReviews.roundNumber,
    })
    .from(projectFinalReviews)
    .where(eq(projectFinalReviews.projectId, projectId));
}

export async function insertFinalReview(
  database: MilestoneMutationDatabase,
  values: {
    comments: string | null;
    decision: ReviewDecision;
    now: Date;
    projectId: bigint;
    reviewerId: bigint;
    reviewerOrganizationId: bigint | null;
    reviewerRole: ReviewRole;
    roundNumber: number;
  }
) {
  const [row] = await database
    .insert(projectFinalReviews)
    .values({
      comments: values.comments,
      createdAt: values.now,
      decision: values.decision,
      projectId: values.projectId,
      reviewerId: values.reviewerId,
      reviewerOrganizationId: values.reviewerOrganizationId,
      reviewerRole: values.reviewerRole,
      roundNumber: values.roundNumber,
    })
    .onConflictDoNothing({
      target: [projectFinalReviews.projectId, projectFinalReviews.roundNumber, projectFinalReviews.reviewerRole],
    })
    .returning({ id: projectFinalReviews.id });
  return row ?? null;
}

export async function hasCloseoutFeedbackFrom(
  database: MilestoneMutationDatabase,
  projectId: bigint,
  authorId: bigint
) {
  const [row] = await database
    .select({ id: feedback.id })
    .from(feedback)
    .where(
      and(
        eq(feedback.projectId, projectId),
        eq(feedback.authorId, authorId),
        eq(feedback.feedbackType, "PARTNER_CLOSEOUT")
      )
    )
    .limit(1);
  return Boolean(row);
}

export async function insertCloseoutFeedback(
  database: MilestoneMutationDatabase,
  values: {
    authorId: bigint;
    content: string;
    metrics: Record<string, string> | null;
    now: Date;
    projectId: bigint;
    visibility: "PROJECT_TEAM" | "PRIVATE_ADMIN";
  }
) {
  await database.insert(feedback).values({
    authorId: values.authorId,
    content: values.content,
    createdAt: values.now,
    feedbackType: "PARTNER_CLOSEOUT",
    metrics: values.metrics,
    projectId: values.projectId,
    visibility: values.visibility,
  });
}
