import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challengeEligibilityRules,
  challengeReviews,
  challengeSkills,
  challenges,
  organizations,
  skills,
} from "@/db/schema";

export type PartnerQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type ChallengeRow = typeof challenges.$inferSelect;
export type PartnerChallengeStatus = NonNullable<ChallengeRow["status"]>;
export type PartnerChallengeVisibility = NonNullable<ChallengeRow["visibility"]>;

export interface PartnerOwnedChallengeRead {
  applicantCount: number;
  applicationDeadline: Date | null;
  managingOrganizationName: string;
  publicId: string;
  slug: string | null;
  status: PartnerChallengeStatus;
  title: string;
  visibility: PartnerChallengeVisibility;
}

/**
 * Every challenge this partner organization owns, regardless of lifecycle
 * status — unlike the marketplace read path, this intentionally includes
 * DRAFT/SUBMITTED/etc. because an owner needs to see their own drafts, not
 * only what students can discover.
 */
export async function listOwnedChallenges(
  database: PartnerQueryDatabase,
  ownerOrganizationId: bigint
): Promise<PartnerOwnedChallengeRead[]> {
  const managing = alias(organizations, "partner_managing_organization");

  const rows = await database
    .select({
      applicantCount: sql<number>`count(${applications.id})::int`,
      applicationDeadline: challenges.applicationDeadline,
      managingOrganizationName: managing.name,
      publicId: challenges.publicId,
      slug: challenges.slug,
      status: sql<PartnerChallengeStatus>`coalesce(${challenges.status}, 'DRAFT')`,
      title: challenges.title,
      visibility: sql<PartnerChallengeVisibility>`coalesce(${challenges.visibility}, 'VINUNI_ONLY')`,
    })
    .from(challenges)
    .innerJoin(managing, eq(managing.id, challenges.managingOrganizationId))
    .leftJoin(applications, eq(applications.challengeId, challenges.id))
    .where(eq(challenges.ownerOrganizationId, ownerOrganizationId))
    .groupBy(challenges.id, managing.id)
    .orderBy(desc(challenges.createdAt), asc(challenges.id));

  return rows;
}

export interface PartnerChallengeSkillRead {
  canonicalName: string;
  requirementType: typeof challengeSkills.$inferSelect["requirementType"];
}

export interface PartnerChallengeReviewRead {
  comments: string | null;
  decision: typeof challengeReviews.$inferSelect["decision"];
  reviewedAt: Date | null;
}

export interface PartnerChallengeDetailRead {
  applicantCount: number;
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
  managingOrganizationName: string;
  publicId: string;
  reviews: PartnerChallengeReviewRead[];
  skills: PartnerChallengeSkillRead[];
  slug: string | null;
  startDate: string | null;
  status: PartnerChallengeStatus;
  subtype: string | null;
  summary: string;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
  visibility: PartnerChallengeVisibility;
  weeklyHours: number | null;
  workMode: NonNullable<ChallengeRow["workMode"]> | null;
}

/**
 * A single owned challenge's posted terms, scoped by ownerOrganizationId in
 * the query itself — this is the cross-partner isolation boundary: a
 * challenge owned by a different organization simply does not match and the
 * caller gets `null`, the same shape as "not found".
 */
export async function getOwnedChallengeDetail(
  database: PartnerQueryDatabase,
  ownerOrganizationId: bigint,
  identifier: { publicId?: string; slug?: string }
): Promise<PartnerChallengeDetailRead | null> {
  const managing = alias(organizations, "partner_managing_organization_detail");
  const identifierClause = identifier.slug
    ? eq(challenges.slug, identifier.slug)
    : identifier.publicId
      ? eq(challenges.publicId, identifier.publicId)
      : undefined;
  if (!identifierClause) return null;

  const rows = await database
    .select({
      applicantCount: sql<number>`count(${applications.id})::int`,
      applicationDeadline: challenges.applicationDeadline,
      compensationDescription: challenges.compensationDescription,
      compensationType: challenges.compensationType,
      description: challenges.description,
      domain: challenges.domain,
      durationWeeks: challenges.durationWeeks,
      internalId: challenges.id,
      managingOrganizationName: managing.name,
      publicId: challenges.publicId,
      slug: challenges.slug,
      startDate: challenges.startDate,
      status: challenges.status,
      subtype: challenges.subtype,
      summary: challenges.summary,
      teamSizeMax: challenges.teamSizeMax,
      teamSizeMin: challenges.teamSizeMin,
      title: challenges.title,
      visibility: challenges.visibility,
      weeklyHours: challenges.weeklyHours,
      workMode: challenges.workMode,
    })
    .from(challenges)
    .innerJoin(managing, eq(managing.id, challenges.managingOrganizationId))
    .leftJoin(applications, eq(applications.challengeId, challenges.id))
    .where(
      and(eq(challenges.ownerOrganizationId, ownerOrganizationId), identifierClause)
    )
    .groupBy(challenges.id, managing.id)
    .limit(1);

  const row = rows[0];
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
      })
      .from(challengeReviews)
      .where(eq(challengeReviews.challengeId, row.internalId))
      .orderBy(desc(challengeReviews.createdAt)),
  ]);

  return {
    applicantCount: row.applicantCount,
    applicationDeadline: row.applicationDeadline,
    compensationDescription: row.compensationDescription,
    compensationType: row.compensationType ?? "NOT_SPECIFIED",
    description: row.description,
    domain: row.domain,
    durationWeeks: row.durationWeeks,
    eligibilitySummary: summarizeEligibility(eligibilityRows),
    managingOrganizationName: row.managingOrganizationName,
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
    visibility: row.visibility ?? "VINUNI_ONLY",
    weeklyHours: row.weeklyHours,
    workMode: row.workMode,
  };
}

