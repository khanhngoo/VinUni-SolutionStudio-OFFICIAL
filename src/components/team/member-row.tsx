import { Chip, type ChipVariant } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/text";
import { formatDate } from "@/lib/dates";
import type { InviteStatus, TeamMember } from "@/lib/types";

const STATUS_VARIANT: Record<InviteStatus, ChipVariant> = {
  leader: "solid",
  accepted: "ok",
  invited: "warn",
  declined: "outline-dashed",
};

const STATUS_LABELS: Record<InviteStatus, string> = {
  leader: "Leader",
  accepted: "Accepted",
  invited: "Invited",
  declined: "Declined",
};

/**
 * One person on a team. Shows the two facts that matter to everyone else —
 * the role they hold and the hours they bring — rather than a profile summary.
 */
export function MemberRow({
  member,
  trailing,
}: {
  member: TeamMember;
  /** Slot for a role picker, a status chip, or nothing. */
  trailing?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "bg-card border rounded-card px-4 py-3 flex items-center gap-3",
        member.status === "invited"
          ? "border-dashed border-line"
          : "border-line",
        member.status === "declined" && "border-dashed border-line opacity-60",
      )}
    >
      <span className="w-8 h-8 rounded-full bg-brand-soft text-brand grid place-items-center text-[11px] font-semibold shrink-0">
        {initials(member.name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-ink">{member.name}</span>
          <Chip variant={STATUS_VARIANT[member.status]}>
            {STATUS_LABELS[member.status]}
            {member.status === "invited" && member.invitedAt
              ? ` · ${formatDate(member.invitedAt)}`
              : ""}
          </Chip>
        </div>
        <p className="text-meta text-ink-3 mt-0.5">
          {member.major} · Year {member.year} · {member.role} ·{" "}
          {member.hoursAvailable} h/wk free
        </p>
      </div>

      {trailing}
    </li>
  );
}
