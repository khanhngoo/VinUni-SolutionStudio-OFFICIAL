import { Chip } from "@/components/ui/chip";
import { CalendarIcon } from "@/components/ui/icons";
import { JoinButton } from "@/components/workspace/join-button";
import { formatDate, formatDateTime } from "@/lib/dates";
import { meetingKindLabel } from "@/lib/labels";
import {
  meetingChipVariant,
  meetingState,
  meetingTimeLabel,
} from "@/lib/meetings";

interface WorkspaceMeeting {
  attendees: Array<{ fullName: string; role: string | null }>;
  durationMinutes: number | null;
  kind: string;
  publicId: string;
  startsAt: string;
  title: string;
}

/**
 * Takes the whole schedule rather than one meeting so the "nothing scheduled"
 * branch — a finished engagement whose meetings are all in the past — lives
 * here instead of in every caller.
 */
export function NextMeetingCard({ meetings }: { meetings: WorkspaceMeeting[] }) {
  const upcoming = meetings.filter(
    (meeting) => meetingState(meeting) !== "past"
  );
  const meeting = upcoming[0];

  if (!meeting) {
    const previous = meetings.at(-1);
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
            <Chip>{meetingKindLabel(meeting.kind)}</Chip>
          </div>
          <p className="font-semibold text-ink mt-2">{meeting.title}</p>
          <p className="text-meta text-ink-3 mt-1">
            {formatDateTime(meeting.startsAt)}
            {meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ""}
            {meeting.attendees.length > 0
              ? ` · ${meeting.attendees.map((a) => a.fullName).join(", ")}`
              : ""}
          </p>
        </div>

        <JoinButton meetingId={meeting.publicId} state={state} />
      </div>
    </div>
  );
}
