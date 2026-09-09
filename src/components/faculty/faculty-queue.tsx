"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ConfirmDeclineDialog } from "@/components/faculty/confirm-decline-dialog";
import { RequestChangesDialog } from "@/components/faculty/request-changes-dialog";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dates";
import type {
  FacultyLoad,
  FeedbackQueueItem,
  InviteQueueItem,
  MilestoneQueueItem,
  SettledSupervision,
} from "@/lib/faculty-queue";

type ItemKind = "invite" | "milestone" | "feedback";

interface FacultyQueueProps {
  faculty: FacultyLoad;
  invites: InviteQueueItem[];
  milestones: MilestoneQueueItem[];
  feedback: FeedbackQueueItem[];
  /** Supervised teams with nothing outstanding — the only way to reach them. */
  settled: SettledSupervision[];
  onAcceptInvite?: (requestId: string) => Promise<string | null>;
  onDeclineInvite?: (requestId: string) => Promise<string | null>;
  onApproveMilestone?: (milestoneId: string) => Promise<string | null>;
  onRequestChanges?: (milestoneId: string, comments: string) => Promise<string | null>;
}

/**
 * Accepting, declining, approving and requesting changes all write. The row
 * disappears optimistically and the handler's error message brings it back,
 * so the common case has no spinner and a failure is still visible.
 *
 * Writing feedback does not persist yet: there is no close-out mutation, so
 * that row stays put and says so rather than pretending.
 */
