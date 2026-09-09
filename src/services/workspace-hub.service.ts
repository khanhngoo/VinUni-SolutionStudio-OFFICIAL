import { db } from "@/db";
import { listApplicationDetailsForStudent } from "@/db/queries/applications";
import {
  isProjectMember,
  listProjectCores,
  listProjectMeetings,
  listProjectMilestones,
} from "@/db/queries/projects";
import { meetingState, meetingTimeLabel } from "@/lib/meetings";
import {
  groupAgendaEvents,
  hubGroupFor,
  type AgendaDay,
  type AgendaEvent,
  type HubGroup,
} from "@/lib/workspace";
import type { ApplicationStage } from "@/lib/types";

import {
  deriveApplicationStage,
  toPipelineView,
} from "./application-stage";
import type { ApplicationActorContext } from "./application.service";

/**
 * The student's whole workload, grouped by what it needs from them.
 *
 * Distinct from `workspace.service.ts`, which lists *projects* — that only
 * covers work that has already started, so an application still sitting in
 * assessment never appears. The hub is the one screen that has to show
 * everything at once, so it reads applications and folds project progress in
 * where a project exists.
 */

export interface WorkspaceHubRow {
  challengeSlug: string;
  challengeTitle: string;
  nextActionDue: string | null;
  ownerOrganizationName: string;
  progress: { approved: number; total: number } | null;
  publicId: string;
  stage: ApplicationStage;
  stageEnteredAt: Date | null;
}

export interface WorkspaceHubBucket {
  group: HubGroup;
  rows: WorkspaceHubRow[];
}

const HUB_GROUP_ORDER: HubGroup[] = [
  "needs-you",
  "in-progress",
  "waiting",
  "closed",
];

export async function listWorkspaceHubRows(
  actor: ApplicationActorContext
): Promise<WorkspaceHubRow[]> {
  const details = await listApplicationDetailsForStudent(db, actor.userId);

  // One pass for every project this student is on, rather than a lookup per
  // row — `getProjectCoreByApplicationPublicId` re-reads every core each call.
  const cores = details.some((detail) => detail.projectSummary)
    ? await listProjectCores(db)
    : [];
  const coreByApplication = new Map(
    cores.map((core) => [core.application.publicId, core])
  );

  return Promise.all(
    details.map(async (detail) => {
      const stage = deriveApplicationStage({
        assessmentSummaries: detail.assessmentSummaries,
        offerSummary: detail.offerSummary,
        projectSummary: detail.projectSummary,
        status: detail.status,
      });

      const view = toPipelineView(detail, stage);
      const core = coreByApplication.get(detail.publicId);

      return {
        challengeSlug: detail.challenge.slug ?? "",
        challengeTitle: detail.challenge.title,
        nextActionDue: view.nextActionDue,
        ownerOrganizationName: detail.challenge.ownerOrganization.name,
        progress: core ? await milestoneProgress(core.id) : null,
        publicId: detail.publicId,
        stage,
        stageEnteredAt: detail.updatedAt,
      };
    })
  );
}

/** Buckets in order, most recently moved first, empties dropped. */
export function groupHubRows(rows: WorkspaceHubRow[]): WorkspaceHubBucket[] {
  return HUB_GROUP_ORDER.map((group) => ({
    group,
    rows: rows
      .filter((row) => hubGroupFor(row.stage) === group)
      .sort(
        (a, b) =>
          (b.stageEnteredAt?.getTime() ?? 0) - (a.stageEnteredAt?.getTime() ?? 0)
      ),
  })).filter((bucket) => bucket.rows.length > 0);
}

/** How many applications are blocked on something only the student can do. */
export function hubUrgentCount(rows: WorkspaceHubRow[]): number {
  return rows.filter((row) => hubGroupFor(row.stage) === "needs-you").length;
}

async function milestoneProgress(projectId: bigint) {
  const milestones = await listProjectMilestones(db, projectId);
  return {
    approved: milestones.filter((milestone) => milestone.status === "COMPLETED")
      .length,
    total: milestones.length,
  };
}

/**
 * The "Coming up" rail: what is scheduled, and what falls due, across
 * everything the student is carrying.
 *
 * Deadlines only appear while the student is still being selected — once work
 * has started, the application deadline is history and the milestones are what
 * matter.
 */
export async function buildHubAgenda(
  actor: ApplicationActorContext,
  rows: WorkspaceHubRow[]
): Promise<AgendaDay[]> {
  const events: AgendaEvent[] = [];

  for (const row of rows) {
    const group = hubGroupFor(row.stage);

    if ((group === "needs-you" || group === "waiting") && row.nextActionDue) {
      events.push({
        allDay: true,
        at: row.nextActionDue,
        context: row.challengeTitle,
        href: `/challenges/${row.challengeSlug}`,
        id: `${row.publicId}:deadline`,
        kind: "deadline",
        timeLabel: "All day",
        title: row.stage === "INVITED" ? "Invitation expires" : "Applications close",
      });
    }
  }

  const cores = await listProjectCores(db);
  const mine = cores.filter((core) =>
    rows.some((row) => row.publicId === core.application.publicId)
  );

  for (const core of mine) {
    if (!(await isProjectMember(db, core.id, actor.userId))) continue;

    const [projectMeetings, projectMilestones] = await Promise.all([
      listProjectMeetings(db, core.id),
      listProjectMilestones(db, core.id),
    ]);

    for (const milestone of projectMilestones) {
      if (!milestone.deadline || milestone.status === "COMPLETED") continue;
      events.push({
        allDay: true,
        at: milestone.deadline,
        context: core.challenge.title,
        href: `/workspace/${core.application.publicId}?tab=milestones`,
        id: `${core.application.publicId}:milestone:${milestone.id}`,
        kind: "milestone",
        timeLabel: "All day",
        title: milestone.title,
      });
    }

    for (const meeting of projectMeetings) {
      const timing = {
        durationMinutes: meeting.durationMinutes,
        startsAt: meeting.startsAt.toISOString(),
      };
      if (meetingState(timing) === "past") continue;

      events.push({
        allDay: false,
        at: timing.startsAt,
        context: core.challenge.title,
        href: `/workspace/${core.application.publicId}`,
        id: `meeting:${meeting.publicId}`,
        kind: "meeting",
        meetingId: meeting.publicId,
        meetingState: meetingState(timing),
        timeLabel: meetingTimeLabel(timing),
        title: meeting.title,
      });
    }
  }

  return groupAgendaEvents(events, { maxEvents: 10 });
}
