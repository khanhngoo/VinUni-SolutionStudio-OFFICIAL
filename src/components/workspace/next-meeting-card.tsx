import { Chip } from "@/components/ui/chip";
import { CalendarIcon } from "@/components/ui/icons";
import { JoinButton } from "@/components/workspace/join-button";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  lastMeeting,
  meetingChipVariant,
  meetingState,
  meetingTimeLabel,
  nextMeeting,
} from "@/lib/meetings";
import type { ProjectRecord } from "@/lib/types";

/**
 * Takes the whole project rather than a meeting so the "nothing scheduled"
 * branch — a finished engagement whose meetings are all in the past — lives
 * here instead of in every caller.
 */
export function NextMeetingCard({ project }: { project: ProjectRecord }) {
  const meeting = nextMeeting(project);

  if (!meeting) {
    const previous = lastMeeting(project);
    return (
      <div className="bg-card border border-line rounded-card p-5 flex items-start gap-3.5">
        <span className="w-[26px] h-[26px] shrink-0 rounded-card bg-line-2 border border-line grid place-items-center text-ink-2">
          <CalendarIcon className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">Nothing scheduled</p>
          <p className="text-ink-2 mt-1">
            {previous
              ? `Last met on ${formatDate(previous.startsAt)} — ${previous.title}.`
              : "No meetings have been booked on this project."}
          </p>
        </div>
      </div>
    );
  }

  const state = meetingState(meeting);

  return (
    <div className="bg-card border border-line rounded-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip variant={meetingChipVariant(state)}>
              {meetingTimeLabel(meeting)}
            </Chip>
            <Chip>{meeting.kind}</Chip>
          </div>
          <p className="font-semibold text-ink mt-2">{meeting.title}</p>
          <p className="text-meta text-ink-3 mt-1">
            {formatDateTime(meeting.startsAt)} · {meeting.durationMinutes} min ·{" "}
            {meeting.attendees.map((a) => a.name).join(", ")}
          </p>
        </div>

        <JoinButton meetingId={meeting.id} state={state} />
      </div>
    </div>
  );
}
