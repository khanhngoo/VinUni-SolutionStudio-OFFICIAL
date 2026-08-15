import { applications } from "@/lib/data/applications";
import { challenges } from "@/lib/data/challenges";
import { currentOrgId } from "@/lib/data/organizations";
import { providerApplications } from "@/lib/data/provider-applications";
import { daysUntil } from "@/lib/dates";
import { isTerminal } from "@/lib/pipeline";
import { confirmedMembers } from "@/lib/teams";
import type {
  Application,
  ApplicationStage,
  Challenge,
  Milestone,
  PartnerFeedback,
  ProjectRecord,
} from "@/lib/types";

/**
 * The partner's view of the same records the student portal renders.
 *
 * Two fixtures feed this: `applications.ts` (Jordan's, one per challenge) and
 * `provider-applications.ts` (the competing teams). They are unioned here
 * rather than merged in the data layer so the student fixture keeps reading as
 * one student's story.
 */
function allApplications(): Application[] {
  return [...applications, ...providerApplications];
}

/** Absent and null both mean "not written yet". */
export function partnerFeedbackOf(
  project: ProjectRecord,
): PartnerFeedback | null {
  return project.partnerFeedback ?? null;
}

export function orgChallenges(orgId: string = currentOrgId): Challenge[] {
  return challenges.filter((c) => c.orgId === orgId);
}

export function getOrgChallengeById(
  id: string,
  orgId: string = currentOrgId,
): Challenge | undefined {
  return orgChallenges(orgId).find((c) => c.id === id);
}

/** Every application against one of this partner's challenges. */
export function orgApplications(orgId: string = currentOrgId): Application[] {
  const ids = new Set(orgChallenges(orgId).map((c) => c.id));
  return allApplications().filter((a) => ids.has(a.challengeId));
}

export function applicationsForChallenge(challengeId: string): Application[] {
  return allApplications().filter((a) => a.challengeId === challengeId);
}

export function getOrgApplicationById(
  id: string,
  orgId: string = currentOrgId,
): Application | undefined {
  return orgApplications(orgId).find((a) => a.id === id);
}

/**
 * The five columns of the pipeline board.
 *
 * `ApplicationStage` has thirteen values, which is the right resolution for a
 * student tracking one application and far too much for a partner scanning
 * twelve. Stages collapse to the five decisions a partner actually makes, in
 * the same left-to-right order as the student's selection timeline.
 */
export type PipelineColumn =
  | "applied"
  | "shortlisted"
  | "assessment"
  | "interview"
  | "invited";

export const PIPELINE_COLUMNS: PipelineColumn[] = [
  "applied",
  "shortlisted",
  "assessment",
  "interview",
  "invited",
];

export const PIPELINE_LABELS: Record<PipelineColumn, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  assessment: "In assessment",
  interview: "Interview",
  invited: "Invited",
};

export function columnFor(stage: ApplicationStage): PipelineColumn | null {
  switch (stage) {
    case "APPLIED":
      return "applied";
    case "SHORTLISTED":
      return "shortlisted";
    case "TEST_PENDING":
    case "TEST_SUBMITTED":
      return "assessment";
    case "INTERVIEW_SCHEDULING":
    case "INTERVIEW_SCHEDULED":
      return "interview";
    case "INVITED":
      return "invited";
    // Live and terminal applications have left the selection board — they
    // belong to the projects screen or to nothing at all.
    default:
      return null;
  }
}

export interface PipelineBucket {
  column: PipelineColumn;
  applications: Application[];
}

export function pipelineFor(challengeId: string): PipelineBucket[] {
  const rows = applicationsForChallenge(challengeId);
  return PIPELINE_COLUMNS.map((column) => ({
    column,
    applications: rows.filter((a) => columnFor(a.stage) === column),
  }));
}

/** Applications that have become real engagements. */
export function orgProjects(
  orgId: string = currentOrgId,
): { application: Application; challenge: Challenge; project: ProjectRecord }[] {
  return orgApplications(orgId)
    .map((application) => {
      const challenge = challenges.find((c) => c.id === application.challengeId);
      if (!challenge || !application.project) return undefined;
      return { application, challenge, project: application.project };
    })
    .filter((row) => row !== undefined);
}

