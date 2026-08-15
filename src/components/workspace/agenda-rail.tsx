import Link from "next/link";
import { JoinButton } from "@/components/workspace/join-button";
import { cn } from "@/lib/cn";
import type { AgendaDay } from "@/lib/workspace";

/**
 * The upcoming-dates column. A rail rather than a full-width block: the dates
 * are reference material you scan, not the thing you came to act on, and
 * beside the table they stop competing for vertical space.
 */
export function AgendaRail({ days }: { days: AgendaDay[] }) {
  if (days.length === 0) {
    return (
      <p className="text-meta text-ink-3">
        Nothing scheduled in the next six weeks.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-4">
      {days.map((day) => (
        <li key={day.key}>
          <h3 className="text-ink-3">{day.label}</h3>

          <ul className="flex flex-col gap-2 mt-2">
            {day.events.map((event) => {
              const state = event.meetingState;
              const live = state === "live" || state === "starting";

              return (
                <li key={event.id} className="flex gap-2.5">
                  <span
                    className={cn(
                      "text-meta w-[52px] shrink-0",
                      live ? "text-warn font-medium" : "text-ink-3",
                    )}
                  >
                    {event.timeLabel}
                  </span>

                  <span className="min-w-0">
                    <Link
                      href={event.href}
                      className="text-ink hover:text-brand"
                    >
                      {event.title}
                    </Link>
                    <span className="block text-meta text-ink-3 mt-0.5">
                      {event.context}
                    </span>
                    {event.meetingId && state && live ? (
                      <span className="block mt-1.5">
                        <JoinButton
                          meetingId={event.meetingId}
                          state={state}
                          size="sm"
                        />
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
