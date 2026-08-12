import { TODAY, dayKey, dayLabel, daysUntil, formatTime, toDate } from "@/lib/dates";
import {
  meetingState,
  meetingTimeLabel,
  sortMeetings,
  type MeetingState,
} from "@/lib/meetings";
import { countdownLabel, ctaFor, type CtaTarget } from "@/lib/pipeline";
import type { ApplicationWithChallenge } from "@/lib/queries";
import type { ApplicationStage, ProjectRecord } from "@/lib/types";

/**
 * Everything the workspace hub derives across *all* of a student's
 * applications. `pipeline.ts` answers "what does this stage mean"; this file
 * answers "what should I do next, across everything I have going".
 */

// ---------------------------------------------------------------- groups

export type HubGroup = "needs-you" | "in-progress" | "waiting" | "closed";

export const HUB_GROUP_ORDER: HubGroup[] = [
  "needs-you",
  "in-progress",
  "waiting",
  "closed",
];

export const HUB_GROUP_LABELS: Record<HubGroup, string> = {
  "needs-you": "Needs you",
  "in-progress": "In progress",
  waiting: "Waiting on them",
  closed: "Closed",
};

export const HUB_GROUP_BLURB: Record<HubGroup, string> = {
  "needs-you": "Blocked on something only you can do",
  "in-progress": "Live projects with a workspace",
  waiting: "Sitting with a reviewer or partner",
  closed: "Finished, declined or withdrawn",
};

/**
 * Exhaustive on purpose — no default branch, so adding a stage to the union
 * is a type error here rather than a silent demotion into "Closed".
 */
export function hubGroupFor(stage: ApplicationStage): HubGroup {
  switch (stage) {
    case "TEST_PENDING":
    case "INTERVIEW_SCHEDULING":
    case "INVITED":
      return "needs-you";
    case "ACTIVE":
    case "IN_REVIEW":
      return "in-progress";
    case "APPLIED":
    case "SHORTLISTED":
    case "TEST_SUBMITTED":
    case "INTERVIEW_SCHEDULED":
      return "waiting";
    case "COMPLETED":
    case "NOT_SELECTED":
    case "WITHDRAWN":
    case "EXPIRED":
      return "closed";
  }
}

export interface HubBucket {
  group: HubGroup;
  rows: ApplicationWithChallenge[];
}

/** Buckets in HUB_GROUP_ORDER, most recently moved first, empties dropped. */
export function groupApplications(
  rows: ApplicationWithChallenge[],
): HubBucket[] {
  return HUB_GROUP_ORDER.map((group) => ({
    group,
    rows: rows
      .filter((row) => hubGroupFor(row.application.stage) === group)
      .sort(
        (a, b) =>
          toDate(b.application.stageEnteredAt).getTime() -
          toDate(a.application.stageEnteredAt).getTime(),
      ),
  })).filter((bucket) => bucket.rows.length > 0);
}

/**
 * ctaFor with a fallback, because a hub card with no button is a dead end —
 * the detail page is always somewhere to go.
 */
export function hubCtaFor(row: ApplicationWithChallenge): CtaTarget {
  return (
    ctaFor(row.application) ?? {
      label: "View challenge",
      href: `/challenges/${row.challenge.id}`,
    }
  );
}

export function milestoneProgress(project: ProjectRecord): {
  approved: number;
  total: number;
  percent: number;
} {
  const total = project.milestones.length;
  const approved = project.milestones.filter(
    (m) => m.status === "Approved",
  ).length;
  return { approved, total, percent: total === 0 ? 0 : approved / total };
}

// ----------------------------------------------------------------- todos

export type TodoKind = "action" | "offer" | "milestone" | "meeting";
export type TodoUrgency = "overdue" | "today" | "soon" | "later";

export interface HubTodo {
  id: string;
  kind: TodoKind;
  title: string;
  /** Which challenge this belongs to. */
  context: string;
  /** Date-only or datetime — always read through toDate(). */
  dueAt: string;
  urgency: TodoUrgency;
  dueLabel: string;
  cta: CtaTarget;
}

