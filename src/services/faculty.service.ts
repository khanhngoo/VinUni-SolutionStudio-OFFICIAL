import { db } from "@/db";
import {
  getFacultyCapacity,
  getFacultySupervisionRequestForApplication,
  listFacultyChallengeAssignments,
  listFacultySupervisionRequests,
  type FacultyChallengeAssignmentRead,
  type FacultyQueryDatabase,
  type FacultySupervisionRequestRead,
} from "@/db/queries/faculty";
import {
  getProjectCoreByApplicationPublicId,
  listProjectCores,
  listProjectMilestones,
  type ProjectCoreRead,
} from "@/db/queries/projects";

export interface FacultyServiceOptions {
  database?: FacultyQueryDatabase;
}

export interface FacultySupervisedProjectRead {
  applicationPublicId: string;
  challengeSlug: string;
  challengeTitle: string;
  progress: { completed: number; total: number };
  status: ProjectCoreRead["status"];
}

export interface FacultyDashboard {
  capacity: { maxActiveSupervisions: number | null };
  challengeAssignments: FacultyChallengeAssignmentRead[];
  supervisedProjects: FacultySupervisedProjectRead[];
  supervisionRequests: FacultySupervisionRequestRead[];
}

export async function getFacultyDashboard(
  facultyUserId: bigint,
  options: FacultyServiceOptions = {}
): Promise<FacultyDashboard> {
  const database = options.database ?? db;
  const [challengeAssignments, supervisionRequestRows, capacity, cores] = await Promise.all([
    listFacultyChallengeAssignments(database, facultyUserId),
    listFacultySupervisionRequests(database, facultyUserId),
    getFacultyCapacity(database, facultyUserId),
    listProjectCores(database),
  ]);

  const supervised = cores.filter(
    (project) => project.facultySupervisor?.userId === facultyUserId
  );
  const supervisedProjects = await Promise.all(
    supervised.map(async (project) => {
      const milestones = await listProjectMilestones(database, project.id);
      const completed = milestones.filter((m) => m.status === "COMPLETED").length;
      return {
        applicationPublicId: project.application.publicId,
        challengeSlug: project.challenge.slug,
        challengeTitle: project.challenge.title,
        progress: { completed, total: milestones.length },
        status: project.status,
      };
    })
  );

  return {
    capacity: { maxActiveSupervisions: capacity?.maxActiveSupervisions ?? null },
    challengeAssignments,
    supervisedProjects,
    supervisionRequests: supervisionRequestRows,
  };
}

export type FacultyApplicationDetail =
  | { kind: "SUPERVISED_PROJECT"; applicationPublicId: string }
  | { kind: "SUPERVISION_REQUEST"; request: FacultySupervisionRequestRead };

/**
 * Authorizes `/faculty/[applicationId]` through an explicit relationship —
 * never merely because the caller is faculty. A confirmed project supervisor
 * relationship defers to the authoritative `/workspace` route rather than
 * duplicating its access policy here.
 */
export async function getFacultyApplicationDetail(
  facultyUserId: bigint,
  applicationPublicId: string,
  options: FacultyServiceOptions = {}
): Promise<FacultyApplicationDetail | null> {
  const database = options.database ?? db;
  const project = await getProjectCoreByApplicationPublicId(database, applicationPublicId);
  if (project?.facultySupervisor?.userId === facultyUserId) {
    return { kind: "SUPERVISED_PROJECT", applicationPublicId };
  }

  const request = await getFacultySupervisionRequestForApplication(
    database,
    facultyUserId,
    applicationPublicId
  );
  if (request) return { kind: "SUPERVISION_REQUEST", request };

  return null;
}
