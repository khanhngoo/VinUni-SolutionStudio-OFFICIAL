import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  challengeEligibilityRules,
  challenges,
  organizationMemberships,
  organizations,
  projects,
  studentProfiles,
  users,
} from "@/db/schema";
import type {
  ApplicationMemberRole,
  ApplicationMemberStatus,
  ApplicationStatus,
  ChallengeStatus,
  MembershipRole,
  MembershipStatus,
} from "@/db/queries/applications";
import type { ChallengeEligibilityRuleRead } from "@/db/queries/challenges";

export type ApplicationMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ApplicationWriteActorMembership {
  organizationId: bigint;
  organizationName: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface ApplicationWriteActorRecord {
  email: string;
  fullName: string;
  isStudent: boolean;
  memberships: ApplicationWriteActorMembership[];
  userId: bigint;
}

export interface ApplicationWriteChallenge {
  applicationDeadline: Date | null;
  id: bigint;
  managingOrganizationId: bigint;
  ownerOrganizationId: bigint;
  slug: string | null;
  status: ChallengeStatus;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
}

export interface ApplicationWriteSubject {
  challengeId: bigint;
  id: bigint;
  managingOrganizationId: bigint;
  ownerOrganizationId: bigint;
  publicId: string;
  status: ApplicationStatus;
  submittedBy: bigint;
}

export interface ApplicationWriteMember {
  applicationId: bigint;
  memberRole: ApplicationMemberRole;
  status: ApplicationMemberStatus;
  studentId: bigint;
}

export interface StudentApplicationProfile {
  activeProjectCount: number;
  availableHoursPerWeek: number | null;
  email: string;
  fullName: string;
  gpa: number | null;
  gpaScale: number | null;
  major: string | null;
  school: string | null;
  studyYear: number | null;
  userId: bigint;
}

export interface ApplicationInsertValues {
  challengeId: bigint;
  motivation?: string | null;
  publicId?: string;
  relevantExperience?: string | null;
  status: ApplicationStatus;
  submittedAt: Date;
  submittedBy: bigint;
  teamName?: string | null;
}

export interface ApplicationMemberInsertValues {
  applicationId: bigint;
  availabilityConfirmed?: boolean | null;
  committedHoursPerWeek?: number | null;
  invitedAt?: Date | null;
  memberRole: ApplicationMemberRole;
  preferredRole?: string | null;
  respondedAt?: Date | null;
  status: ApplicationMemberStatus;
  studentId: bigint;
}

export async function getApplicationWriteActorByEmail(
  database: ApplicationMutationDatabase,
  email: string
): Promise<ApplicationWriteActorRecord | null> {
  const [actor] = await database
    .select({
      email: users.email,
      fullName: users.fullName,
      isStudent: sql<boolean>`${studentProfiles.userId} IS NOT NULL`,
      userId: users.id,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(users.email, email))
    .limit(1);

  if (!actor) return null;

  const memberships = await database
    .select({
      organizationId: organizationMemberships.organizationId,
      organizationName: organizations.name,
      role: organizationMemberships.role,
      status: sql<MembershipStatus>`coalesce(${organizationMemberships.status}, 'ACTIVE')`,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(eq(organizationMemberships.userId, actor.userId));

  return {
    ...actor,
    memberships,
  };
}

export async function getApplicationWriteChallengeBySlug(
  database: ApplicationMutationDatabase,
  slug: string
): Promise<ApplicationWriteChallenge | null> {
  const [challenge] = await database
    .select({
      applicationDeadline: challenges.applicationDeadline,
      id: challenges.id,
      managingOrganizationId: challenges.managingOrganizationId,
      ownerOrganizationId: challenges.ownerOrganizationId,
      slug: challenges.slug,
      status: sql<ChallengeStatus>`coalesce(${challenges.status}, 'DRAFT')`,
      teamSizeMax: challenges.teamSizeMax,
      teamSizeMin: challenges.teamSizeMin,
      title: challenges.title,
    })
    .from(challenges)
    .where(eq(challenges.slug, slug.trim()))
    .limit(1);

  return challenge ?? null;
}

export async function getApplicationWriteSubjectByPublicId(
  database: ApplicationMutationDatabase,
  publicId: string
): Promise<ApplicationWriteSubject | null> {
  const [application] = await database
    .select({
      challengeId: applications.challengeId,
      id: applications.id,
      managingOrganizationId: challenges.managingOrganizationId,
      ownerOrganizationId: challenges.ownerOrganizationId,
      publicId: applications.publicId,
      status: sql<ApplicationStatus>`coalesce(${applications.status}, 'SUBMITTED')`,
      submittedBy: applications.submittedBy,
    })
    .from(applications)
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(applications.publicId, publicId))
    .limit(1);

  return application ?? null;
}

export async function selectApplicationMembers(
  database: ApplicationMutationDatabase,
  applicationId: bigint
): Promise<ApplicationWriteMember[]> {
  return database
    .select({
      applicationId: applicationMembers.applicationId,
      memberRole: applicationMembers.memberRole,
      status: sql<ApplicationMemberStatus>`coalesce(${applicationMembers.status}, 'INVITED')`,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .where(eq(applicationMembers.applicationId, applicationId));
}

export async function selectStudentProfilesByEmails(
  database: ApplicationMutationDatabase,
  emails: string[]
): Promise<StudentApplicationProfile[]> {
  if (emails.length === 0) return [];

  const normalized = emails.map(normalizeEmail);

  const rows = await database
    .select({
      activeProjectCount: sql<number>`count(distinct ${projects.id})::int`,
      availableHoursPerWeek: studentProfiles.availableHoursPerWeek,
      email: users.email,
      fullName: users.fullName,
      gpa: studentProfiles.gpa,
      gpaScale: studentProfiles.gpaScale,
      major: studentProfiles.major,
      school: studentProfiles.school,
      studyYear: studentProfiles.studyYear,
      userId: users.id,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(
      applicationMembers,
      eq(applicationMembers.studentId, users.id)
    )
    .leftJoin(
      projects,
      and(
        eq(projects.applicationId, applicationMembers.applicationId),
        inArray(projects.status, ["ACTIVE", "FINAL_REVIEW"])
      )
    )
    .where(inArray(sql<string>`lower(${users.email})`, normalized))
    .groupBy(
      users.id,
      users.email,
      users.fullName,
      studentProfiles.userId,
      studentProfiles.availableHoursPerWeek,
      studentProfiles.gpa,
      studentProfiles.gpaScale,
      studentProfiles.major,
      studentProfiles.school,
      studentProfiles.studyYear
    );

  return rows.map((row) => ({
    ...row,
    gpa: decimalToNumber(row.gpa),
    gpaScale: decimalToNumber(row.gpaScale),
  }));
}

export async function selectStudentProfileByUserId(
  database: ApplicationMutationDatabase,
  userId: bigint
): Promise<StudentApplicationProfile | null> {
  const [user] = await database
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const [profile] = await selectStudentProfilesByEmails(database, [user.email]);
  return profile ?? null;
}

export async function selectChallengeEligibilityRulesForWrite(
  database: ApplicationMutationDatabase,
  challengeId: bigint
): Promise<ChallengeEligibilityRuleRead[]> {
  return database
    .select({
      config:
        sql<ChallengeEligibilityRuleRead["config"]>`${challengeEligibilityRules.config}`,
      required: sql<boolean>`coalesce(${challengeEligibilityRules.required}, true)`,
      ruleType: challengeEligibilityRules.ruleType,
    })
    .from(challengeEligibilityRules)
    .where(eq(challengeEligibilityRules.challengeId, challengeId));
}

export async function findDuplicateApplicationMemberships(
  database: ApplicationMutationDatabase,
  challengeId: bigint,
  studentIds: bigint[]
) {
  if (studentIds.length === 0) return [];

  return database
    .select({
      applicationPublicId: applications.publicId,
      status: applications.status,
      studentId: applicationMembers.studentId,
    })
    .from(applicationMembers)
    .innerJoin(applications, eq(applications.id, applicationMembers.applicationId))
    .where(
      and(
        eq(applications.challengeId, challengeId),
        inArray(applicationMembers.studentId, studentIds),
        ne(applications.status, "WITHDRAWN"),
        ne(applications.status, "REJECTED")
      )
    );
}

export async function insertApplication(
  database: ApplicationMutationDatabase,
  values: ApplicationInsertValues
) {
  const [application] = await database
    .insert(applications)
    .values({
      challengeId: values.challengeId,
      motivation: values.motivation ?? null,
      publicId: values.publicId,
      relevantExperience: values.relevantExperience ?? null,
      status: values.status,
      submittedAt: values.submittedAt,
      submittedBy: values.submittedBy,
      teamName: values.teamName ?? null,
    })
    .returning({
      id: applications.id,
      publicId: applications.publicId,
      status: applications.status,
    });

  return application;
}

export async function insertApplicationMembers(
  database: ApplicationMutationDatabase,
  values: ApplicationMemberInsertValues[]
) {
  if (values.length === 0) return [];

  return database
    .insert(applicationMembers)
    .values(
      values.map((value) => ({
        applicationId: value.applicationId,
        availabilityConfirmed: value.availabilityConfirmed ?? null,
        committedHoursPerWeek: value.committedHoursPerWeek ?? null,
        invitedAt: value.invitedAt ?? null,
        memberRole: value.memberRole,
        preferredRole: value.preferredRole ?? null,
        respondedAt: value.respondedAt ?? null,
        status: value.status,
        studentId: value.studentId,
      }))
    )
    .returning({
      applicationId: applicationMembers.applicationId,
      id: applicationMembers.id,
      memberRole: applicationMembers.memberRole,
      status: applicationMembers.status,
      studentId: applicationMembers.studentId,
    });
}

export async function updateApplicationStatus(
  database: ApplicationMutationDatabase,
  applicationId: bigint,
  expectedStatuses: ApplicationStatus[],
  nextStatus: ApplicationStatus
) {
  const [application] = await database
    .update(applications)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(applications.id, applicationId),
        inArray(applications.status, expectedStatuses)
      )
    )
    .returning({
      id: applications.id,
      publicId: applications.publicId,
      status: applications.status,
    });

  return application ?? null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
