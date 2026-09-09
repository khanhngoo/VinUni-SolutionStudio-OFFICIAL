import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  challengeEligibilityRules,
  challengeReviews,
  challengeSkills,
  challenges,
  organizations,
  skills,
  users,
} from "@/db/schema";

export type ReviewQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type ChallengeRow = typeof challenges.$inferSelect;
export type ReviewChallengeStatus = NonNullable<ChallengeRow["status"]>;

const NEEDS_REVIEW_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;
const APPROVED_STATUSES = ["APPROVED"] as const;

export interface ReviewQueueItem {
  applicationDeadline: Date | null;
  ownerOrganizationName: string;
  publicId: string;
  slug: string | null;
  status: ReviewChallengeStatus;
  submittedAt: Date;
  title: string;
}

export interface ReviewOrganizationOption {
  id: string;
  name: string;
}

/**
 * Every VinUni internal unit an actor could pick as a managing organization
 * — read from real organization rows, never hardcoded CAID/E-Lab ids. Used
 * by the partner authoring form's managing-organization selector.
 */
export async function listInternalUnitOrganizations(
  database: ReviewQueryDatabase = db
): Promise<ReviewOrganizationOption[]> {
  const rows = await database
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.organizationType, "INTERNAL_UNIT"))
    .orderBy(asc(organizations.name));

  return rows.map((row) => ({ id: row.id.toString(), name: row.name }));
}

/**
 * The review queue, scoped strictly to the managing-organization ids the
 * caller supplies — the caller is responsible for deriving that list from
 * the actor's own active INTERNAL_UNIT organization memberships
 * (`resolveInternalUnitOrganizationIds` in `review.service.ts`). No global
 * "all challenges" query exists here; an unrelated managing unit's
 * submissions never enter the result set.
 */
export async function listReviewQueue(
  database: ReviewQueryDatabase,
  managingOrganizationIds: bigint[]
): Promise<{ approved: ReviewQueueItem[]; needsReview: ReviewQueueItem[] }> {
  if (managingOrganizationIds.length === 0) return { approved: [], needsReview: [] };

  const owner = alias(organizations, "review_owner_organization");

  const rows = await database
    .select({
      applicationDeadline: challenges.applicationDeadline,
      ownerOrganizationName: owner.name,
      publicId: challenges.publicId,
      slug: challenges.slug,
      status: challenges.status,
      submittedAt: challenges.updatedAt,
      title: challenges.title,
    })
    .from(challenges)
    .innerJoin(owner, eq(owner.id, challenges.ownerOrganizationId))
    .where(
      and(
        inArray(challenges.managingOrganizationId, managingOrganizationIds),
        inArray(challenges.status, [...NEEDS_REVIEW_STATUSES, ...APPROVED_STATUSES])
      )
    )
    .orderBy(desc(challenges.updatedAt), desc(challenges.id));

  const needsReview: ReviewQueueItem[] = [];
  const approved: ReviewQueueItem[] = [];

  for (const row of rows) {
    const item: ReviewQueueItem = {
      applicationDeadline: row.applicationDeadline,
      ownerOrganizationName: row.ownerOrganizationName,
      publicId: row.publicId,
      slug: row.slug,
      status: row.status ?? "DRAFT",
      submittedAt: row.submittedAt ?? new Date(0),
      title: row.title,
    };
    if ((NEEDS_REVIEW_STATUSES as readonly string[]).includes(item.status)) {
      needsReview.push(item);
    } else {
      approved.push(item);
    }
  }

  return { approved, needsReview };
}

export interface ReviewChallengeSkillRead {
  canonicalName: string;
  requirementType: typeof challengeSkills.$inferSelect["requirementType"];
}

export interface ReviewChallengeReviewRead {
  comments: string | null;
  decision: typeof challengeReviews.$inferSelect["decision"];
  reviewedAt: Date | null;
  reviewerName: string;
}

export interface ReviewChallengeDetailRead {
  applicationDeadline: Date | null;
  compensationDescription: string | null;
  compensationType: NonNullable<ChallengeRow["compensationType"]>;
  description: string;
  domain: string | null;
  durationWeeks: number | null;
  eligibilitySummary: {
    minGpa: number | null;
    schools: string[] | null;
    studyYears: number[] | null;
  };
  managingOrganizationId: string;
  ownerOrganizationName: string;
  publicId: string;
  reviews: ReviewChallengeReviewRead[];
  skills: ReviewChallengeSkillRead[];
  slug: string | null;
  startDate: string | null;
  status: ReviewChallengeStatus;
  subtype: string | null;
  summary: string;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
  weeklyHours: number | null;
  workMode: NonNullable<ChallengeRow["workMode"]> | null;
}

