import { formatDate, formatTime, toDate } from "@/lib/dates";
import { minutesUntil, type StageVariant } from "@/lib/pipeline";
import type { Meeting, ProjectRecord } from "@/lib/types";

/**
 * Derivations over a single meeting. Kept out of the components so the hub
 * agenda and the project workspace cannot disagree about whether something is
 * live.
 */

export type MeetingState = "live" | "starting" | "upcoming" | "past";

/**
 * The only two fields the timing helpers below actually need. Widened from the
 * full Meeting record so database-backed rows can use them without being
 * reshaped into the static fixture type.
 */
export interface MeetingTiming {
  durationMinutes: number | null;
  startsAt: string;
}

/** Within this many minutes of the start, a meeting is worth acting on. */
const STARTING_WINDOW_MINUTES = 60;

export function meetingEndsAt(meeting: MeetingTiming): Date {
  return new Date(
    toDate(meeting.startsAt).getTime() + (meeting.durationMinutes ?? 0) * 60_000,
  );
}

export function meetingState(meeting: MeetingTiming): MeetingState {
  const untilStart = minutesUntil(meeting.startsAt);
  if (untilStart > STARTING_WINDOW_MINUTES) return "upcoming";
  if (untilStart > 0) return "starting";
  return minutesUntil(meetingEndsAt(meeting).toISOString()) > 0
    ? "live"
    : "past";
}

/**
 * "Live now" / "Starts in 20 min" / "Thu 30 Jul · 14:00" / "23 Jun 2026".
 * Past meetings deliberately avoid the countdown vocabulary — a finished
 * kickoff is not "expired".
 */
export function meetingTimeLabel(meeting: MeetingTiming): string {
  const state = meetingState(meeting);
  if (state === "live") return "Live now";
  if (state === "starting") {
    const mins = minutesUntil(meeting.startsAt);
    return `Starts in ${mins} min`;
  }
  if (state === "past") return formatDate(meeting.startsAt);

  const day = toDate(meeting.startsAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${day} · ${formatTime(meeting.startsAt)}`;
}

export function meetingChipVariant(state: MeetingState): StageVariant {
  switch (state) {
    case "live":
      return "warn";
    case "starting":
      return "accent";
    case "upcoming":
      return "default";
    case "past":
      return "outline-dashed";
  }
}

export function sortMeetings(meetings: Meeting[]): Meeting[] {
  return [...meetings].sort(
    (a, b) => toDate(a.startsAt).getTime() - toDate(b.startsAt).getTime(),
  );
}

/** The earliest meeting that has not finished. Null once a project is done. */
export function nextMeeting(project: ProjectRecord): Meeting | null {
  return (
    sortMeetings(project.meetings).find((m) => meetingState(m) !== "past") ??
    null
  );
}

/** The most recent finished meeting — what a closed project shows instead. */
export function lastMeeting(project: ProjectRecord): Meeting | null {
  const past = sortMeetings(project.meetings).filter(
    (m) => meetingState(m) === "past",
  );
  return past.at(-1) ?? null;
}

/**
 * milestoneId → meeting, for rendering a Join button inside the milestone
 * timeline. Earliest meeting wins a contested milestone; two Join buttons in
 * one timeline row would be worse than dropping the later one.
 */
export function meetingsByMilestone(meetings: Meeting[]): Map<string, Meeting> {
  const map = new Map<string, Meeting>();
  for (const meeting of sortMeetings(meetings)) {
    if (meeting.milestoneId && !map.has(meeting.milestoneId)) {
      map.set(meeting.milestoneId, meeting);
    }
  }
  return map;
}
