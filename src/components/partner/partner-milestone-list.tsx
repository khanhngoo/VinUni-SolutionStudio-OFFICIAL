"use client";

import { useState } from "react";
import { Chip, type ChipVariant } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { StripedPlaceholder } from "@/components/ui/striped-placeholder";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate } from "@/lib/dates";
import { meetingTimeLabel, meetingsByMilestone } from "@/lib/meetings";
import type { Meeting, Milestone, MilestoneStatus } from "@/lib/types";

const MILESTONE_VARIANT: Record<MilestoneStatus, ChipVariant> = {
  Approved: "ok",
  "Revision requested": "warn",
  Submitted: "accent",
  "In progress": "default",
  "Not started": "outline-dashed",
};

type Decision = "approved" | "revision";

/**
 * The student's `MilestoneList` with the partner's half of the dual sign-off
 * made actionable.
 *
 * Deliberately a sibling component rather than a `readOnly` prop on the
 * student's: that one is a timeline a student reads, this one is a queue a
 * partner works, and the two will keep diverging. What they share — the spine,
 * the status vocabulary, the sign-off pills — is the visual language, not the
 * implementation.
 *
 * Decisions are local state and reset on reload, matching the rest of v1.
 */
export function PartnerMilestoneList({
  milestones,
  meetings = [],
  readOnly = false,
}: {
  milestones: Milestone[];
  meetings?: Meeting[];
  readOnly?: boolean;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [openNote, setOpenNote] = useState<string | null>(null);
  const byMilestone = meetingsByMilestone(meetings);

  return (
    <ol className="flex flex-col">
      {milestones.map((milestone, index) => {
        const decision = decisions[milestone.id];
        const posterApproved =
          milestone.posterApproved || decision === "approved";
        const status: MilestoneStatus =
          decision === "approved" && milestone.facultyApproved
            ? "Approved"
            : decision === "revision"
              ? "Revision requested"
              : milestone.status;

        const days = daysUntil(milestone.dueDate);
        const overdue = days < 0 && status !== "Approved";
        const last = index === milestones.length - 1;
        const meeting = byMilestone.get(milestone.id);
        const awaitingYou = status === "Submitted" && !posterApproved;

        return (
          <li key={milestone.id} className="flex gap-3.5">
            <div className="flex flex-col items-center shrink-0">
              <span
                className={cn(
                  "w-[18px] h-[18px] rounded-full border-[1.5px] grid place-items-center mt-1",
                  status === "Approved"
                    ? "bg-ok border-ok text-white"
                    : awaitingYou
                      ? "bg-card border-2 border-warn ring-[3px] ring-warn-soft"
                      : status === "In progress"
                        ? "bg-card border-2 border-accent ring-[3px] ring-accent-soft"
                        : "bg-card border-line",
                )}
              >
                {status === "Approved" ? (
                  <CheckIcon className="w-2.5 h-2.5" />
                ) : null}
              </span>
              {!last ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-[1.5px] flex-1 my-1",
                    status === "Approved" ? "bg-ok" : "bg-line",
                  )}
                />
              ) : null}
            </div>

            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-5")}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-ink normal-case tracking-normal text-[13px] font-semibold">
                  {milestone.title}
                </h3>
                <Chip variant={MILESTONE_VARIANT[status]}>{status}</Chip>
                {awaitingYou ? (
                  <Chip variant="warn">Waiting on you</Chip>
                ) : null}
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

              {status === "Submitted" || status === "Approved" ? (
                <div className="mt-2.5 bg-line-2 rounded-card px-3 py-2.5 flex items-center gap-2.5">
                  <StripedPlaceholder className="w-6 h-6 rounded-[3px] shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-medium text-ink truncate">
                      {fileNameFor(milestone)}
                    </span>
                    <span className="block text-meta text-ink-3">
                      Submitted by the team
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-meta font-semibold text-brand hover:text-brand-deep shrink-0"
                  >
                    Open
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 mt-2">
                <SignoffPill
                  label="Faculty"
                  approved={milestone.facultyApproved}
                />
                <SignoffPill label="You" approved={posterApproved} />
              </div>

              {!readOnly && awaitingYou ? (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDecisions((d) => ({
                          ...d,
                          [milestone.id]: "approved",
                        }))
                      }
                      className="inline-flex items-center justify-center h-8 px-3 rounded-card bg-ok text-white text-[12px] font-semibold hover:opacity-90"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenNote(
                          openNote === milestone.id ? null : milestone.id,
                        )
                      }
                      className="inline-flex items-center justify-center h-8 px-3 rounded-card border border-line text-ink-2 text-[12px] font-medium hover:border-warn hover:text-warn"
                    >
                      Request revision
                    </button>
                  </div>

                  {openNote === milestone.id ? (
                    <div className="mt-2.5 border border-line rounded-card p-3">
                      <label className="block text-[12px] font-semibold text-ink-2 mb-1.5">
                        What needs to change
                      </label>
                      <textarea
                        rows={3}
                        className="w-full border border-line rounded-card px-3 py-2 text-body resize-y"
                        placeholder="Be specific — the team sees this verbatim."
                      />
                      <p className="text-meta text-ink-3 mt-2 leading-relaxed">
                        The milestone returns to the team as{" "}
                        <strong className="text-ink font-semibold">
                          Revision requested
                        </strong>
                        . The supervisor is notified; their approval is not
                        reset.
                      </p>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => setOpenNote(null)}
                          className="inline-flex items-center justify-center h-8 px-3 rounded-card border border-line text-ink-2 text-[12px] font-medium hover:border-brand hover:text-brand"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecisions((d) => ({
                              ...d,
                              [milestone.id]: "revision",
                            }));
                            setOpenNote(null);
                          }}
                          className="inline-flex items-center justify-center h-8 px-3 rounded-card bg-red text-white text-[12px] font-semibold hover:opacity-90"
                        >
                          Send request
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {decision ? (
                <p className="text-meta text-ok mt-2">
                  {decision === "approved"
                    ? "You approved this — not saved, this demo keeps decisions in memory."
                    : "Revision requested — not saved, this demo keeps decisions in memory."}
                </p>
              ) : null}

              {meeting ? (
                <div className="flex flex-wrap items-center gap-2.5 mt-2.5 pt-2.5 border-t border-line-2">
                  <span className="text-meta text-ink-2">
                    {meeting.title} · {meetingTimeLabel(meeting)}
                  </span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

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

/** The fixtures carry no filenames, so one is derived from the title. */
function fileNameFor(milestone: Milestone): string {
  return `${milestone.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
}
