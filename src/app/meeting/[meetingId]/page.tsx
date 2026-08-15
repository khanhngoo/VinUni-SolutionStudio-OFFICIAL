import Link from "next/link";
import { notFound } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { VideoIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { formatDateTime } from "@/lib/dates";
import {
  meetingChipVariant,
  meetingState,
  meetingTimeLabel,
} from "@/lib/meetings";
import { getAllMeetingIds, getMeetingById } from "@/lib/queries";

export function generateStaticParams() {
  return getAllMeetingIds().map((meetingId) => ({ meetingId }));
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const row = getMeetingById(meetingId);
  if (!row) notFound();

  const { meeting, application, challenge } = row;
  const state = meetingState(meeting);

  return (
    <article className="max-w-[820px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/workspace">Your work</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/workspace/${application.id}`}>{challenge.title}</Link>
        <span className="mx-1.5">›</span>
        Meeting
      </nav>

      <div className="flex flex-wrap gap-1.5 mt-3.5 mb-2.5">
        <Chip variant={meetingChipVariant(state)}>
          {meetingTimeLabel(meeting)}
        </Chip>
        <Chip>{meeting.kind}</Chip>
        <Chip>{meeting.durationMinutes} min</Chip>
      </div>

      <h1>{meeting.title}</h1>
      <p className="text-ink-2 mt-2">{formatDateTime(meeting.startsAt)}</p>

      <div className="mt-6 bg-card border border-line rounded-card p-6 text-center">
        <span className="w-[26px] h-[26px] rounded-card bg-line-2 border border-line grid place-items-center text-ink-2 mx-auto">
          <VideoIcon className="w-3.5 h-3.5" />
        </span>
        <p className="font-semibold text-ink mt-3">
          Video calls aren&apos;t wired up yet
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          Joining from inside the platform is coming soon. Until then this
          meeting runs on the link your partner shared.
        </p>
        <p className="text-meta text-ink-3 mt-3 break-all">{meeting.joinUrl}</p>
        <Link
          href={`/workspace/${application.id}`}
          className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Back to workspace
        </Link>
      </div>

      <Section title="Who's coming">
        <ul className="grid sm:grid-cols-3 gap-2.5">
          {meeting.attendees.map((attendee) => (
            <li
              key={`${attendee.name}-${attendee.role}`}
              className="bg-card border border-line rounded-card px-4 py-3.5"
            >
              <p className="font-semibold text-ink">{attendee.name}</p>
              <p className="text-meta text-ink-3 mt-0.5">{attendee.role}</p>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}
