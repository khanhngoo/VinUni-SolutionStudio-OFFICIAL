"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ConfirmDeclineDialog } from "@/components/faculty/confirm-decline-dialog";
import { FeedbackDialog } from "@/components/faculty/feedback-dialog";
import { RequestChangesDialog } from "@/components/faculty/request-changes-dialog";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import { teamSize } from "@/lib/teams";
import type { ApplicationWithChallenge } from "@/lib/queries";
import type {
  FeedbackQueueItem,
  InviteQueueItem,
  MilestoneQueueItem,
} from "@/lib/supervision";
import type { Faculty } from "@/lib/types";

type ItemKind = "invite" | "milestone" | "feedback";

interface FacultyQueueProps {
  faculty: Faculty;
  invites: InviteQueueItem[];
  milestones: MilestoneQueueItem[];
  feedback: FeedbackQueueItem[];
  /** Supervised teams with nothing outstanding — the only way to reach them. */
  settled: ApplicationWithChallenge[];
}

/**
 * All state here is local. There is no persistence layer, so accepting,
 * approving or writing feedback updates this screen only — reloading returns
 * the queue to its seeded state, the same way the student's offer and
 * deliverable flows behave.
 */
export function FacultyQueue({
  faculty,
  invites: initialInvites,
  milestones: initialMilestones,
  feedback: initialFeedback,
  settled,
}: FacultyQueueProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [milestones, setMilestones] = useState(initialMilestones);
  const [feedback, setFeedback] = useState(initialFeedback);
  // Accepting a supervision consumes a slot, so the load bar has to move with
  // it — otherwise it keeps reporting the seeded number all session.
  const [slotsUsed, setSlotsUsed] = useState(faculty.slotsUsed);

  const [typeFilter, setTypeFilter] = useState<Record<ItemKind, boolean>>({
    invite: true,
    milestone: true,
    feedback: true,
  });
  const [teamFilter, setTeamFilter] = useState<Set<string>>(new Set());

  const atCapacity = slotsUsed >= faculty.slotsTotal;

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const { application, challenge } of [...invites, ...milestones, ...feedback]) {
      seen.set(application.id, challenge.title);
    }
    return [...seen.entries()];
  }, [invites, milestones, feedback]);

  function toggleTeam(applicationId: string) {
    setTeamFilter((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

  // One list, sorted by how soon each thing is due, so the queue reads as a
  // single priority order rather than three concatenated groups.
  const rows = useMemo(() => {
    const items = [
      ...(typeFilter.invite ? invites : []),
      ...(typeFilter.milestone ? milestones : []),
      ...(typeFilter.feedback ? feedback : []),
    ].filter(
      (item) => teamFilter.size === 0 || teamFilter.has(item.application.id),
    );

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [invites, milestones, feedback, typeFilter, teamFilter]);

  const slotsPct = Math.round((slotsUsed / faculty.slotsTotal) * 100);

  return (
    <div className="flex flex-col sm:flex-row gap-8">
      <aside className="sm:w-[190px] shrink-0 flex flex-col gap-6">
        <div>
          <h3 className="mb-2.5">Filter by type</h3>
          <div className="flex flex-col gap-1.5 text-body text-ink-2">
            <TypeCheckbox
              label="Invitations"
              count={invites.length}
              checked={typeFilter.invite}
              onChange={(v) => setTypeFilter((p) => ({ ...p, invite: v }))}
            />
            <TypeCheckbox
              label="Milestone approvals"
              count={milestones.length}
              checked={typeFilter.milestone}
              onChange={(v) => setTypeFilter((p) => ({ ...p, milestone: v }))}
            />
            <TypeCheckbox
              label="Feedback due"
              count={feedback.length}
              checked={typeFilter.feedback}
              onChange={(v) => setTypeFilter((p) => ({ ...p, feedback: v }))}
            />
          </div>
        </div>

        {teams.length > 0 ? (
          <div>
            <h3 className="mb-2.5">Team</h3>
            <div className="flex flex-col gap-1.5 text-body text-ink-2">
              {teams.map(([applicationId, title]) => (
                <label
                  key={applicationId}
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={teamFilter.has(applicationId)}
                    onChange={() => toggleTeam(applicationId)}
                    className="w-[15px] h-[15px] mt-0.5 shrink-0 rounded-[4px] border-[1.5px] border-line accent-[var(--color-brand)]"
                  />
                  {title}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="bg-card border border-line rounded-card p-3.5">
          <h3 className="mb-2">Supervision load</h3>
          <p className="text-body text-ink-2 mb-1.5">
            {slotsUsed} of {faculty.slotsTotal} slots
          </p>
          <div className="h-1.5 rounded-full bg-line-2 overflow-hidden">
            <div
              className={cn("h-full", atCapacity ? "bg-warn" : "bg-brand")}
              style={{ width: `${slotsPct}%` }}
            />
          </div>
          {atCapacity ? (
            <p className="text-meta text-warn mt-2">
              At capacity — you cannot take on another team.
            </p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h1 className="marker-triangle text-brand">Action queue</h1>
          <span className="text-meta text-ink-3">
            {rows.length === 0
              ? "Nothing needs action"
              : `${rows.length} item${rows.length === 1 ? "" : "s"} · soonest first`}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {rows.map((item) => {
            if (item.kind === "invite") {
              return (
                <InviteRow
                  key={item.invite.id}
                  item={item}
                  atCapacity={atCapacity}
                  onAccept={() => {
                    setSlotsUsed((n) => Math.min(n + 1, faculty.slotsTotal));
                    setInvites((prev) =>
                      prev.filter((i) => i.invite.id !== item.invite.id),
                    );
                  }}
                  onDecline={() =>
                    setInvites((prev) =>
                      prev.filter((i) => i.invite.id !== item.invite.id),
                    )
                  }
                />
              );
            }

            if (item.kind === "milestone") {
              return (
                <MilestoneRow
                  key={item.milestone.id}
                  item={item}
                  onResolve={() =>
                    setMilestones((prev) =>
                      prev.map((m) =>
                        m.milestone.id === item.milestone.id
                          ? { ...m, actionNeeded: false }
                          : m,
                      ),
                    )
                  }
                />
              );
            }

            return (
              <FeedbackRow
                key={item.application.id}
                item={item}
                onSubmitted={() =>
                  setFeedback((prev) =>
                    prev.filter((f) => f.application.id !== item.application.id),
                  )
                }
              />
            );
          })}

          {rows.length === 0 ? (
            <div className="border border-dashed border-line rounded-card py-12 px-6 text-center text-ink-2">
              Nothing needs your action right now.
            </div>
          ) : null}
        </div>

        {settled.length > 0 ? (
          <section className="mt-8">
            <div className="flex items-center gap-2.5 mb-2.5">
              <h2 className="text-h3 text-ink-3 uppercase tracking-[0.09em]">
                Also supervising
              </h2>
              <span className="text-meta text-ink-3">{settled.length}</span>
              <span aria-hidden="true" className="flex-1 h-px bg-line" />
            </div>
            <div className="flex flex-wrap gap-2">
              {settled.map(({ application, challenge }) => (
                <Link
                  key={application.id}
                  href={`/faculty/${application.id}`}
                  className="text-ink-3 hover:text-brand"
                >
                  <Chip variant="outline-dashed">
                    {challenge.title} · {application.team.name}
                  </Chip>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function TypeCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[15px] h-[15px] shrink-0 rounded-[4px] border-[1.5px] border-line accent-[var(--color-brand)]"
      />
      <span className="flex-1">{label}</span>
      <span className="text-ink-3">{count}</span>
    </label>
  );
}

function QueueCard({
  chip,
  title,
  href,
  meta,
  actions,
  dimmed,
}: {
  chip: React.ReactNode;
  title: string;
  href: string;
  meta: React.ReactNode;
  actions?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-card p-4 flex flex-wrap items-center gap-x-4 gap-y-3",
        dimmed ? "opacity-60" : "",
      )}
    >
      {chip}
      <div className="min-w-0 flex-1">
        <Link href={href} className="font-semibold text-ink hover:text-brand">
          {title}
        </Link>
        <p className="text-meta text-ink-2 mt-0.5">{meta}</p>
      </div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

function InviteRow({
  item,
  atCapacity,
  onAccept,
  onDecline,
}: {
  item: InviteQueueItem;
  atCapacity: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { application, challenge, daysLeft } = item;
  const [declineOpen, setDeclineOpen] = useState(false);

  return (
    <>
      <QueueCard
        chip={<Chip>Invitation</Chip>}
        title={challenge.title}
        href={`/faculty/${application.id}`}
        meta={
          <>
            Team of {teamSize(application.team)} · {challenge.colleges.join(", ")} ·{" "}
            {challenge.durationWeeks} wks · {challenge.hoursPerWeek} h/wk ·{" "}
            <span className={daysLeft <= 2 ? "text-warn font-medium" : undefined}>
              {daysLeft <= 0
                ? "expires today"
                : `expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setDeclineOpen(true)}
              className="h-8 px-3 rounded-card border border-red text-red font-semibold hover:bg-red-soft"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={atCapacity}
              title={
                atCapacity
                  ? "You are at supervision capacity"
                  : undefined
              }
              className="h-8 px-3.5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:hover:bg-brand"
            >
              Accept invite
            </button>
          </>
        }
      />
      <ConfirmDeclineDialog
        open={declineOpen}
        challengeTitle={challenge.title}
        teamName={application.team.name}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={() => {
          setDeclineOpen(false);
          onDecline();
        }}
      />
    </>
  );
}

function MilestoneRow({
  item,
  onResolve,
}: {
  item: MilestoneQueueItem;
  onResolve: () => void;
}) {
  const { milestone, application, challenge, actionNeeded, daysLeft } = item;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <QueueCard
        chip={<Chip variant="warn">Milestone</Chip>}
        title={`${challenge.title} — ${milestone.title}`}
        href={`/faculty/${application.id}`}
        dimmed={!actionNeeded}
        meta={
          actionNeeded ? (
            <>
              {milestone.deliverable} · due {formatDate(milestone.dueDate)}
              {daysLeft < 0 ? (
                <span className="text-warn font-medium">
                  {" "}
                  · {Math.abs(daysLeft)} days overdue
                </span>
              ) : null}{" "}
              · partner sign-off:{" "}
              {milestone.posterApproved ? "approved" : "pending"}
            </>
          ) : (
            "You approved this · waiting on the partner"
          )
        }
        actions={
          actionNeeded ? (
            <>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="h-8 px-3 rounded-card border border-red text-red font-semibold hover:bg-red-soft"
              >
                Request changes
              </button>
              <button
                type="button"
                onClick={onResolve}
                className="h-8 px-3.5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
              >
                Approve
              </button>
            </>
          ) : undefined
        }
      />
      <RequestChangesDialog
        open={dialogOpen}
        milestoneTitle={milestone.title}
        onCancel={() => setDialogOpen(false)}
        onSubmit={() => {
          setDialogOpen(false);
          onResolve();
        }}
      />
    </>
  );
}

function FeedbackRow({
  item,
  onSubmitted,
}: {
  item: FeedbackQueueItem;
  onSubmitted: () => void;
}) {
  const { application, challenge, daysLeft } = item;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <QueueCard
        chip={<Chip variant="accent">Feedback due</Chip>}
        title={challenge.title}
        href={`/faculty/${application.id}`}
        meta={`Completed ${formatDate(application.stageEnteredAt)} · ${Math.abs(
          daysLeft,
        )} days without a review`}
        actions={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="h-8 px-3.5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Write feedback
          </button>
        }
      />
      <FeedbackDialog
        open={dialogOpen}
        challengeTitle={challenge.title}
        teamName={application.team.name}
        onClose={() => setDialogOpen(false)}
        onSubmitted={onSubmitted}
      />
    </>
  );
}
