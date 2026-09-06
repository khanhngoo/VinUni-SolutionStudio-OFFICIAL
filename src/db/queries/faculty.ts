import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  applications,
  challengeFacultyAssignments,
  challenges,
  organizations,
  supervisionRequests,
} from "@/db/schema";

export type FacultyQueryDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface FacultyChallengeAssignmentRead {
  assignedAt: Date | null;
  challengeSlug: string | null;
  challengeStatus: string;
  challengeTitle: string;
  comments: string | null;
  id: bigint;
  ownerOrganizationName: string;
  respondedAt: Date | null;
  status: string;
}

/** Faculty routing/review relationship for a challenge — not active project supervision. */
export async function listFacultyChallengeAssignments(
  database: FacultyQueryDatabase,
  facultyUserId: bigint
): Promise<FacultyChallengeAssignmentRead[]> {
  return database
    .select({
      assignedAt: challengeFacultyAssignments.assignedAt,
      challengeSlug: challenges.slug,
      challengeStatus: sql<string>`coalesce(${challenges.status}, 'DRAFT')`,
      challengeTitle: challenges.title,
      comments: challengeFacultyAssignments.comments,
      id: challengeFacultyAssignments.id,
      ownerOrganizationName: organizations.name,
      respondedAt: challengeFacultyAssignments.respondedAt,
      status: sql<string>`coalesce(${challengeFacultyAssignments.status}, 'PENDING')`,
    })
    .from(challengeFacultyAssignments)
    .innerJoin(challenges, eq(challenges.id, challengeFacultyAssignments.challengeId))
    .innerJoin(organizations, eq(organizations.id, challenges.ownerOrganizationId))
    .where(eq(challengeFacultyAssignments.facultyId, facultyUserId))
    .orderBy(desc(challengeFacultyAssignments.assignedAt), desc(challengeFacultyAssignments.id));
}

export interface FacultySupervisionRequestRead {
  applicationPublicId: string;
  challengeSlug: string | null;
  challengeTitle: string;
  comments: string | null;
  id: bigint;
  requestedAt: Date | null;
  respondBy: Date | null;
  respondedAt: Date | null;
  status: string;
  teamName: string | null;
}

/** Faculty has been asked to supervise an application/team — not yet an active project. */
export async function listFacultySupervisionRequests(
  database: FacultyQueryDatabase,
  facultyUserId: bigint
): Promise<FacultySupervisionRequestRead[]> {
  return database
    .select({
      applicationPublicId: applications.publicId,
      challengeSlug: challenges.slug,
      challengeTitle: challenges.title,
      comments: supervisionRequests.comments,
      id: supervisionRequests.id,
      requestedAt: supervisionRequests.requestedAt,
      respondBy: supervisionRequests.respondBy,
      respondedAt: supervisionRequests.respondedAt,
      status: sql<string>`coalesce(${supervisionRequests.status}, 'PENDING')`,
      teamName: applications.teamName,
    })
    .from(supervisionRequests)
    .innerJoin(applications, eq(applications.id, supervisionRequests.applicationId))
    .innerJoin(challenges, eq(challenges.id, applications.challengeId))
    .where(eq(supervisionRequests.facultyId, facultyUserId))
    .orderBy(desc(supervisionRequests.requestedAt), desc(supervisionRequests.id));
}

export async function getFacultySupervisionRequestForApplication(
  database: FacultyQueryDatabase,
  facultyUserId: bigint,
  applicationPublicId: string
): Promise<FacultySupervisionRequestRead | null> {
  const rows = await listFacultySupervisionRequests(database, facultyUserId);
  return rows.find((row) => row.applicationPublicId === applicationPublicId) ?? null;
}

export interface FacultyCapacityRead {
  maxActiveSupervisions: number | null;
}

export async function getFacultyCapacity(
  database: FacultyQueryDatabase,
  facultyUserId: bigint
): Promise<FacultyCapacityRead | null> {
  const { facultyProfiles } = await import("@/db/schema");
  const [row] = await database
    .select({ maxActiveSupervisions: facultyProfiles.maxActiveSupervisions })
    .from(facultyProfiles)
    .where(eq(facultyProfiles.userId, facultyUserId))
    .limit(1);
  return row ?? null;
}

export interface FacultyProfileRecordRead {
  academicTitle: string | null;
  department: string | null;
  maxActiveSupervisions: number | null;
  school: string | null;
}

/** The self-profile record — school/department/title are institutional facts;
 * only `maxActiveSupervisions` has an edit path (see `faculty-profile.service.ts`). */
export async function getFacultyProfileRecord(
  database: FacultyQueryDatabase,
  facultyUserId: bigint
): Promise<FacultyProfileRecordRead | null> {
  const { facultyProfiles } = await import("@/db/schema");
  const [row] = await database
    .select({
      academicTitle: facultyProfiles.academicTitle,
      department: facultyProfiles.department,
      maxActiveSupervisions: facultyProfiles.maxActiveSupervisions,
      school: facultyProfiles.school,
    })
    .from(facultyProfiles)
    .where(eq(facultyProfiles.userId, facultyUserId))
    .limit(1);
  return row ?? null;
}
