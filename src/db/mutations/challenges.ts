import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  challengeEligibilityRules,
  challengeFacultyAssignments,
  challengeReviews,
  challengeSkills,
  challenges,
  facultyProfiles,
  organizationMemberships,
  organizations,
  skills,
  users,
} from "@/db/schema";

export type ChallengeMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ChallengeRow = typeof challenges.$inferSelect;
export type ChallengeInsert = typeof challenges.$inferInsert;
export type ChallengeUpdate = Partial<
  Pick<
    ChallengeInsert,
    | "applicationDeadline"
    | "compensationDescription"
    | "compensationType"
    | "confidentialityLevel"
    | "contactPersonId"
    | "description"
    | "domain"
    | "durationWeeks"
    | "expectedDeliverables"
    | "startDate"
    | "subtype"
    | "summary"
    | "teamSizeMax"
    | "teamSizeMin"
    | "title"
    | "visibility"
    | "weeklyHours"
    | "workMode"
  >
>;

export type ChallengeStatus = NonNullable<ChallengeRow["status"]>;
export type ChallengeVisibility = NonNullable<ChallengeRow["visibility"]>;
export type CompensationType = NonNullable<ChallengeRow["compensationType"]>;
export type WorkMode = NonNullable<ChallengeRow["workMode"]>;
export type SkillRequirementType =
  typeof challengeSkills.$inferSelect["requirementType"];
export type EligibilityRuleType =
  typeof challengeEligibilityRules.$inferSelect["ruleType"];
export type ReviewDecision = typeof challengeReviews.$inferSelect["decision"];
export type FacultyAssignmentStatus =
  typeof challengeFacultyAssignments.$inferSelect["status"];
export type MembershipRole = typeof organizationMemberships.$inferSelect["role"];
export type MembershipStatus =
  typeof organizationMemberships.$inferSelect["status"];
export type OrganizationType = typeof organizations.$inferSelect["organizationType"];

export interface ChallengeWriteSubject {
  id: bigint;
  managingOrganizationId: bigint;
  managingOrganizationType: OrganizationType;
  ownerOrganizationId: bigint;
  ownerOrganizationType: OrganizationType;
  slug: string | null;
  status: ChallengeStatus;
  title: string;
}

export interface ChallengeWriteOrganization {
  id: bigint;
  name: string;
  organizationType: OrganizationType;
}

export interface ChallengeWriteActorMembership {
  organizationId: bigint;
  organizationName: string;
  organizationType: OrganizationType;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface ChallengeWriteActorRecord {
  email: string;
  fullName: string;
  memberships: ChallengeWriteActorMembership[];
  userId: bigint;
}

export interface SkillLookupRow {
  canonicalName: string;
  id: bigint;
}

export interface FacultyLookupRow {
  fullName: string;
  userId: bigint;
}

export interface ChallengeSkillInsert {
  requirementType: SkillRequirementType;
  skillId: bigint;
  weight?: number;
}

export interface ChallengeEligibilityRuleInsert {
  config: Record<string, unknown>;
  required: boolean;
  ruleType: EligibilityRuleType;
}

export interface ChallengeFacultyAssignmentInsert {
  comments?: string | null;
  facultyId: bigint;
  status?: FacultyAssignmentStatus;
}

export async function getChallengeWriteActorByEmail(
  database: ChallengeMutationDatabase,
  email: string
): Promise<ChallengeWriteActorRecord | null> {
  const [actor] = await database
    .select({
      email: users.email,
      fullName: users.fullName,
      userId: users.id,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!actor) return null;

  const memberships = await database
    .select({
      organizationId: organizationMemberships.organizationId,
      organizationName: organizations.name,
      organizationType: organizations.organizationType,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
    })
    .from(organizationMemberships)
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMemberships.organizationId)
    )
    .where(eq(organizationMemberships.userId, actor.userId));

  return {
    ...actor,
    memberships,
  };
}

export async function getChallengeWriteOrganizationById(
  database: ChallengeMutationDatabase,
  organizationId: bigint
): Promise<ChallengeWriteOrganization | null> {
  const [organization] = await database
    .select({
      id: organizations.id,
      name: organizations.name,
      organizationType: organizations.organizationType,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return organization ?? null;
}

export async function getChallengeWriteSubjectBySlug(
  database: ChallengeMutationDatabase,
  slug: string
): Promise<ChallengeWriteSubject | null> {
  const ownerOrganization = alias(organizations, "owner_organization");
  const managingOrganization = alias(
    organizations,
    "managing_organization"
  );

  const [challenge] = await database
    .select({
      id: challenges.id,
      managingOrganizationId: challenges.managingOrganizationId,
      managingOrganizationType: managingOrganization.organizationType,
      ownerOrganizationId: challenges.ownerOrganizationId,
      ownerOrganizationType: ownerOrganization.organizationType,
      slug: challenges.slug,
      status: sql<ChallengeStatus>`coalesce(${challenges.status}, 'DRAFT')`,
      title: challenges.title,
    })
    .from(challenges)
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .where(eq(challenges.slug, slug))
    .limit(1);

  return challenge ?? null;
}

export async function getChallengeWriteSubjectById(
  database: ChallengeMutationDatabase,
  challengeId: bigint
): Promise<ChallengeWriteSubject | null> {
  const ownerOrganization = alias(organizations, "owner_organization");
  const managingOrganization = alias(
    organizations,
    "managing_organization"
  );

  const [challenge] = await database
    .select({
      id: challenges.id,
      managingOrganizationId: challenges.managingOrganizationId,
      managingOrganizationType: managingOrganization.organizationType,
      ownerOrganizationId: challenges.ownerOrganizationId,
      ownerOrganizationType: ownerOrganization.organizationType,
      slug: challenges.slug,
      status: sql<ChallengeStatus>`coalesce(${challenges.status}, 'DRAFT')`,
      title: challenges.title,
    })
    .from(challenges)
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .where(eq(challenges.id, challengeId))
    .limit(1);

  return challenge ?? null;
}

export async function slugExists(
  database: ChallengeMutationDatabase,
  slug: string
) {
  const [row] = await database
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.slug, slug))
    .limit(1);

  return row !== undefined;
}