function summarizeEligibility(
  rows: Array<{ config: unknown; ruleType: string }>
) {
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

export interface PartnerApplicationRead {
  challengeSlug: string | null;
  challengeTitle: string;
  memberSummary: { accepted: number; invited: number; leaderName: string | null; total: number };
  publicId: string;
  status: string;
  submittedAt: Date | null;
  teamName: string | null;
}

/**
 * Every application against a challenge this organization owns — a single
 * set-based read across the whole portfolio rather than one query per
 * challenge. Callers are responsible for verifying the actor holds an
 * owner-organization read role before calling this (see
 * `hasOneOfActiveOrganizationRoles` in `@/auth/authenticated-actor`, the same
 * predicate `canAccessChallengeApplications` uses).
 */
export async function listApplicationsForOwnerOrganization(
  database: PartnerQueryDatabase,
  ownerOrganizationId: bigint,
  options: { challengeSlug?: string } = {}
): Promise<PartnerApplicationRead[]> {
  const conditions = [eq(challenges.ownerOrganizationId, ownerOrganizationId)];
  if (options.challengeSlug) {
    conditions.push(eq(challenges.slug, options.challengeSlug.trim()));
  }

  const rows = await database
    .select({
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
      id: applications.id,
      publicId: applications.publicId,
      status: sql<string>`coalesce(${applications.status}, 'SUBMITTED')`,
      submittedAt: applications.submittedAt,
      teamName: applications.teamName,
    })
    .from(applications)
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(and(...conditions))
    .orderBy(desc(applications.submittedAt), desc(applications.id));

  if (rows.length === 0) return [];

  const applicationIds = rows.map((row) => row.id);
  const memberRows = await database
    .select({
      applicationId: applicationMembers.applicationId,
      status: sql<string>`coalesce(${applicationMembers.status}, 'INVITED')`,
    })
    .from(applicationMembers)
    .where(inArray(applicationMembers.applicationId, applicationIds));

  const leaderNames = await leaderNamesFor(database, applicationIds);

  const summaries = new Map<
    string,
    { accepted: number; invited: number; total: number }
  >();
  for (const row of memberRows) {
    const key = row.applicationId.toString();
    const current = summaries.get(key) ?? { accepted: 0, invited: 0, total: 0 };
    current.total += 1;
    if (row.status === "ACCEPTED") current.accepted += 1;
    if (row.status === "INVITED") current.invited += 1;
    summaries.set(key, current);
  }

  return rows.map((row) => {
    const key = row.id.toString();
    const summary = summaries.get(key) ?? { accepted: 0, invited: 0, total: 0 };
    return {
      challengeSlug: row.challengeSlug,
      challengeTitle: row.challengeTitle,
      memberSummary: {
        accepted: summary.accepted,
        invited: summary.invited,
        leaderName: leaderNames.get(key) ?? null,
        total: summary.total,
      },
      publicId: row.publicId,
      status: row.status,
      submittedAt: row.submittedAt,
      teamName: row.teamName,
    };
  });
}

async function leaderNamesFor(database: PartnerQueryDatabase, applicationIds: bigint[]) {
  const { users } = await import("@/db/schema");
  const rows = await database
    .select({
      applicationId: applicationMembers.applicationId,
      fullName: users.fullName,
    })
    .from(applicationMembers)
    .innerJoin(users, eq(users.id, applicationMembers.studentId))
    .where(
      and(
        inArray(applicationMembers.applicationId, applicationIds),
        eq(applicationMembers.memberRole, "LEADER")
      )
    );

  return new Map(rows.map((row) => [row.applicationId.toString(), row.fullName]));
}
