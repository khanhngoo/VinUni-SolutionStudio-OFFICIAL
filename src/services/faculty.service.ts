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
import { getApplicationByPublicId } from "@/db/queries/applications";
import type {
  FacultyLoad,
  FeedbackQueueItem,
  InviteQueueItem,
  MilestoneQueueItem,
  SettledSupervision,
} from "@/lib/faculty-queue";
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

/**
 * The faculty action queue.
 *
 * Three obligations from three tables, flattened into one list the caller
 * sorts by urgency. Each carries the days until it is due — negative when
 * overdue — because that number is both the sort key and the copy on the row.
 */
export async function getFacultyQueue(
  facultyUserId: bigint,
  options: FacultyServiceOptions = {}
): Promise<{
  feedback: FeedbackQueueItem[];
  invites: InviteQueueItem[];
  load: FacultyLoad;
  milestones: MilestoneQueueItem[];
  settled: SettledSupervision[];
}> {
  const database = options.database ?? db;
  const now = new Date();

  const [requests, capacity, cores] = await Promise.all([
    listFacultySupervisionRequests(database, facultyUserId),
    getFacultyCapacity(database, facultyUserId),
    listProjectCores(database),
  ]);

  const supervised = cores.filter(
    (project) => project.facultySupervisor?.userId === facultyUserId
  );

  const pending = requests.filter((request) => request.status === "PENDING");
  const invites: InviteQueueItem[] = await Promise.all(
    pending.map(async (request) => {
      const application = await getApplicationByPublicId(
        database,
        request.applicationPublicId
      );
      return {
        applicationPublicId: request.applicationPublicId,
        challengeTitle: request.challengeTitle,
        // The read model carries the owning organization, not a college list;
        // that is the useful identifier on this row anyway.
        colleges: application
          ? [application.challenge.ownerOrganization.name]
          : [],
        daysLeft: daysBetween(now, request.respondBy),
        durationWeeks: null,
        hoursPerWeek: application?.challenge.weeklyHours ?? null,
        kind: "invite" as const,
        requestId: String(request.id),
        teamName: request.teamName ?? "Unnamed team",
        teamSize:
          application?.members.filter(
            (member) => member.status === "ACCEPTED"
          ).length ?? 0,
      };
    })
  );

  const milestones: MilestoneQueueItem[] = [];
  const feedback: FeedbackQueueItem[] = [];
  const settled: SettledSupervision[] = [];

  for (const project of supervised) {
    const rows = await listProjectMilestones(database, project.id);
    const teamName = project.application.teamName ?? "Unnamed team";

    // A milestone the team has handed in is the supervisor's move, unless they
    // have already given their verdict -- then the row shows the wait on the
    // partner instead of asking twice.
    const outstanding = rows.filter(
      (row) => row.status === "SUBMITTED" || row.status === "REVISION_REQUESTED"
    );

    for (const row of outstanding) {
      const facultyDecision = row.latestReviews.find(
        (review) => review.reviewerRole === "FACULTY"
      );
      const partnerApproved = row.latestReviews.some(
        (review) =>
          (review.reviewerRole === "PARTNER" ||
            review.reviewerRole === "MANAGING_ORGANIZATION") &&
          review.decision === "APPROVED"
      );

      milestones.push({
        actionNeeded: facultyDecision?.decision !== "APPROVED",
        applicationPublicId: project.application.publicId,
        challengeTitle: project.challenge.title,
        daysLeft: daysBetween(now, row.deadline ? new Date(row.deadline) : null),
        deliverable: row.deliverables[0]?.title ?? row.description ?? "Deliverable",
        dueDate: row.deadline,
        kind: "milestone",
        milestoneId: String(row.id),
        milestoneTitle: row.title,
        partnerApproved,
        teamName,
      });
    }

    const finished = project.status === "COMPLETED" || project.status === "ARCHIVED";
    if (finished) {
      feedback.push({
        applicationPublicId: project.application.publicId,
        challengeTitle: project.challenge.title,
        // Negative, so the longest-owed sorts to the top.
        daysLeft: daysBetween(now, project.endDate ? new Date(project.endDate) : null),
        kind: "feedback",
        teamName,
      });
      continue;
    }

    if (outstanding.length === 0) {
      settled.push({
        applicationPublicId: project.application.publicId,
        challengeTitle: project.challenge.title,
        teamName,
      });
    }
  }

  return {
    feedback,
    invites,
    load: {
      name: "",
      slotsTotal: capacity?.maxActiveSupervisions ?? 0,
      slotsUsed: supervised.filter(
        (project) =>
          project.status === "ACTIVE" ||
          project.status === "PAUSED" ||
          project.status === "FINAL_REVIEW"
      ).length,
    },
    milestones,
    settled,
  };
}

/** Whole days from `from` to `to`. Negative once past; null dates read as due now. */
function daysBetween(from: Date, to: Date | null): number {
  if (!to) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