export async function selectSkillsByCanonicalNames(
  database: ChallengeMutationDatabase,
  canonicalNames: string[]
): Promise<SkillLookupRow[]> {
  if (canonicalNames.length === 0) return [];

  const normalized = canonicalNames.map(normalizeLookupName);

  return database
    .select({
      canonicalName: skills.canonicalName,
      id: skills.id,
    })
    .from(skills)
    .where(
      and(
        inArray(sql<string>`lower(${skills.canonicalName})`, normalized),
        eq(skills.status, "ACTIVE")
      )
    );
}

export async function selectFacultyProfilesByUserIds(
  database: ChallengeMutationDatabase,
  facultyUserIds: bigint[]
): Promise<FacultyLookupRow[]> {
  if (facultyUserIds.length === 0) return [];

  return database
    .select({
      fullName: users.fullName,
      userId: facultyProfiles.userId,
    })
    .from(facultyProfiles)
    .innerJoin(users, eq(users.id, facultyProfiles.userId))
    .where(inArray(facultyProfiles.userId, facultyUserIds));
}

export async function insertChallenge(
  database: ChallengeMutationDatabase,
  values: ChallengeInsert
) {
  const [challenge] = await database
    .insert(challenges)
    .values(values)
    .returning({
      id: challenges.id,
      publicId: challenges.publicId,
      slug: challenges.slug,
      status: challenges.status,
    });

  return challenge;
}

export async function updateChallengeContent(
  database: ChallengeMutationDatabase,
  challengeId: bigint,
  values: ChallengeUpdate
) {
  const [challenge] = await database
    .update(challenges)
    .set({
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId))
    .returning({
      id: challenges.id,
      slug: challenges.slug,
      status: challenges.status,
    });

  return challenge ?? null;
}

export async function updateChallengeStatus(
  database: ChallengeMutationDatabase,
  challengeId: bigint,
  expectedStatuses: ChallengeStatus[],
  nextStatus: ChallengeStatus
) {
  const [challenge] = await database
    .update(challenges)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(challenges.id, challengeId),
        inArray(challenges.status, expectedStatuses)
      )
    )
    .returning({
      id: challenges.id,
      slug: challenges.slug,
      status: challenges.status,
    });

  return challenge ?? null;
}

export async function replaceChallengeSkills(
  database: ChallengeMutationDatabase,
  challengeId: bigint,
  desiredSkills: ChallengeSkillInsert[]
) {
  await database
    .delete(challengeSkills)
    .where(eq(challengeSkills.challengeId, challengeId));

  if (desiredSkills.length === 0) return;

  await database.insert(challengeSkills).values(
    desiredSkills.map((skill) => ({
      challengeId,
      normalizationStatus: "NORMALIZED" as const,
      requirementType: skill.requirementType,
      skillId: skill.skillId,
      weight: skill.weight ?? 1,
    }))
  );
}

export async function replaceChallengeEligibilityRules(
  database: ChallengeMutationDatabase,
  challengeId: bigint,
  desiredRules: ChallengeEligibilityRuleInsert[]
) {
  await database
    .delete(challengeEligibilityRules)
    .where(eq(challengeEligibilityRules.challengeId, challengeId));

  if (desiredRules.length === 0) return;

  await database.insert(challengeEligibilityRules).values(
    desiredRules.map((rule) => ({
      challengeId,
      config: rule.config,
      required: rule.required,
      ruleType: rule.ruleType,
      updatedAt: new Date(),
    }))
  );
}

export async function insertChallengeReview(
  database: ChallengeMutationDatabase,
  values: {
    challengeId: bigint;
    comments?: string | null;
    decision: ReviewDecision;
    reviewerId: bigint;
    reviewerOrganizationId: bigint;
  }
) {
  const [review] = await database
    .insert(challengeReviews)
    .values({
      challengeId: values.challengeId,
      comments: values.comments ?? null,
      decision: values.decision,
      reviewerId: values.reviewerId,
      reviewerOrganizationId: values.reviewerOrganizationId,
    })
    .returning({
      id: challengeReviews.id,
    });

  return review;
}

export async function replaceChallengeFacultyAssignments(
  database: ChallengeMutationDatabase,
  challengeId: bigint,
  assignedBy: bigint,
  assignments: ChallengeFacultyAssignmentInsert[]
) {
  await database
    .delete(challengeFacultyAssignments)
    .where(eq(challengeFacultyAssignments.challengeId, challengeId));

  if (assignments.length === 0) return;

  await database.insert(challengeFacultyAssignments).values(
    assignments.map((assignment) => ({
      assignedAt: new Date(),
      assignedBy,
      challengeId,
      comments: assignment.comments ?? null,
      facultyId: assignment.facultyId,
      status: assignment.status ?? "PENDING",
    }))
  );
}

function normalizeLookupName(value: string) {
  return value.trim().toLowerCase();
}
