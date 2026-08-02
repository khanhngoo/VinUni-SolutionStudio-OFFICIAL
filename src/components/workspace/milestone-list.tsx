import { Chip, type ChipVariant } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate } from "@/lib/dates";
import type { Milestone, MilestoneStatus } from "@/lib/types";

export const MILESTONE_VARIANT: Record<MilestoneStatus, ChipVariant> = {
  Approved: "ok",
  "Revision requested": "warn",
  Submitted: "accent",
  "In progress": "default",
  "Not started": "outline-dashed",
};

interface MilestoneListProps {
  milestones: Milestone[];
  /** Dual sign-off detail belongs on the deliverables view, not the timeline. */
  showSignoff?: boolean;
}

export function MilestoneList({
  milestones,
  showSignoff = false,
}: MilestoneListProps) {
  return (
    <ol className="flex flex-col">
      {milestones.map((milestone, index) => {
        const days = daysUntil(milestone.dueDate);
        const overdue = days < 0 && milestone.status !== "Approved";
        const last = index === milestones.length - 1;

        return (
          <li key={milestone.id} className="flex gap-3.5">
            <div className="flex flex-col items-center shrink-0">
              <span
                className={cn(
                  "w-[18px] h-[18px] rounded-full border-[1.5px] grid place-items-center mt-1",
                  milestone.status === "Approved"
                    ? "bg-ok border-ok text-white"
                    : milestone.status === "In progress"
                      ? "bg-card border-2 border-accent ring-[3px] ring-accent-soft"
                      : "bg-card border-line",
                )}
              >
                {milestone.status === "Approved" ? (
                  <CheckIcon className="w-2.5 h-2.5" />
                ) : null}
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-[1.5px] flex-1 my-1",
                    milestone.status === "Approved" ? "bg-ok" : "bg-line",
                  )}
                />
              ) : null}
            </div>

            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-ink normal-case tracking-normal text-[13px] font-semibold">
                  {milestone.title}
                </h3>
                <Chip variant={MILESTONE_VARIANT[milestone.status]}>
                  {milestone.status}
                </Chip>
              </div>

              <p className="text-ink-2 mt-1">{milestone.deliverable}</p>

              <p
                className={cn(
                  "text-meta mt-1.5",
                  overdue ? "text-warn font-medium" : "text-ink-3",
                )}
              >
                Due {formatDate(milestone.dueDate)}
                {overdue ? ` · ${Math.abs(days)} days overdue` : ""}
              </p>

              {showSignoff ? (
                <div className="flex flex-wrap gap-3 mt-2">
                  <SignoffPill
                    label="Faculty"
                    approved={milestone.facultyApproved}
                  />
                  <SignoffPill
                    label="Partner"
                    approved={milestone.posterApproved}
                  />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Dual sign-off (PRD D7): faculty and partner both approve before closure. */
function SignoffPill({
  label,
  approved,
}: {
  label: string;
  approved: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta",
        approved ? "text-ok" : "text-ink-3",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "w-3.5 h-3.5 rounded-full grid place-items-center border",
          approved ? "bg-ok border-ok text-white" : "bg-card border-line",
        )}
      >
        {approved ? <CheckIcon className="w-2 h-2" /> : null}
      </span>
      {label} {approved ? "approved" : "pending"}
    </span>
  );
}
