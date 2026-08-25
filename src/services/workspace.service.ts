import { db } from "@/db";
import { getChallengeWorkspaceExtras } from "@/db/queries/challenges";
import {
  getProjectCoreByApplicationPublicId,
  hasAcceptedProjectAgreement,
  isProjectMember,
  listProjectCores,
  listProjectMembers,
  listProjectMilestones,
  listProjectMeetings,
  listProjectResources,
  type ProjectCoreRead,
  type ProjectQueryDatabase,
} from "@/db/queries/projects";
import {
} from "@/db/mutations/applications";
import { getDevelopmentApplicationActor, type ApplicationActorContext } from "@/services/application.service";

export class WorkspaceError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export interface WorkspaceServiceOptions { database?: ProjectQueryDatabase; }
export type DevelopmentWorkspaceActorKey = Parameters<typeof getDevelopmentApplicationActor>[0];

export interface WorkspaceListItem {
  applicationPublicId: string;
  challengeSlug: string;
  challengeTitle: string;
  nextDeadline: string | null;
  projectStatus: ProjectCoreRead["status"];
  progress: { completed: number; total: number };
}

export interface WorkspaceDetail extends WorkspaceListItem {
  applicationStatus: string;
  challenge: {
    durationWeeks: number | null;
    fullBrief: string | null;
    ownerOrganizationName: string;
    subtype: string | null;
    weeklyHours: number | null;
  };
  contactPerson: { displayName: string; email: string | null; roleLabel: string | null } | null;
  meetings: Array<{
    attendees: Array<{ fullName: string; role: string | null }>;
    durationMinutes: number | null;
    joinUrl: string | null;
    kind: string;
    milestoneId: string | null;
    publicId: string;
    startsAt: string;
    title: string;
  }>;
  members: Array<{ fullName: string; major: string | null; projectRole: string | null; studyYear: number | null }>;
  project: { endDate: string | null; startDate: string | null; supervisorName: string | null };
  milestones: Array<{
    deadline: string | null;
    description: string | null;
    facultyApproved: boolean;
    partnerApproved: boolean;
    deliverables: Array<{ description: string | null; submittedAt: Date | null; submittedByName: string; title: string | null; type: string | null }>;
    id: string;
    latestReviews: Array<{ comments: string | null; createdAt: Date | null; decision: string; reviewerName: string; reviewerRole: string }>;
    status: string;
    title: string;
  }>;
  resources: Array<{ access: "AVAILABLE" | "AGREEMENT_REQUIRED"; description: string | null; resourceType: string | null; sensitivityLevel: string; title: string }>;
}

export async function getDevelopmentWorkspaceActor(key: DevelopmentWorkspaceActorKey, options: WorkspaceServiceOptions = {}): Promise<ApplicationActorContext> {
  void options;
  return getDevelopmentApplicationActor(key);
}

export async function listWorkspaceProjects(actor: ApplicationActorContext, options: WorkspaceServiceOptions = {}): Promise<WorkspaceListItem[]> {
  const database = options.database ?? db;
  const cores = await listProjectCores(database);
  const accessible = await Promise.all(cores.map(async (project) => ({ project, allowed: await canAccessProject(database, project, actor) })));
  const result: WorkspaceListItem[] = [];
  for (const { project, allowed } of accessible) {
    if (!allowed) continue;
    const milestones = await listProjectMilestones(database, project.id);
    result.push(toListItem(project, milestones));
  }
  return result;
}

export async function getWorkspaceDetail(applicationPublicId: string, actor: ApplicationActorContext, options: WorkspaceServiceOptions = {}): Promise<WorkspaceDetail | null> {
  const database = options.database ?? db;
  const project = await getProjectCoreByApplicationPublicId(database, applicationPublicId.trim());
  if (!project) return null;
  if (!(await canAccessProject(database, project, actor))) {
    throw new WorkspaceError("FORBIDDEN", "Actor cannot access this workspace.");
  }
  const [members, milestones, resources, challengeExtras, projectMeetings] = await Promise.all([
    listProjectMembers(database, project.id), listProjectMilestones(database, project.id), listProjectResources(database, project.id),
    // Safe to read unredacted: reaching this point already required passing
    // canAccessProject, which is a stricter gate than the brief's own.
    getChallengeWorkspaceExtras(project.challenge.id),
    listProjectMeetings(database, project.id),
  ]);
  const agreementSatisfied = actor.isStudent
    ? await hasAcceptedProjectAgreement(database, project.application.id, project.challenge.id, actor.userId)
    : true;
  return {
    ...toListItem(project, milestones), applicationStatus: project.application.status,
    challenge: {
      durationWeeks: challengeExtras?.durationWeeks ?? null,
      fullBrief: challengeExtras?.fullBrief ?? null,
      ownerOrganizationName: project.challenge.ownerOrganizationName,
      subtype: challengeExtras?.subtype ?? null,
      weeklyHours: project.challenge.weeklyHours,
    },
    contactPerson: challengeExtras?.contactPerson ?? null,
    meetings: projectMeetings.map((meeting) => ({
      ...meeting,
      milestoneId: meeting.milestoneId?.toString() ?? null,
      startsAt: meeting.startsAt.toISOString(),
    })),
    members: members.map((member) => ({
      fullName: member.fullName,
      major: member.major,
      projectRole: member.projectRole,
      studyYear: member.studyYear,
    })),
    project: { endDate: project.endDate, startDate: project.startDate, supervisorName: project.facultySupervisor?.fullName ?? null },
    milestones: milestones.map((milestone) => ({
      ...milestone,
      // Fold the per-role review rows into the two booleans the UI asks about.
      // Kept here rather than in the component so every surface that shows
      // sign-off agrees on what "approved" means.
      facultyApproved: hasApproval(milestone.latestReviews, "FACULTY"),
      id: milestone.id.toString(),
      partnerApproved: hasApproval(milestone.latestReviews, "PARTNER"),
    })),
    resources: resources.map((resource) => ({
      access: resource.requiresAgreement && !agreementSatisfied ? "AGREEMENT_REQUIRED" : "AVAILABLE",
      description: resource.description, resourceType: resource.resourceType, sensitivityLevel: resource.sensitivityLevel, title: resource.title,
    })),
  };
}