/**
 * A single challenge for the review runtime, scoped by
 * `managingOrganizationId` in the query itself — the exact same isolation
 * shape `getOwnedChallengeDetail` uses for owner organizations. A challenge
 * managed by a different internal unit simply does not match and resolves
 * to `null`, the same shape as "not found" — this is what prevents a direct
 * review URL from leaking cross-unit challenge data.
 */
export async function getReviewChallengeDetail(
  database: ReviewQueryDatabase,
  managingOrganizationId: bigint,
  slug: string
): Promise<ReviewChallengeDetailRead | null> {
  const owner = alias(organizations, "review_detail_owner_organization");

  const [row] = await database
    .select({
      applicationDeadline: challenges.applicationDeadline,
      compensationDescription: challenges.compensationDescription,
      compensationType: challenges.compensationType,
      description: challenges.description,
      domain: challenges.domain,
      durationWeeks: challenges.durationWeeks,
      internalId: challenges.id,
      managingOrganizationId: challenges.managingOrganizationId,
      ownerOrganizationName: owner.name,
      publicId: challenges.publicId,
      slug: challenges.slug,
      startDate: challenges.startDate,
      status: challenges.status,
      subtype: challenges.subtype,
      summary: challenges.summary,
      teamSizeMax: challenges.teamSizeMax,
      teamSizeMin: challenges.teamSizeMin,
      title: challenges.title,
      weeklyHours: challenges.weeklyHours,
      workMode: challenges.workMode,
    })
    .from(challenges)
    .innerJoin(owner, eq(owner.id, challenges.ownerOrganizationId))
    .where(
      and(
        eq(challenges.slug, slug),
        eq(challenges.managingOrganizationId, managingOrganizationId)
      )
    )
    .limit(1);

  if (!row) return null;

  const [skillRows, eligibilityRows, reviewRows] = await Promise.all([
    database
      .select({
        canonicalName: skills.canonicalName,
        requirementType: challengeSkills.requirementType,
      })
      .from(challengeSkills)
      .innerJoin(skills, eq(skills.id, challengeSkills.skillId))
      .where(eq(challengeSkills.challengeId, row.internalId))
      .orderBy(asc(skills.canonicalName)),
    database
      .select({
        config: challengeEligibilityRules.config,
        ruleType: challengeEligibilityRules.ruleType,
      })
      .from(challengeEligibilityRules)
      .where(eq(challengeEligibilityRules.challengeId, row.internalId)),
    database
      .select({
        comments: challengeReviews.comments,
        decision: challengeReviews.decision,
        reviewedAt: challengeReviews.createdAt,
        reviewerName: users.fullName,
      })
      .from(challengeReviews)
      .innerJoin(users, eq(users.id, challengeReviews.reviewerId))
      .where(eq(challengeReviews.challengeId, row.internalId))
      .orderBy(desc(challengeReviews.createdAt)),
  ]);

  return {
    applicationDeadline: row.applicationDeadline,
    compensationDescription: row.compensationDescription,
    compensationType: row.compensationType ?? "NOT_SPECIFIED",
    description: row.description,
    domain: row.domain,
    durationWeeks: row.durationWeeks,
    eligibilitySummary: summarizeEligibility(eligibilityRows),
    managingOrganizationId: row.managingOrganizationId.toString(),
    ownerOrganizationName: row.ownerOrganizationName,
    publicId: row.publicId,
    reviews: reviewRows,
    skills: skillRows,
    slug: row.slug,
    startDate: row.startDate,
    status: row.status ?? "DRAFT",
    subtype: row.subtype,
    summary: row.summary,
    teamSizeMax: row.teamSizeMax,
    teamSizeMin: row.teamSizeMin,
    title: row.title,
    weeklyHours: row.weeklyHours,
    workMode: row.workMode,
  };
}

function summarizeEligibility(rows: Array<{ config: unknown; ruleType: string }>) {
  let minGpa: number | null = null;
  let schools: string[] | null = null;
  let studyYears: number[] | null = null;

  for (const row of rows) {
    const config = row.config;
    if (!config || typeof config !== "object" || Array.isArray(config)) continue;
    const record = config as Record<string, unknown>;

    if (row.ruleType === "MIN_GPA" && typeof record.minGpa === "number") {
      minGpa = record.minGpa;
    }
    if (
      row.ruleType === "SCHOOL" &&
      Array.isArray(record.schools) &&
      record.schools.every((item): item is string => typeof item === "string")
    ) {
      schools = record.schools;
    }
    if (
      row.ruleType === "STUDY_YEAR" &&
      Array.isArray(record.studyYears) &&
      record.studyYears.every((item): item is number => typeof item === "number")
    ) {
      studyYears = record.studyYears;
    }
  }

  return { minGpa, schools, studyYears };
}
