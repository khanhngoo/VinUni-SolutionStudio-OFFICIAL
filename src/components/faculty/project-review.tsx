"use client";

import { useState } from "react";
import { FeedbackDialog } from "@/components/faculty/feedback-dialog";
import { RequestChangesDialog } from "@/components/faculty/request-changes-dialog";
import { Chip, type ChipVariant } from "@/components/ui/chip";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { daysUntil, formatDate, formatDateTime } from "@/lib/dates";
import type { Application, Challenge, Milestone, MilestoneStatus } from "@/lib/types";

const MILESTONE_VARIANT: Record<MilestoneStatus, ChipVariant> = {
  Approved: "ok",
  "Revision requested": "warn",
  Submitted: "accent",
  "In progress": "default",
  "Not started": "outline-dashed",
};

/**
 * The supervised project as its faculty member needs to see it: the brief they
 * are mentoring against, every milestone with both sign-offs, and the review
 * actions attached to the milestone being reviewed — so approving is a
 * judgement about a specific deliverable rather than a button in a list.
 */
export function ProjectReview({
  application,
  challenge,
  supervisorName,
}: {
  application: Application;
  challenge: Challenge;
  supervisorName: string;
}) {
  const project = application.project;

  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [returned, setReturned] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState(project?.facultyFeedback ?? null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [changesFor, setChangesFor] = useState<Milestone | null>(null);

  if (!project) {
    return (
      <Section title="Nothing to review yet">
        <div className="bg-card border border-line rounded-card p-6 text-center">
          <p className="font-semibold text-ink">
            This team is still in selection
          </p>
          <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
            The brief, milestones and deliverables open to you once they are
            selected and the engagement starts. Their application is currently{" "}
            {application.stage.toLowerCase().replace(/_/g, " ")}.
          </p>
        </div>
      </Section>
    );
  }

  const closed = application.stage === "COMPLETED";

  function statusOf(milestone: Milestone): MilestoneStatus {
    if (approved.has(milestone.id)) return "Approved";
    if (returned.has(milestone.id)) return "Revision requested";
    return milestone.status;
  }

  function facultySignedOff(milestone: Milestone): boolean {
    return milestone.facultyApproved || approved.has(milestone.id);
  }

  const done = project.milestones.filter(
    (m) => statusOf(m) === "Approved",
  ).length;

  return (
    <>
      <Section title="The brief" aside="Shared with you as supervisor">
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-3 text-ink-2">
          {project.fullBrief.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>
      </Section>

      <Section
        title="Milestones"
        aside={`${done} of ${project.milestones.length} approved`}
      >
        <ol className="flex flex-col gap-2.5">
          {project.milestones.map((milestone) => {
            const status = statusOf(milestone);
            const awaiting = status === "Submitted" && !facultySignedOff(milestone);
            const overdue =
              daysUntil(milestone.dueDate) < 0 && status !== "Approved";

            return (
              <li
                key={milestone.id}
                className={cn(
                  "bg-card border rounded-card p-4",
                  awaiting ? "border-accent" : "border-line",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{milestone.title}</span>
                  <Chip variant={MILESTONE_VARIANT[status]}>{status}</Chip>
                </div>

                <p className="text-ink-2 mt-1">{milestone.deliverable}</p>

                <p
                  className={cn(
                    "text-meta mt-1.5",
                    overdue ? "text-warn font-medium" : "text-ink-3",
                  )}
                >
                  Due {formatDate(milestone.dueDate)}
                  {overdue
                    ? ` · ${Math.abs(daysUntil(milestone.dueDate))} days overdue`
                    : ""}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-2.5">
                  <SignoffPill
                    label="You"
                    approved={facultySignedOff(milestone)}
                  />
                  <SignoffPill label="Partner" approved={milestone.posterApproved} />
                </div>

                {awaiting && !closed ? (
                  <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-line-2">
                    <button
                      type="button"
                      onClick={() => setChangesFor(milestone)}
                      className="h-8 px-3 rounded-card border border-red text-red font-semibold hover:bg-red-soft"
                    >
                      Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setApproved((prev) => new Set(prev).add(milestone.id))
                      }
                      className="h-8 px-3.5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
                    >
                      Approve
                    </button>
                    <span className="text-meta text-ink-3">
                      The partner signs off separately.
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Section>

      {project.meetings.length > 0 ? (
        <Section title="Meetings">
          <ul className="flex flex-col gap-2">
            {project.meetings.map((meeting) => (
              <li
                key={meeting.id}
                className="bg-card border border-line rounded-card px-4 py-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-ink">{meeting.title}</p>
                  <p className="text-meta text-ink-3 mt-0.5">
                    {meeting.kind} · {meeting.durationMinutes} min ·{" "}
                    {meeting.attendees.map((a) => a.name).join(", ")}
                  </p>
                </div>
                <span className="text-meta text-ink-2">
                  {formatDateTime(meeting.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {closed ? (
        <Section title="Final feedback">
          <div className="bg-card border border-line rounded-card p-5">
            {feedback ? (
              <>
                <p className="text-ink-2 whitespace-pre-line">{feedback}</p>
                <p className="text-meta text-ink-3 mt-3 pt-3 border-t border-line-2">
                  Written by {supervisorName} · visible to {application.team.name}
                </p>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">
                    This project closed without your review
                  </p>
                  <p className="text-meta text-ink-3 mt-0.5">
                    Completed {formatDate(application.stageEnteredAt)}. Your
                    feedback becomes part of the team&apos;s record.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
                >
                  Write feedback
                </button>
              </div>
            )}
          </div>
        </Section>
      ) : null}

      <RequestChangesDialog
        open={changesFor !== null}
        milestoneTitle={changesFor?.title ?? ""}
        onCancel={() => setChangesFor(null)}
        onSubmit={() => {
          if (changesFor) {
            setReturned((prev) => new Set(prev).add(changesFor.id));
          }
          setChangesFor(null);
        }}
      />

      <FeedbackDialog
        open={feedbackOpen}
        challengeTitle={challenge.title}
        teamName={application.team.name}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={(text) => setFeedback(text)}
      />
    </>
  );
}

/** Dual sign-off (PRD D7): faculty and partner both approve before closure. */
function SignoffPill({ label, approved }: { label: string; approved: boolean }) {
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
