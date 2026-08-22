import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  agreements,
  applications,
  challenges,
  deliverables,
  milestoneReviews,
  milestones,
  organizations,
  projectMembers,
  projectResources,
  projects,
  users,
} from "@/db/schema";

export type ProjectQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ProjectCoreRead {
  application: { id: bigint; publicId: string; status: string; teamName: string | null };
  challenge: {
    id: bigint;
    managingOrganizationId: bigint;
    managingOrganizationName: string;
    ownerOrganizationId: bigint;
    ownerOrganizationName: string;
    slug: string;
    title: string;
    weeklyHours: number | null;
  };
  endDate: string | null;
  facultySupervisor: { fullName: string; userId: bigint } | null;
  id: bigint;
  publicId: string;
  startDate: string | null;
  status: "ACTIVE" | "PAUSED" | "FINAL_REVIEW" | "COMPLETED" | "ARCHIVED";
}

export interface ProjectMemberRead {
  fullName: string;
  major: string | null;
  projectRole: string | null;
  studentId: bigint;
  studyYear: number | null;
}

export interface ProjectMilestoneRead {
  deadline: string | null;
  deliverables: Array<{ description: string | null; submittedAt: Date | null; submittedByName: string; title: string | null; type: string | null }>;
  description: string | null;
  id: bigint;
  latestReviews: Array<{ comments: string | null; createdAt: Date | null; decision: string; reviewerName: string; reviewerRole: string }>;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "REVISION_REQUESTED" | "COMPLETED";
  title: string;
}

export interface ProjectResourceRead {
  description: string | null;
  id: bigint;
  requiresAgreement: boolean;
  resourceType: string | null;
  sensitivityLevel: string;
  title: string;
}

export async function listProjectCores(database: ProjectQueryDatabase): Promise<ProjectCoreRead[]> {
  const supervisor = alias(users, "project_supervisor");
  const owner = alias(organizations, "project_owner_organization");
  const managing = alias(organizations, "project_managing_organization");
  const rows = await database
    .select({
      applicationId: applications.id, applicationPublicId: applications.publicId,
      applicationStatus: sql<string>`coalesce(${applications.status}, 'SUBMITTED')`, teamName: applications.teamName,
      endDate: projects.endDate, projectId: projects.id, projectPublicId: projects.publicId,
      projectStatus: sql<ProjectCoreRead["status"]>`coalesce(${projects.status}, 'ACTIVE')`, startDate: projects.startDate,
      supervisorId: supervisor.id, supervisorName: supervisor.fullName,
      managingOrganizationId: challenges.managingOrganizationId, managingOrganizationName: managing.name,
      ownerOrganizationId: challenges.ownerOrganizationId, ownerOrganizationName: owner.name,
      challengeId: challenges.id, challengeSlug: challenges.slug, challengeTitle: challenges.title, weeklyHours: challenges.weeklyHours,
    })
    .from(projects)
    .innerJoin(applications, eq(applications.id, projects.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .innerJoin(owner, eq(owner.id, challenges.ownerOrganizationId))
    .innerJoin(managing, eq(managing.id, challenges.managingOrganizationId))
    .leftJoin(supervisor, eq(supervisor.id, projects.facultySupervisorId))
    .orderBy(asc(projects.startDate), asc(projects.id));
  return rows.filter((row) => row.challengeSlug !== null).map((row) => ({
    application: { id: row.applicationId, publicId: row.applicationPublicId, status: row.applicationStatus, teamName: row.teamName },
    challenge: { id: row.challengeId, managingOrganizationId: row.managingOrganizationId, managingOrganizationName: row.managingOrganizationName, ownerOrganizationId: row.ownerOrganizationId, ownerOrganizationName: row.ownerOrganizationName, slug: row.challengeSlug!, title: row.challengeTitle, weeklyHours: row.weeklyHours },
    endDate: row.endDate, facultySupervisor: row.supervisorId === null ? null : { fullName: row.supervisorName!, userId: row.supervisorId },
    id: row.projectId, publicId: row.projectPublicId, startDate: row.startDate, status: row.projectStatus,
  }));
}

export async function getProjectCoreByApplicationPublicId(database: ProjectQueryDatabase, applicationPublicId: string) {
  const rows = await listProjectCores(database);
  return rows.find((project) => project.application.publicId === applicationPublicId) ?? null;
}

export async function listProjectMembers(database: ProjectQueryDatabase, projectId: bigint): Promise<ProjectMemberRead[]> {
  const { studentProfiles } = await import("@/db/schema");
  return database.select({ fullName: users.fullName, major: studentProfiles.major, projectRole: projectMembers.projectRole, studentId: projectMembers.studentId, studyYear: studentProfiles.studyYear })
    .from(projectMembers).innerJoin(users, eq(users.id, projectMembers.studentId)).innerJoin(studentProfiles, eq(studentProfiles.userId, projectMembers.studentId))
    .where(eq(projectMembers.projectId, projectId)).orderBy(asc(users.fullName));
}

export async function listProjectMilestones(database: ProjectQueryDatabase, projectId: bigint): Promise<ProjectMilestoneRead[]> {
  const rows = await database.select({ deadline: milestones.deadline, description: milestones.description, id: milestones.id, status: sql<ProjectMilestoneRead["status"]>`coalesce(${milestones.status}, 'PENDING')`, title: milestones.title })
    .from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.deadline), asc(milestones.id));
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const submitter = alias(users, "deliverable_submitter");
  const deliverableRows = await database.select({ description: deliverables.description, milestoneId: deliverables.milestoneId, submittedAt: deliverables.submittedAt, submittedByName: submitter.fullName, title: deliverables.title, type: deliverables.deliverableType })
    .from(deliverables).innerJoin(submitter, eq(submitter.id, deliverables.submittedBy)).where(inArray(deliverables.milestoneId, ids)).orderBy(desc(deliverables.submittedAt));
  const reviewer = alias(users, "milestone_reviewer");
  const reviewRows = await database.select({ comments: milestoneReviews.comments, createdAt: milestoneReviews.createdAt, decision: milestoneReviews.decision, milestoneId: milestoneReviews.milestoneId, reviewerName: reviewer.fullName, reviewerRole: milestoneReviews.reviewerRole })
    .from(milestoneReviews).innerJoin(reviewer, eq(reviewer.id, milestoneReviews.reviewerId)).where(inArray(milestoneReviews.milestoneId, ids)).orderBy(desc(milestoneReviews.createdAt), desc(milestoneReviews.id));
  return rows.map((row) => ({ ...row, deliverables: deliverableRows.filter((item) => item.milestoneId === row.id), latestReviews: latestReviews(reviewRows.filter((item) => item.milestoneId === row.id)) }));
}

