import Link from "next/link";
import { VideoIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { MeetingState } from "@/lib/meetings";

interface JoinButtonProps {
  meetingId: string;
  state: MeetingState;
  size?: "sm" | "md";
}

/**
 * Weight follows urgency: a live meeting gets the solid brand button, one
 * that has already happened gets a plain link, because "Join" on a finished
 * meeting is an invitation to a dead end.
 */
export function JoinButton({ meetingId, state, size = "md" }: JoinButtonProps) {
  const label = state === "past" ? "Meeting notes" : "Join meeting";

  return (
    <Link
      href={`/meeting/${meetingId}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-card font-semibold whitespace-nowrap",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "sm" ? "h-7 px-2.5 text-meta" : "h-9 px-4",
        state === "live" || state === "starting"
          ? "bg-brand text-white hover:bg-brand-deep hover:text-white"
          : state === "upcoming"
            ? "border border-line text-brand hover:border-brand"
            : "text-ink-3 hover:text-brand",
      )}
    >
      <VideoIcon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </Link>
  );
}
