import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  applicationMembers,
  applications,
  assessmentAttempts,
  assessmentScores,
  assessments,
  challenges,
  facultyProfiles,
  offers,
  organizationMemberships,
  organizations,
  projects,
  selections,
  studentProfiles,
  supervisionRequests,
  users,
} from "@/db/schema";

export type ApplicationQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

type ApplicationRow = typeof applications.$inferSelect;
type ApplicationMemberRow = typeof applicationMembers.$inferSelect;
type ChallengeRow = typeof challenges.$inferSelect;
type OfferRow = typeof offers.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type SupervisionRequestRow = typeof supervisionRequests.$inferSelect;
type OrganizationMembershipRow = typeof organizationMemberships.$inferSelect;

export type ApplicationStatus = NonNullable<ApplicationRow["status"]>;
export type ApplicationMemberRole = ApplicationMemberRow["memberRole"];
export type ApplicationMemberStatus = NonNullable<ApplicationMemberRow["status"]>;
export type ChallengeStatus = NonNullable<ChallengeRow["status"]>;
export type OfferStatus = NonNullable<OfferRow["status"]>;
export type ProjectStatus = NonNullable<ProjectRow["status"]>;
export type SupervisionRequestStatus = NonNullable<
  SupervisionRequestRow["status"]
>;
export type MembershipRole = OrganizationMembershipRow["role"];
export type MembershipStatus = NonNullable<OrganizationMembershipRow["status"]>;

export interface ApplicationOrganizationRead {
  id: bigint;
  industry: string | null;
  name: string;
  organizationType: "INTERNAL_UNIT" | "EXTERNAL_PARTNER";
}

export interface ApplicationChallengeRead {
  applicationDeadline: Date | null;
  id: bigint;
  ownerOrganizationId: bigint;
  managingOrganizationId: bigint;
  ownerOrganization: ApplicationOrganizationRead;
  managingOrganization: ApplicationOrganizationRead;
  publicId: string;
  slug: string;
  status: ChallengeStatus;
  summary: string;
  teamSizeMax: number | null;
  teamSizeMin: number | null;
  title: string;
  weeklyHours: number | null;
}

export interface ApplicationSubmitterRead {
  email: string;
  fullName: string;
  userId: bigint;
}

export interface ApplicationMemberRead {
  availabilityConfirmed: boolean | null;
  committedHoursPerWeek: number | null;
  email: string;
  fullName: string;
  invitedAt: Date | null;
  memberId: bigint;
  memberRole: ApplicationMemberRole;
  preferredRole: string | null;
  respondedAt: Date | null;
  status: ApplicationMemberStatus;
  student: {
    availableHoursPerWeek: number | null;
    gpa: number | null;
    gpaScale: number | null;
    major: string | null;
    school: string | null;
    studyYear: number | null;
    userId: bigint;
  };
}

export interface ApplicationMemberSummary {
  accepted: number;
  invited: number;
  leaderName: string | null;
  total: number;
}

export interface ApplicationAssessmentSummary {
  assessmentTitle: string | null;
  attemptStatus: string;
  overallBand: string | null;
  submittedAt: Date | null;
}

export interface ApplicationOfferSummary {
  compensationNote: string | null;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  ndaRequired: boolean;
  offerStatus: OfferStatus | null;
  respondBy: Date | null;
  respondedAt: Date | null;
  selectedAt: Date | null;
  startDate: string | null;
}

export interface ApplicationProjectSummary {
  publicId: string;
  status: ProjectStatus;
}

export interface ApplicationSupervisionRequestRead {
  comments: string | null;
  faculty: {
    academicTitle: string | null;
    department: string | null;
    fullName: string;
    userId: bigint;
  };
  requestedAt: Date | null;
  respondBy: Date | null;
  respondedAt: Date | null;
  status: SupervisionRequestStatus;
}

export interface ApplicationListItemRead {
  challenge: ApplicationChallengeRead;
  createdAt: Date | null;
  id: bigint;
  memberSummary: ApplicationMemberSummary;
  publicId: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  submittedBy: ApplicationSubmitterRead;
  teamName: string | null;
  updatedAt: Date | null;
}

export interface ApplicationDetailRead extends ApplicationListItemRead {
  assessmentSummaries: ApplicationAssessmentSummary[];
  members: ApplicationMemberRead[];
  motivation: string | null;
  offerSummary: ApplicationOfferSummary | null;
  projectSummary: ApplicationProjectSummary | null;
  relevantExperience: string | null;
  supervisionRequests: ApplicationSupervisionRequestRead[];
}