async function canAccessProject(database: ProjectQueryDatabase, project: ProjectCoreRead, actor: ApplicationActorContext) {
  if (actor.isStudent && await isProjectMember(database, project.id, actor.userId)) return true;
  if (project.facultySupervisor?.userId === actor.userId) return true;
  return actor.memberships.some((membership) => {
    if (membership.status !== "ACTIVE") return false;
    if (membership.organizationId === project.challenge.ownerOrganizationId) {
      return ["ADMIN", "CONTACT_PERSON", "REVIEWER"].includes(membership.role);
    }
    if (membership.organizationId === project.challenge.managingOrganizationId) {
      return ["ADMIN", "PROJECT_MANAGER", "REVIEWER"].includes(membership.role);
    }
    return false;
  });
}

function toListItem(project: ProjectCoreRead, milestones: Awaited<ReturnType<typeof listProjectMilestones>>): WorkspaceListItem {
  const completed = milestones.filter((milestone) => milestone.status === "COMPLETED").length;
  const next = milestones.find((milestone) => milestone.status !== "COMPLETED" && milestone.deadline !== null);
  return { applicationPublicId: project.application.publicId, challengeSlug: project.challenge.slug, challengeTitle: project.challenge.title, nextDeadline: next?.deadline ?? null, projectStatus: project.status, progress: { completed, total: milestones.length } };
}

/**
 * Names only — no URLs, no credentials — of the resources waiting on a
 * project, for the offer reveal.
 *
 * Returns empty when no project row exists yet, which is the normal case at
 * offer time. The reveal says so rather than inventing rows: seeding fake
 * resources to make the panel look fuller would put fictional material in
 * front of a student about to sign an NDA over the real thing.
 */
export async function listRevealedResourceNames(
  applicationPublicId: string,
  actor: ApplicationActorContext
): Promise<string[]> {
  const core = await getProjectCoreByApplicationPublicId(db, applicationPublicId);
  if (!core) return [];
  if (!(await isProjectMember(db, core.id, actor.userId))) return [];

  const resources = await listProjectResources(db, core.id);
  return resources.map((resource) => resource.title);
}

function hasApproval(
  reviews: Array<{ decision: string; reviewerRole: string }>,
  role: string
) {
  return reviews.some(
    (review) => review.reviewerRole === role && review.decision === "APPROVED"
  );
}

export interface MeetingDetail {
  applicationPublicId: string;
  attendees: Array<{ fullName: string; role: string | null }>;
  challengeTitle: string;
  durationMinutes: number | null;
  joinUrl: string | null;
  kind: string;
  startsAt: string;
  title: string;
}

/**
 * A meeting, for anyone who may already see its workspace.
 *
 * Authorization deliberately delegates to canAccessProject rather than
 * introducing a second rule: a meeting URL must be exactly as reachable as the
 * workspace it belongs to, no more.
 */
export async function getMeetingDetail(
  meetingPublicId: string,
  actor: ApplicationActorContext,
  options: WorkspaceServiceOptions = {}
): Promise<MeetingDetail | null> {
  const database = options.database ?? db;
  const found = await findMeetingByPublicId(database, meetingPublicId.trim());
  if (!found) return null;

  const project = await getProjectCoreByApplicationPublicId(
    database,
    found.applicationPublicId
  );
  if (!project) return null;

  if (!(await canAccessProject(database, project, actor))) {
    throw new WorkspaceError("FORBIDDEN", "Actor cannot access this meeting.");
  }

  return {
    applicationPublicId: found.applicationPublicId,
    attendees: found.meeting.attendees,
    challengeTitle: project.challenge.title,
    durationMinutes: found.meeting.durationMinutes,
    joinUrl: found.meeting.joinUrl,
    kind: found.meeting.kind,
    startsAt: found.meeting.startsAt.toISOString(),
    title: found.meeting.title,
  };
}

async function findMeetingByPublicId(
  database: ProjectQueryDatabase,
  meetingPublicId: string
) {
  for (const core of await listProjectCores(database)) {
    const found = (await listProjectMeetings(database, core.id)).find(
      (meeting) => meeting.publicId === meetingPublicId
    );
    if (found) {
      return { applicationPublicId: core.application.publicId, meeting: found };
    }
  }
  return null;
}