/** How far ahead a milestone has to be before it stops being "do next". */
const MILESTONE_HORIZON_DAYS = 10;

/** "soon" is the one-week horizon the marketplace already treats as urgent. */
function urgencyFor(dueAt: string): TodoUrgency {
  const days = daysUntil(dueAt);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

function dueLabelFor(dueAt: string): string {
  const days = daysUntil(dueAt);
  if (days < 0) {
    const late = Math.abs(days);
    return `${late} day${late === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/**
 * The "do next" strip. Everything is derived from data the pipeline already
 * carries — there is no separate todo fixture to drift out of sync.
 *
 * The dedupe rules matter more than the sources: an offer deadline and a
 * nextAction describe the same obligation, and so does a milestone whose due
 * date the partner has already restated as nextActionDue.
 */
export function buildTodos(rows: ApplicationWithChallenge[]): HubTodo[] {
  const todos: HubTodo[] = [];

  for (const row of rows) {
    const { application, challenge } = row;
    const group = hubGroupFor(application.stage);
    const context = challenge.title;

    // 1. An offer deadline is stated in hours, so it beats the date-only
    //    nextAction saying the same thing.
    const offer =
      application.stage === "INVITED" ? application.offer : null;

    if (offer) {
      todos.push({
        id: `${application.id}:offer`,
        kind: "offer",
        title: "Respond to your invitation",
        context,
        dueAt: offer.respondBy,
        urgency: urgencyFor(offer.respondBy),
        dueLabel: `${countdownLabel(offer.respondBy)} left`,
        cta: hubCtaFor(row),
      });
    } else if (
      application.nextAction &&
      application.nextActionDue &&
      (group === "needs-you" || group === "in-progress")
    ) {
      // 2. Waiting on someone else is not a todo, however it is worded.
      todos.push({
        id: `${application.id}:action`,
        kind: "action",
        title: application.nextAction,
        context,
        dueAt: application.nextActionDue,
        urgency: urgencyFor(application.nextActionDue),
        dueLabel: dueLabelFor(application.nextActionDue),
        cta: hubCtaFor(row),
      });
    }

    if (!application.project) continue;

    // 3. Milestones coming due, minus the one nextAction already covers.
    if (group === "in-progress") {
      for (const milestone of application.project.milestones) {
        if (milestone.status === "Approved") continue;
        if (daysUntil(milestone.dueDate) > MILESTONE_HORIZON_DAYS) continue;
        if (milestone.dueDate === application.nextActionDue) continue;

        todos.push({
          id: `${application.id}:milestone:${milestone.id}`,
          kind: "milestone",
          title: milestone.title,
          context,
          dueAt: milestone.dueDate,
          urgency: urgencyFor(milestone.dueDate),
          dueLabel: dueLabelFor(milestone.dueDate),
          cta: {
            label: "Open deliverables",
            href: `/workspace/${application.id}?tab=deliverables`,
          },
        });
      }
    }

    // 4. A meeting you could walk into right now.
    for (const meeting of application.project.meetings) {
      const state = meetingState(meeting);
      if (state !== "live" && state !== "starting") continue;

      todos.push({
        id: `${application.id}:meeting:${meeting.id}`,
        kind: "meeting",
        title: meeting.title,
        context,
        dueAt: meeting.startsAt,
        urgency: state === "live" ? "overdue" : "today",
        dueLabel: meetingTimeLabel(meeting),
        cta: { label: "Join meeting", href: `/meeting/${meeting.id}` },
      });
    }
  }

  return todos.sort((a, b) => {
    const aOverdue = a.urgency === "overdue" ? 0 : 1;
    const bOverdue = b.urgency === "overdue" ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return toDate(a.dueAt).getTime() - toDate(b.dueAt).getTime();
  });
}

export function todosThisWeek(todos: HubTodo[]): HubTodo[] {
  return todos.filter((todo) => todo.urgency !== "later");
}

// ---------------------------------------------------------------- agenda

export type AgendaKind = "deadline" | "offer" | "milestone" | "meeting";

export interface AgendaEvent {
  id: string;
  kind: AgendaKind;
  at: string;
  /** Deadlines and milestones are calendar days; meetings are instants. */
  allDay: boolean;
  title: string;
  context: string;
  timeLabel: string;
  href: string;
  /** Both present only on meetings — they drive the Join button. */
  meetingId?: string;
  meetingState?: MeetingState;
}

export interface AgendaDay {
  key: string;
  label: string;
  events: AgendaEvent[];
}

interface AgendaOptions {
  horizonDays?: number;
  maxEvents?: number;
}

const MS_PER_DAY = 86_400_000;
/** A live meeting started in the past but still belongs on the agenda. */
const LOOKBACK_MS = 3_600_000;

/**
 * Every dated thing across every application, merged and grouped by day. An
 * agenda rather than a month grid: with a handful of events a calendar is
 * mostly empty squares.
 */
export function buildAgenda(
  rows: ApplicationWithChallenge[],
  { horizonDays = 45, maxEvents = 12 }: AgendaOptions = {},
): AgendaDay[] {
  const events: AgendaEvent[] = [];

  for (const { application, challenge } of rows) {
    const group = hubGroupFor(application.stage);

    // An application deadline only matters while you're still being selected.
    if (group === "needs-you" || group === "waiting") {
      events.push({
        id: `${application.id}:deadline`,
        kind: "deadline",
        at: challenge.deadline,
        allDay: true,
        title: "Applications close",
        context: challenge.title,
        timeLabel: "All day",
        href: `/challenges/${challenge.id}`,
      });
    }

    if (application.stage === "INVITED" && application.offer) {
      events.push({
        id: `${application.id}:offer`,
        kind: "offer",
        at: application.offer.respondBy,
        allDay: false,
        title: "Invitation expires",
        context: challenge.title,
        timeLabel: formatTime(application.offer.respondBy),
        href: `/offer/${application.id}`,
      });
    }

    if (!application.project) continue;

    if (group === "in-progress") {
      for (const milestone of application.project.milestones) {
        if (milestone.status === "Approved") continue;
        events.push({
          id: `${application.id}:milestone:${milestone.id}`,
          kind: "milestone",
          at: milestone.dueDate,
          allDay: true,
          title: `${milestone.title} due`,
          context: challenge.title,
          timeLabel: "All day",
          href: `/workspace/${application.id}?tab=milestones`,
        });
      }
    }

    for (const meeting of sortMeetings(application.project.meetings)) {
      events.push({
        id: `${application.id}:meeting:${meeting.id}`,
        kind: "meeting",
        at: meeting.startsAt,
        allDay: false,
        title: meeting.title,
        context: challenge.title,
        timeLabel: meetingTimeLabel(meeting),
        href: `/meeting/${meeting.id}`,
        meetingId: meeting.id,
        meetingState: meetingState(meeting),
      });
    }
  }

  const from = TODAY.getTime() - LOOKBACK_MS;
  const until = TODAY.getTime() + horizonDays * MS_PER_DAY;

  const visible = events
    .filter((event) => {
      const at = toDate(event.at).getTime();
      return at >= from && at <= until;
    })
    .sort((a, b) => {
      // Compare the day first: "2026-08-03" and "2026-08-03T03:00:00Z" are the
      // same day but do not compare as strings.
      const dayDiff = dayKey(a.at).localeCompare(dayKey(b.at));
      if (dayDiff !== 0) return dayDiff;
      // All-day items head their day; they have no time to sort against.
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return toDate(a.at).getTime() - toDate(b.at).getTime();
    })
    .slice(0, maxEvents);

  const days: AgendaDay[] = [];
  for (const event of visible) {
    const key = dayKey(event.at);
    const day = days.at(-1);
    if (day?.key === key) {
      day.events.push(event);
    } else {
      days.push({ key, label: dayLabel(key), events: [event] });
    }
  }
  return days;
}
