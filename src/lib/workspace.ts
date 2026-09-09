import { dayKey, dayLabel, now, toDate } from "@/lib/dates";
import type { MeetingState } from "@/lib/meetings";
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

/** What kind of thing sits on the agenda, which decides its icon and copy. */
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
  const anchor = now().getTime();
  const from = anchor;
  const until = anchor + horizonDays * MS_PER_DAY;

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
