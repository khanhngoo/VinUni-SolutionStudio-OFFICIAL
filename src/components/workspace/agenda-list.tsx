import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { JoinButton } from "@/components/workspace/join-button";
import { cn } from "@/lib/cn";
import type { AgendaDay, AgendaKind } from "@/lib/workspace";

const KIND_LABELS: Record<AgendaKind, string> = {
  deadline: "Deadline",
  offer: "Invitation",
  milestone: "Milestone",
  meeting: "Meeting",
};

export function AgendaList({ days }: { days: AgendaDay[] }) {
  if (days.length === 0) {
    return (
      <div className="bg-card border border-line rounded-card px-5 py-6 text-center">
        <p className="font-semibold text-ink">Nothing scheduled</p>
        <p className="text-ink-2 mt-1.5">
          No deadlines or meetings in the next six weeks.
        </p>
      </div>
    );
  }

  return (
    <ol className="bg-card border border-line rounded-card divide-y divide-line-2">
      {days.map((day) => (
        <li key={day.key} className="px-5 py-4">
          <h3 className="text-ink-3">{day.label}</h3>

          <ul className="flex flex-col gap-2.5 mt-2.5">
            {day.events.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span
                  className={cn(
                    "text-meta w-[68px] shrink-0",
                    event.allDay ? "text-ink-3" : "text-ink-2 font-medium",
                  )}
                >
                  {event.timeLabel}
                </span>

                <Link
                  href={event.href}
                  className="font-semibold text-ink hover:text-brand"
                >
                  {event.title}
                </Link>

                <span className="text-meta text-ink-3">{event.context}</span>

                <span className="ml-auto flex items-center gap-2.5">
                  {event.meetingId && event.meetingState ? (
                    <JoinButton
                      meetingId={event.meetingId}
                      state={event.meetingState}
                      size="sm"
                    />
                  ) : null}
                  <Chip>{KIND_LABELS[event.kind]}</Chip>
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