export function milestoneProgress(project: ProjectRecord): {
  approved: number;
  total: number;
} {
  return {
    approved: project.milestones.filter((m) => m.status === "Approved").length,
    total: project.milestones.length,
  };
}

/**
 * Deliverables the partner has been handed and not yet signed off.
 *
 * Dual sign-off (PRD D7) means a milestone needs both faculty and partner.
 * This is deliberately only the partner's half — faculty's queue is the
 * faculty portal's problem, and a milestone faculty has not reached yet is
 * still the partner's to review.
 */
export interface ApprovalItem {
  application: Application;
  challenge: Challenge;
  milestone: Milestone;
  overdueDays: number;
}

export function pendingApprovals(
  orgId: string = currentOrgId,
): ApprovalItem[] {
  return orgProjects(orgId)
    .flatMap(({ application, challenge, project }) =>
      project.milestones
        .filter((m) => m.status === "Submitted" && !m.posterApproved)
        .map((milestone) => ({
          application,
          challenge,
          milestone,
          overdueDays: Math.max(0, -daysUntil(milestone.dueDate)),
        })),
    )
    .sort((a, b) => b.overdueDays - a.overdueDays);
}

/** Finished projects with no partner review written yet. */
export function awaitingCloseOut(orgId: string = currentOrgId) {
  return orgProjects(orgId).filter(
    ({ application, project }) =>
      application.stage === "COMPLETED" && partnerFeedbackOf(project) === null,
  );
}

/**
 * The partner's "needs you" list — the same idea as the student hub's urgent
 * count, computed from the partner's own obligations rather than the
 * student's.
 */
export interface AttentionItem {
  kind: "shortlist" | "approve" | "feedback";
  label: string;
  challenge: Challenge;
  href: string;
  detail: string;
  due: string | null;
  urgent: boolean;
}

export function needsAttention(
  orgId: string = currentOrgId,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  // Challenges with people waiting on a first decision.
  for (const challenge of orgChallenges(orgId)) {
    if (challenge.status !== "Published") continue;
    const waiting = applicationsForChallenge(challenge.id).filter(
      (a) => a.stage === "APPLIED",
    ).length;
    if (waiting === 0) continue;

    const days = daysUntil(challenge.deadline);
    items.push({
      kind: "shortlist",
      label: "Review applicants",
      challenge,
      href: `/partner/challenges/${challenge.id}`,
      detail: `${waiting} team${waiting === 1 ? "" : "s"} awaiting a decision`,
      due: days >= 0 ? `${days} days` : "Closed",
      urgent: days >= 0 && days <= 7,
    });
  }

  for (const item of pendingApprovals(orgId)) {
    items.push({
      kind: "approve",
      label: "Approve deliverable",
      challenge: item.challenge,
      href: `/partner/projects/${item.application.id}`,
      detail: `${item.application.team.name} · ${item.milestone.title}`,
      due: item.overdueDays > 0 ? `Overdue ${item.overdueDays}d` : "Due now",
      urgent: item.overdueDays > 0,
    });
  }

  for (const { application, challenge } of awaitingCloseOut(orgId)) {
    items.push({
      kind: "feedback",
      label: "Leave feedback",
      challenge,
      href: `/partner/projects/${application.id}/close`,
      detail: `${application.team.name} · finished`,
      due: null,
      urgent: false,
    });
  }

  return items;
}

/** Applications still in selection, for the challenge index counts. */
export function selectionCount(challengeId: string): number {
  return applicationsForChallenge(challengeId).filter(
    (a) => columnFor(a.stage) !== null,
  ).length;
}

export function liveCount(challengeId: string): number {
  return applicationsForChallenge(challengeId).filter(
    (a) => a.project !== null && !isTerminal(a.stage),
  ).length;
}

/** Headcount across a team, counting only members who actually confirmed. */
export function teamHeadcount(application: Application): number {
  return confirmedMembers(application.team).length;
}