interface BaseApplicationRow {
  applicationDeadline: Date | null;
  challengeId: bigint;
  challengePublicId: string;
  challengeSlug: string | null;
  challengeStatus: ChallengeStatus;
  challengeSummary: string;
  challengeTeamSizeMax: number | null;
  challengeTeamSizeMin: number | null;
  challengeTitle: string;
  challengeWeeklyHours: number | null;
  createdAt: Date | null;
  id: bigint;
  managingOrganizationId: bigint;
  managingOrganizationIndustry: string | null;
  managingOrganizationName: string;
  managingOrganizationType: "INTERNAL_UNIT" | "EXTERNAL_PARTNER";
  motivation: string | null;
  ownerOrganizationId: bigint;
  ownerOrganizationIndustry: string | null;
  ownerOrganizationName: string;
  ownerOrganizationType: "INTERNAL_UNIT" | "EXTERNAL_PARTNER";
  publicId: string;
  relevantExperience: string | null;
  status: ApplicationStatus;
  submittedAt: Date | null;
  submittedByEmail: string;
  submittedByFullName: string;
  submittedByUserId: bigint;
  teamName: string | null;
  updatedAt: Date | null;
}

export async function listApplicationsForStudent(
  database: ApplicationQueryDatabase,
  studentUserId: bigint
): Promise<ApplicationListItemRead[]> {
  const base = await selectBaseApplications(database, {
    studentUserId,
  });

  return hydrateApplicationList(database, base);
}

/**
 * Every application a student holds, with the offer, assessment and project
 * summaries attached. The hub needs those to work out what stage each one is
 * at; `hydrateApplicationDetails` batches them, so this costs the same handful
 * of queries whether the student holds one application or twenty.
 */
export async function listApplicationDetailsForStudent(
  database: ApplicationQueryDatabase,
  studentUserId: bigint
): Promise<ApplicationDetailRead[]> {
  const base = await selectBaseApplications(database, { studentUserId });
  return hydrateApplicationDetails(database, base);
}

export async function listApplicationsForChallenge(
  database: ApplicationQueryDatabase,
  challengeSlug: string
): Promise<ApplicationListItemRead[]> {
  const base = await selectBaseApplications(database, {
    challengeSlug,
  });

  return hydrateApplicationList(database, base);
}

export async function getApplicationByPublicId(
  database: ApplicationQueryDatabase,
  publicId: string
): Promise<ApplicationDetailRead | null> {
  const base = await selectBaseApplications(database, { publicId });
  const [detail] = await hydrateApplicationDetails(database, base);
  return detail ?? null;
}

export async function getApplicationByChallengeAndStudent(
  database: ApplicationQueryDatabase,
  challengeSlug: string,
  studentUserId: bigint
): Promise<ApplicationDetailRead | null> {
  const base = await selectBaseApplications(database, {
    challengeSlug,
    studentUserId,
  });
  const [detail] = await hydrateApplicationDetails(database, base);
  return detail ?? null;
}

export async function countApplicationsForChallenge(
  database: ApplicationQueryDatabase,
  challengeId: bigint
) {
  const [row] = await database
    .select({ total: count() })
    .from(applications)
    .where(eq(applications.challengeId, challengeId));

  return row?.total ?? 0;
}