export async function listProjectResources(database: ProjectQueryDatabase, projectId: bigint): Promise<ProjectResourceRead[]> {
  const rows = await database.select({ description: projectResources.description, id: projectResources.id, requiresAgreement: sql<boolean>`coalesce(${projectResources.requiresAgreement}, false)`, resourceType: projectResources.resourceType, sensitivityLevel: sql<string>`coalesce(${projectResources.sensitivityLevel}, 'TEAM_ONLY')`, title: projectResources.title })
    .from(projectResources).where(eq(projectResources.projectId, projectId)).orderBy(asc(projectResources.createdAt), asc(projectResources.id));
  return rows;
}

export async function isProjectMember(database: ProjectQueryDatabase, projectId: bigint, studentId: bigint) {
  const [row] = await database.select({ id: projectMembers.id }).from(projectMembers).where(sql`${projectMembers.projectId} = ${projectId} and ${projectMembers.studentId} = ${studentId}`).limit(1);
  return Boolean(row);
}

export async function hasAcceptedProjectAgreement(database: ProjectQueryDatabase, applicationId: bigint, challengeId: bigint, userId: bigint) {
  const [row] = await database.select({ id: agreements.id }).from(agreements).where(sql`${agreements.applicationId} = ${applicationId} and ${agreements.challengeId} = ${challengeId} and ${agreements.userId} = ${userId} and ${agreements.acceptedAt} is not null and ${agreements.revokedAt} is null`).limit(1);
  return Boolean(row);
}

function latestReviews<T extends { reviewerRole: string }>(reviews: T[]) {
  const seen = new Set<string>();
  return reviews.filter((review) => (seen.has(review.reviewerRole) ? false : (seen.add(review.reviewerRole), true)));
}
