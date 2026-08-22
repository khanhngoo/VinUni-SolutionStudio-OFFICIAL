import { db } from "@/db";
import {
  getProjectCoreByApplicationPublicId,
  hasAcceptedProjectAgreement,
  isProjectMember,
  listProjectCores,
  listProjectMembers,
  listProjectMilestones,
  listProjectResources,
  type ProjectCoreRead,
  type ProjectQueryDatabase,
} from "@/db/queries/projects";
import {
  getApplicationWriteActorByEmail,
  type ApplicationMutationDatabase,
} from "@/db/mutations/applications";
import type { ApplicationActorContext } from "@/services/application.service";

export class WorkspaceError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "WorkspaceError";
  }
}

export type DevelopmentWorkspaceActorKey =
  | "JORDAN_STUDENT_DEMO"
  | "BAO_STUDENT_DEMO"
  | "FACULTY_PHAM_DEMO"
  | "BENCANG_CONTACT_DEMO"
  | "CAID_ADMIN_DEMO";

export interface WorkspaceServiceOptions { database?: ProjectQueryDatabase; }

const DEVELOPMENT_ACTOR_EMAILS: Record<DevelopmentWorkspaceActorKey, string> = {
  JORDAN_STUDENT_DEMO: "student.jordan-lee.demo@example.test",
  BAO_STUDENT_DEMO: "student.bao-tran.demo@example.test",
  FACULTY_PHAM_DEMO: "faculty.minh-pham.demo@example.test",
  BENCANG_CONTACT_DEMO: "contact.bencang.demo@example.test",
  CAID_ADMIN_DEMO: "caid.admin.dev@example.test",
};

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
  challenge: { ownerOrganizationName: string; weeklyHours: number | null };
  members: Array<{ fullName: string; major: string | null; projectRole: string | null; studyYear: number | null }>;
  project: { endDate: string | null; startDate: string | null; supervisorName: string | null };
  milestones: Array<{
    deadline: string | null;
    description: string | null;
    deliverables: Array<{ description: string | null; submittedAt: Date | null; submittedByName: string; title: string | null; type: string | null }>;
    id: string;
    latestReviews: Array<{ comments: string | null; createdAt: Date | null; decision: string; reviewerName: string; reviewerRole: string }>;
    status: string;
    title: string;
  }>;
  resources: Array<{ access: "AVAILABLE" | "AGREEMENT_REQUIRED"; description: string | null; resourceType: string | null; sensitivityLevel: string; title: string }>;
}

export async function getDevelopmentWorkspaceActor(key: DevelopmentWorkspaceActorKey, options: WorkspaceServiceOptions = {}): Promise<ApplicationActorContext> {
  const actor = await getApplicationWriteActorByEmail(
    options.database ?? db as ApplicationMutationDatabase,
    DEVELOPMENT_ACTOR_EMAILS[key]
  );
  if (!actor) throw new WorkspaceError("NOT_FOUND", `Development workspace actor ${key} was not found.`);
  return { ...actor, source: "DEVELOPMENT_ONLY" };
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
  const [members, milestones, resources] = await Promise.all([
    listProjectMembers(database, project.id), listProjectMilestones(database, project.id), listProjectResources(database, project.id),
  ]);
  const agreementSatisfied = actor.isStudent
    ? await hasAcceptedProjectAgreement(database, project.application.id, project.challenge.id, actor.userId)
    : true;
  return {
    ...toListItem(project, milestones), applicationStatus: project.application.status,
    challenge: { ownerOrganizationName: project.challenge.ownerOrganizationName, weeklyHours: project.challenge.weeklyHours },
    members: members.map((member) => ({
      fullName: member.fullName,
      major: member.major,
      projectRole: member.projectRole,
      studyYear: member.studyYear,
    })),
    project: { endDate: project.endDate, startDate: project.startDate, supervisorName: project.facultySupervisor?.fullName ?? null },
    milestones: milestones.map((milestone) => ({ ...milestone, id: milestone.id.toString() })),
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