async function selectBaseApplications(
  database: ApplicationQueryDatabase,
  filters: {
    challengeSlug?: string;
    publicId?: string;
    studentUserId?: bigint;
  }
): Promise<BaseApplicationRow[]> {
  const ownerOrganization = alias(organizations, "application_owner_org");
  const managingOrganization = alias(organizations, "application_manager_org");
  const submittedByUser = alias(users, "application_submitter");

  const conditions = [];
  if (filters.publicId) conditions.push(eq(applications.publicId, filters.publicId));
  if (filters.challengeSlug) {
    conditions.push(eq(challenges.slug, filters.challengeSlug.trim()));
  }
  if (filters.studentUserId) {
    conditions.push(eq(applicationMembers.studentId, filters.studentUserId));
  }

  const rows = await database
    .select({
      applicationDeadline: challenges.applicationDeadline,
      challengeId: challenges.id,
      challengePublicId: challenges.publicId,
      challengeSlug: challenges.slug,
      challengeStatus: sql<ChallengeStatus>`coalesce(${challenges.status}, 'DRAFT')`,
      challengeSummary: challenges.summary,
      challengeTeamSizeMax: challenges.teamSizeMax,
      challengeTeamSizeMin: challenges.teamSizeMin,
      challengeTitle: challenges.title,
      challengeWeeklyHours: challenges.weeklyHours,
      createdAt: applications.createdAt,
      id: applications.id,
      managingOrganizationId: managingOrganization.id,
      managingOrganizationIndustry: managingOrganization.industry,
      managingOrganizationName: managingOrganization.name,
      managingOrganizationType: managingOrganization.organizationType,
      motivation: applications.motivation,
      ownerOrganizationId: ownerOrganization.id,
      ownerOrganizationIndustry: ownerOrganization.industry,
      ownerOrganizationName: ownerOrganization.name,
      ownerOrganizationType: ownerOrganization.organizationType,
      publicId: applications.publicId,
      relevantExperience: applications.relevantExperience,
      status: sql<ApplicationStatus>`coalesce(${applications.status}, 'SUBMITTED')`,
      submittedAt: applications.submittedAt,
      submittedByEmail: submittedByUser.email,
      submittedByFullName: submittedByUser.fullName,
      submittedByUserId: submittedByUser.id,
      teamName: applications.teamName,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .innerJoin(
      ownerOrganization,
      eq(ownerOrganization.id, challenges.ownerOrganizationId)
    )
    .innerJoin(
      managingOrganization,
      eq(managingOrganization.id, challenges.managingOrganizationId)
    )
    .innerJoin(submittedByUser, eq(submittedByUser.id, applications.submittedBy))
    .leftJoin(
      applicationMembers,
      eq(applicationMembers.applicationId, applications.id)
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(applications.submittedAt);

  return dedupeBaseRows(rows);
}

async function hydrateApplicationList(
  database: ApplicationQueryDatabase,
  base: BaseApplicationRow[]
): Promise<ApplicationListItemRead[]> {
  const members = await selectMembers(database, base.map((row) => row.id));
  return base.map((row) => toListItem(row, members.get(row.id) ?? []));
}

async function hydrateApplicationDetails(
  database: ApplicationQueryDatabase,
  base: BaseApplicationRow[]
): Promise<ApplicationDetailRead[]> {
  const applicationIds = base.map((row) => row.id);
  const members = await selectMembers(database, applicationIds);
  const supervision = await selectSupervisionRequests(database, applicationIds);
  const assessmentsByApplication = await selectAssessmentSummaries(
    database,
    applicationIds
  );
  const offersByApplication = await selectOfferSummaries(database, applicationIds);
  const projectsByApplication = await selectProjectSummaries(
    database,
    applicationIds
  );

  return base.map((row) => ({
    ...toListItem(row, members.get(row.id) ?? []),
    assessmentSummaries: assessmentsByApplication.get(row.id) ?? [],
    members: members.get(row.id) ?? [],
    motivation: row.motivation,
    offerSummary: offersByApplication.get(row.id) ?? null,
    projectSummary: projectsByApplication.get(row.id) ?? null,
    relevantExperience: row.relevantExperience,
    supervisionRequests: supervision.get(row.id) ?? [],
  }));
}

async function selectMembers(
  database: ApplicationQueryDatabase,
  applicationIds: bigint[]
) {
  const grouped = new Map<bigint, ApplicationMemberRead[]>();
  if (applicationIds.length === 0) return grouped;

  const rows = await database
    .select({
      applicationId: applicationMembers.applicationId,
      availabilityConfirmed: applicationMembers.availabilityConfirmed,
      availableHoursPerWeek: studentProfiles.availableHoursPerWeek,
      committedHoursPerWeek: applicationMembers.committedHoursPerWeek,
      email: users.email,
      fullName: users.fullName,
      gpa: studentProfiles.gpa,
      gpaScale: studentProfiles.gpaScale,
      invitedAt: applicationMembers.invitedAt,
      major: studentProfiles.major,
      memberId: applicationMembers.id,
      memberRole: applicationMembers.memberRole,
      preferredRole: applicationMembers.preferredRole,
      respondedAt: applicationMembers.respondedAt,
      school: studentProfiles.school,
      status: sql<ApplicationMemberStatus>`coalesce(${applicationMembers.status}, 'INVITED')`,
      studentId: studentProfiles.userId,
      studyYear: studentProfiles.studyYear,
    })
    .from(applicationMembers)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, applicationMembers.studentId))
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(inArray(applicationMembers.applicationId, applicationIds))
    .orderBy(applicationMembers.memberRole, applicationMembers.createdAt);

  for (const row of rows) {
    const list = grouped.get(row.applicationId) ?? [];
    list.push({
      availabilityConfirmed: row.availabilityConfirmed,
      committedHoursPerWeek: row.committedHoursPerWeek,
      email: row.email,
      fullName: row.fullName,
      invitedAt: row.invitedAt,
      memberId: row.memberId,
      memberRole: row.memberRole,
      preferredRole: row.preferredRole,
      respondedAt: row.respondedAt,
      status: row.status,
      student: {
        availableHoursPerWeek: row.availableHoursPerWeek,
        gpa: row.gpa,
        gpaScale: row.gpaScale,
        major: row.major,
        school: row.school,
        studyYear: row.studyYear,
        userId: row.studentId,
      },
    });
    grouped.set(row.applicationId, list);
  }

  return grouped;
}

async function selectSupervisionRequests(
  database: ApplicationQueryDatabase,
  applicationIds: bigint[]
) {
  const grouped = new Map<bigint, ApplicationSupervisionRequestRead[]>();
  if (applicationIds.length === 0) return grouped;

  const rows = await database
    .select({
      academicTitle: facultyProfiles.academicTitle,
      applicationId: supervisionRequests.applicationId,
      comments: supervisionRequests.comments,
      department: facultyProfiles.department,
      facultyId: facultyProfiles.userId,
      fullName: users.fullName,
      requestedAt: supervisionRequests.requestedAt,
      respondBy: supervisionRequests.respondBy,
      respondedAt: supervisionRequests.respondedAt,
      status: sql<SupervisionRequestStatus>`coalesce(${supervisionRequests.status}, 'PENDING')`,
    })
    .from(supervisionRequests)
    .innerJoin(facultyProfiles, eq(facultyProfiles.userId, supervisionRequests.facultyId))
    .innerJoin(users, eq(users.id, facultyProfiles.userId))
    .where(inArray(supervisionRequests.applicationId, applicationIds))
    .orderBy(supervisionRequests.requestedAt);

  for (const row of rows) {
    const list = grouped.get(row.applicationId) ?? [];
    list.push({
      comments: row.comments,
      faculty: {
        academicTitle: row.academicTitle,
        department: row.department,
        fullName: row.fullName,
        userId: row.facultyId,
      },
      requestedAt: row.requestedAt,
      respondBy: row.respondBy,
      respondedAt: row.respondedAt,
      status: row.status,
    });
    grouped.set(row.applicationId, list);
  }

  return grouped;
}

async function selectAssessmentSummaries(
  database: ApplicationQueryDatabase,
  applicationIds: bigint[]
) {
  const grouped = new Map<bigint, ApplicationAssessmentSummary[]>();
  if (applicationIds.length === 0) return grouped;

  const rows = await database
    .select({
      applicationId: assessmentAttempts.applicationId,
      assessmentTitle: assessments.title,
      attemptStatus: assessmentAttempts.status,
      rubricScores: assessmentScores.rubricScores,
      submittedAt: assessmentAttempts.submittedAt,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .leftJoin(assessmentScores, eq(assessmentScores.attemptId, assessmentAttempts.id))
    .where(inArray(assessmentAttempts.applicationId, applicationIds))
    .orderBy(assessmentAttempts.submittedAt);

  for (const row of rows) {
    const list = grouped.get(row.applicationId) ?? [];
    list.push({
      assessmentTitle: row.assessmentTitle,
      attemptStatus: row.attemptStatus ?? "NOT_STARTED",
      overallBand: overallBandFromRubric(row.rubricScores),
      submittedAt: row.submittedAt,
    });
    grouped.set(row.applicationId, list);
  }

  return grouped;
}

async function selectOfferSummaries(
  database: ApplicationQueryDatabase,
  applicationIds: bigint[]
) {
  const grouped = new Map<bigint, ApplicationOfferSummary>();
  if (applicationIds.length === 0) return grouped;

  const rows = await database
    .select({
      applicationId: selections.applicationId,
      compensationNote: offers.compensationNote,
      durationWeeks: offers.durationWeeks,
      hoursPerWeek: offers.hoursPerWeek,
      ndaRequired: offers.ndaRequired,
      offerStatus: offers.status,
      respondBy: offers.respondBy,
      respondedAt: offers.respondedAt,
      selectedAt: selections.selectedAt,
      startDate: offers.startDate,
    })
    .from(selections)
    .leftJoin(offers, eq(offers.selectionId, selections.id))
    .where(inArray(selections.applicationId, applicationIds));

  for (const row of rows) {
    grouped.set(row.applicationId, {
      compensationNote: row.compensationNote,
      durationWeeks: row.durationWeeks,
      hoursPerWeek: row.hoursPerWeek,
      ndaRequired: row.ndaRequired ?? false,
      offerStatus: row.offerStatus,
      respondBy: row.respondBy,
      respondedAt: row.respondedAt,
      selectedAt: row.selectedAt,
      startDate: row.startDate,
    });
  }

  return grouped;
}

async function selectProjectSummaries(
  database: ApplicationQueryDatabase,
  applicationIds: bigint[]
) {
  const grouped = new Map<bigint, ApplicationProjectSummary>();
  if (applicationIds.length === 0) return grouped;

  const rows = await database
    .select({
      applicationId: projects.applicationId,
      publicId: projects.publicId,
      status: sql<ProjectStatus>`coalesce(${projects.status}, 'ACTIVE')`,
    })
    .from(projects)
    .where(inArray(projects.applicationId, applicationIds));

  for (const row of rows) {
    grouped.set(row.applicationId, {
      publicId: row.publicId,
      status: row.status,
    });
  }

  return grouped;
}

function toListItem(
  row: BaseApplicationRow,
  members: ApplicationMemberRead[]
): ApplicationListItemRead {
  return {
    challenge: {
      applicationDeadline: row.applicationDeadline,
      id: row.challengeId,
      managingOrganization: {
        id: row.managingOrganizationId,
        industry: row.managingOrganizationIndustry,
        name: row.managingOrganizationName,
        organizationType: row.managingOrganizationType,
      },
      managingOrganizationId: row.managingOrganizationId,
      ownerOrganization: {
        id: row.ownerOrganizationId,
        industry: row.ownerOrganizationIndustry,
        name: row.ownerOrganizationName,
        organizationType: row.ownerOrganizationType,
      },
      ownerOrganizationId: row.ownerOrganizationId,
      publicId: row.challengePublicId,
      slug: row.challengeSlug ?? "",
      status: row.challengeStatus,
      summary: row.challengeSummary,
      teamSizeMax: row.challengeTeamSizeMax,
      teamSizeMin: row.challengeTeamSizeMin,
      title: row.challengeTitle,
      weeklyHours: row.challengeWeeklyHours,
    },
    createdAt: row.createdAt,
    id: row.id,
    memberSummary: summarizeMembers(members),
    publicId: row.publicId,
    status: row.status,
    submittedAt: row.submittedAt,
    submittedBy: {
      email: row.submittedByEmail,
      fullName: row.submittedByFullName,
      userId: row.submittedByUserId,
    },
    teamName: row.teamName,
    updatedAt: row.updatedAt,
  };
}

function summarizeMembers(members: ApplicationMemberRead[]): ApplicationMemberSummary {
  return {
    accepted: members.filter((member) => member.status === "ACCEPTED").length,
    invited: members.filter((member) => member.status === "INVITED").length,
    leaderName:
      members.find((member) => member.memberRole === "LEADER")?.fullName ?? null,
    total: members.length,
  };
}

function dedupeBaseRows(rows: BaseApplicationRow[]) {
  const byApplication = new Map<string, BaseApplicationRow>();
  for (const row of rows) {
    byApplication.set(row.id.toString(), row);
  }
  return Array.from(byApplication.values());
}

function overallBandFromRubric(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const band = (value as { sourceOverallBand?: unknown }).sourceOverallBand;
  return typeof band === "string" ? band : null;
}

export interface PendingInvitationRead {
  applicationPublicId: string;
  challengeTitle: string;
  invitedAt: Date | null;
  leaderName: string | null;
  ownerOrganizationName: string;
  teamName: string | null;
}

/**
 * Team invitations this student has not answered.
 *
 * Their own seat only, matched on the student id rather than anything in a
 * URL, so this is the list of things they personally owe an answer to.
 */
export async function listPendingTeamInvitations(
  database: ApplicationQueryDatabase,
  studentId: bigint
): Promise<PendingInvitationRead[]> {
  const leader = alias(users, "invitation_leader");
  const leaderMember = alias(applicationMembers, "invitation_leader_member");

  return database
    .select({
      applicationPublicId: applications.publicId,
      challengeTitle: challenges.title,
      invitedAt: applicationMembers.invitedAt,
      leaderName: leader.fullName,
      ownerOrganizationName: organizations.name,
      teamName: applications.teamName,
    })
    .from(applicationMembers)
    .innerJoin(applications, eq(applications.id, applicationMembers.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .innerJoin(organizations, eq(organizations.id, challenges.ownerOrganizationId))
    .leftJoin(
      leaderMember,
      and(
        eq(leaderMember.applicationId, applications.id),
        eq(leaderMember.memberRole, "LEADER")
      )
    )
    .leftJoin(leader, eq(leader.id, leaderMember.studentId))
    .where(
      and(
        eq(applicationMembers.studentId, studentId),
        eq(applicationMembers.status, "INVITED")
      )
    )
    .orderBy(desc(applicationMembers.invitedAt));
}