export function FacultyQueue({
  faculty,
  invites: initialInvites,
  milestones: initialMilestones,
  feedback: initialFeedback,
  settled,
  onAcceptInvite,
  onDeclineInvite,
  onApproveMilestone,
  onRequestChanges,
}: FacultyQueueProps) {
  const [invites, setInvites] = useState(initialInvites);
  const [milestones, setMilestones] = useState(initialMilestones);
  // Feedback rows cannot be resolved from here yet, so this list never changes.
  const feedback = initialFeedback;
  // Accepting a supervision consumes a slot, so the load bar has to move with
  // it — otherwise it keeps reporting the seeded number all session.
  const [slotsUsed, setSlotsUsed] = useState(faculty.slotsUsed);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<Record<ItemKind, boolean>>({
    invite: true,
    milestone: true,
    feedback: true,
  });
  const [teamFilter, setTeamFilter] = useState<Set<string>>(new Set());

  const atCapacity = faculty.slotsTotal > 0 && slotsUsed >= faculty.slotsTotal;

  const teams = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of [...invites, ...milestones, ...feedback]) {
      seen.set(item.applicationPublicId, item.challengeTitle);
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
      (item) => teamFilter.size === 0 || teamFilter.has(item.applicationPublicId),
    );

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [invites, milestones, feedback, typeFilter, teamFilter]);

  const slotsPct =
    faculty.slotsTotal > 0
      ? Math.round((slotsUsed / faculty.slotsTotal) * 100)
      : 0;

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

        {error ? (
          <div
            role="alert"
            className="mb-3 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2"
          >
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5">
          {rows.map((item) => {
            if (item.kind === "invite") {
              return (
                <InviteRow
                  key={item.requestId}
                  item={item}
                  atCapacity={atCapacity}
                  onAccept={async () => {
                    setError(null);
                    setSlotsUsed((n) => n + 1);
                    setInvites((prev) => prev.filter((i) => i.requestId !== item.requestId));
                    const message = await onAcceptInvite?.(item.requestId);
                    if (message) {
                      setError(message);
                      setSlotsUsed((n) => Math.max(n - 1, 0));
                      setInvites((prev) => [...prev, item]);
                    }
                  }}
                  onDecline={async () => {
                    setError(null);
                    setInvites((prev) => prev.filter((i) => i.requestId !== item.requestId));
                    const message = await onDeclineInvite?.(item.requestId);
                    if (message) {
                      setError(message);
                      setInvites((prev) => [...prev, item]);
                    }
                  }}
                />
              );
            }

            if (item.kind === "milestone") {
              return (
                <MilestoneRow
                  key={item.milestoneId}
                  item={item}
                  onApprove={async () => {
                    setError(null);
                    setMilestones((prev) =>
                      prev.map((m) =>
                        m.milestoneId === item.milestoneId
                          ? { ...m, actionNeeded: false }
                          : m,
                      ),
                    );
                    const message = await onApproveMilestone?.(item.milestoneId);
                    if (message) {
                      setError(message);
                      setMilestones((prev) =>
                        prev.map((m) =>
                          m.milestoneId === item.milestoneId
                            ? { ...m, actionNeeded: true }
                            : m,
                        ),
                      );
                    }
                  }}
                  onRequestChanges={async (comments) => {
                    setError(null);
                    setMilestones((prev) =>
                      prev.map((m) =>
                        m.milestoneId === item.milestoneId
                          ? { ...m, actionNeeded: false }
                          : m,
                      ),
                    );
                    const message = await onRequestChanges?.(item.milestoneId, comments);
                    if (message) {
                      setError(message);
                      setMilestones((prev) =>
                        prev.map((m) =>
                          m.milestoneId === item.milestoneId
                            ? { ...m, actionNeeded: true }
                            : m,
                        ),
                      );
                    }
                  }}
                />
              );
            }

            return (
              <FeedbackRow key={item.applicationPublicId} item={item} />
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
              {settled.map((row) => (
                <Link
                  key={row.applicationPublicId}
                  href={`/faculty/${row.applicationPublicId}`}
                  className="text-ink-3 hover:text-brand"
                >
                  <Chip variant="outline-dashed">
                    {row.challengeTitle} · {row.teamName}
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
  const { challengeTitle, daysLeft, teamName } = item;
  const [declineOpen, setDeclineOpen] = useState(false);

  return (
    <>
      <QueueCard
        chip={<Chip>Invitation</Chip>}
        title={challengeTitle}
        href={`/faculty/${item.applicationPublicId}`}
        meta={
          <>
            Team of {item.teamSize}
            {item.colleges.length > 0 ? ` · ${item.colleges.join(", ")}` : ""} ·{" "}
            {item.durationWeeks ?? "—"} wks · {item.hoursPerWeek ?? "—"} h/wk ·{" "}
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
        challengeTitle={challengeTitle}
        teamName={teamName}
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
  onApprove,
  onRequestChanges,
}: {
  item: MilestoneQueueItem;
  onApprove: () => void;
  onRequestChanges: (comments: string) => void;
}) {
  const { actionNeeded, challengeTitle, daysLeft } = item;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <QueueCard
        chip={<Chip variant="warn">Milestone</Chip>}
        title={`${challengeTitle} — ${item.milestoneTitle}`}
        href={`/faculty/${item.applicationPublicId}`}
        dimmed={!actionNeeded}
        meta={
          actionNeeded ? (
            <>
              {item.deliverable}
              {item.dueDate ? ` · due ${formatDate(item.dueDate)}` : ""}
              {daysLeft < 0 ? (
                <span className="text-warn font-medium">
                  {" "}
                  · {Math.abs(daysLeft)} days overdue
                </span>
              ) : null}{" "}
              · partner sign-off:{" "}
              {item.partnerApproved ? "approved" : "pending"}
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
                onClick={onApprove}
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
        milestoneTitle={item.milestoneTitle}
        onCancel={() => setDialogOpen(false)}
        onSubmit={(comments) => {
          setDialogOpen(false);
          onRequestChanges(comments);
        }}
      />
    </>
  );
}

function FeedbackRow({ item }: { item: FeedbackQueueItem }) {
  const { challengeTitle, daysLeft } = item;

  return (
    <QueueCard
      chip={<Chip variant="accent">Feedback due</Chip>}
      title={challengeTitle}
      href={`/faculty/${item.applicationPublicId}`}
      meta={`${item.teamName} · ${Math.abs(daysLeft)} days without a closing review`}
      actions={
        // Closing feedback has no mutation behind it yet. The row still earns
        // its place -- it is a real obligation -- but the button is disabled
        // rather than accepting a note it would silently drop.
        <button
          type="button"
          disabled
          title="Written feedback is not yet stored"
          className="h-8 px-3.5 rounded-card border border-line text-ink-3 font-semibold disabled:opacity-60"
        >
          Write feedback
        </button>
      }
    />
  );
}
