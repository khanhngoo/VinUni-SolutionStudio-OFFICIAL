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
 * Table-density labels. A row has one line to spare, so "Respond · 1 day 16
 * hrs left" becomes "Respond" and the countdown moves to the due column.
 */
const SHORT_LABELS: Partial<Record<ApplicationStage, string>> = {
  TEST_PENDING: "Start test",
  TEST_SUBMITTED: "Result",
  INVITED: "Respond",
  ACTIVE: "Open",
  IN_REVIEW: "Open",
  COMPLETED: "Open",
  NOT_SELECTED: "Result",
};

/**
 * ctaFor with a fallback, because a hub row with no action is a dead end —
 * the challenge page is always somewhere to go. The destination stays
 * single-sourced in ctaFor; only the wording is shortened here.
 */
export function hubCtaFor(row: ApplicationWithChallenge): CtaTarget {
  const fallback = `/challenges/${row.challenge.id}`;
  const href = ctaFor(row.application)?.href ?? fallback;
  return {
    href,
    label: href === fallback ? "View" : SHORT_LABELS[row.application.stage] ?? "View",
  };
}

/** Urgent enough to earn the warn colour rather than muted grey. */
const URGENT_WITHIN_DAYS = 3;

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
 * The one date a row should show. An overdue milestone outranks the partner's
 * stated next action — being late on work already started is the more
 * pressing fact, and nextActionDue would otherwise hide it.
 */
export function hubDueFor(
  row: ApplicationWithChallenge,
): { label: string; urgent: boolean } | null {
  const { application } = row;

  if (application.stage === "INVITED" && application.offer) {
    return {
      label: `${countdownLabel(application.offer.respondBy)} left`,
      urgent: true,
    };
  }

  if (application.project && hubGroupFor(application.stage) === "in-progress") {
    const overdue = application.project.milestones
      .filter((m) => m.status !== "Approved" && daysUntil(m.dueDate) < 0)
      .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0];

    if (overdue) {
      return { label: dueLabelFor(overdue.dueDate), urgent: true };
    }
  }

  if (application.nextActionDue) {
    return {
      label: dueLabelFor(application.nextActionDue),
      urgent: daysUntil(application.nextActionDue) <= URGENT_WITHIN_DAYS,
    };
  }

  return null;
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

/**
 * How many applications are actually pressing. Deliberately the same test that
 * colours a due cell warn, so the headline count is something the student can
 * verify by looking down the table rather than a number only the code knows.
 */
export function urgentCount(rows: ApplicationWithChallenge[]): number {
  return rows.filter((row) => hubDueFor(row)?.urgent).length;
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

  return groupAgendaEvents(visible);
}

/**
 * Windows, sorts and groups loose agenda events into days.
 *
 * Split out of `buildAgenda` so the database-backed hub can share the ordering
 * rules — all-day items heading their day, meetings sorted by instant — rather
 * than growing a second, subtly different copy.
 */
export function groupAgendaEvents(
  events: AgendaEvent[],
  { horizonDays, maxEvents }: AgendaOptions = {}
): AgendaDay[] {
  const windowed =
    horizonDays === undefined && maxEvents === undefined
      ? events
      : windowEvents(events, { horizonDays, maxEvents });

  const days: AgendaDay[] = [];
  for (const event of windowed) {
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

function windowEvents(
  events: AgendaEvent[],
  { horizonDays = 45, maxEvents = 12 }: AgendaOptions
): AgendaEvent[] {
  const from = TODAY.getTime();
  const until = TODAY.getTime() + horizonDays * MS_PER_DAY;

  return events
    .filter((event) => {
      const at = toDate(event.at).getTime();
      return at >= from && at <= until;
    })
    .sort(compareAgendaEvents)
    .slice(0, maxEvents);
}

function compareAgendaEvents(a: AgendaEvent, b: AgendaEvent) {
  const dayDiff = dayKey(a.at).localeCompare(dayKey(b.at));
  if (dayDiff !== 0) return dayDiff;
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return toDate(a.at).getTime() - toDate(b.at).getTime();
}
