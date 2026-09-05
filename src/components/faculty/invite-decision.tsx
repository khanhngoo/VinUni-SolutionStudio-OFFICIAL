"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeclineDialog } from "@/components/faculty/confirm-decline-dialog";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import type { FacultyLoad, InviteQueueItem } from "@/lib/faculty-queue";

/**
 * The accept/decline view. Deliberately renders no project record: supervision
 * has not been agreed, so the full brief, datasets and partner contact are not
 * this faculty member's to read yet — the same T3 gate the student's workspace
 * enforces, applied from the other side.
 */
export function InviteDecision({
  item,
  faculty,
  atCapacity,
  onAccept,
  onDecline,
  summary,
}: {
  item: InviteQueueItem;
  faculty: FacultyLoad;
  atCapacity: boolean;
  onAccept: (requestId: string) => Promise<string | null>;
  onDecline: (requestId: string) => Promise<string | null>;
  summary: string;
}) {
  const router = useRouter();
  const { challengeTitle, daysLeft, teamName } = item;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function respond(answer: "accepted" | "declined") {
    setError(null);
    setPending(true);
    const message =
      answer === "accepted"
        ? await onAccept(item.requestId)
        : await onDecline(item.requestId);
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    setDecision(answer);
  }

  if (decision !== null) {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-6 text-center">
        {decision === "accepted" ? (
          <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
            <CheckIcon className="w-5 h-5" />
          </span>
        ) : null}
        <p className="font-semibold text-[15px] text-ink mt-3">
          {decision === "accepted"
            ? "You're supervising this team"
            : "Supervision declined"}
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          {decision === "accepted"
            ? `${teamName} and CAID have been notified. The project record opens to you once the team is selected and the engagement starts.`
            : `${teamName} has been told, and will nominate another supervisor.`}
        </p>
        <button
          type="button"
          onClick={() => router.push("/faculty")}
          className="h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
        >
          Back to queue
        </button>
      </div>
    );
  }

  return (
    <>
      <Section title="What they're asking of you">
        <div className="bg-card border border-line rounded-card p-5 flex flex-col gap-3 text-ink-2">
          <p>{summary}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
            <Stat label="Team" value={`${item.teamSize} student${item.teamSize === 1 ? "" : "s"}`} />
            <Stat
              label="Your slots"
              value={`${faculty.slotsUsed} / ${faculty.slotsTotal} used`}
            />
            <Stat
              label="Commitment"
              value={item.hoursPerWeek ? `${item.hoursPerWeek} h/wk` : "—"}
            />
            <Stat
              label="Respond by"
              value={
                daysLeft <= 0
                  ? "today"
                  : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`
              }
              urgent={daysLeft <= 2}
            />
          </dl>
        </div>
      </Section>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2"
        >
          {error}
        </div>
      ) : null}

      <Section title="Your decision">
        <div className="bg-card border border-line rounded-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">
              {atCapacity ? "You are at supervision capacity" : "Take this on?"}
            </p>
            <p className="text-meta text-ink-3 mt-0.5">
              {atCapacity
                ? `All ${faculty.slotsTotal} of your slots are in use. Free one up before accepting another team.`
                : "Accepting commits you to milestone sign-off and mentoring for the whole engagement."}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => setDeclineOpen(true)}
              className="h-10 px-4 rounded-card border border-red text-red font-semibold hover:bg-red-soft disabled:opacity-60"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={atCapacity || pending}
              onClick={() => void respond("accepted")}
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:hover:bg-brand"
            >
              {pending ? "Saving…" : "Accept supervision"}
            </button>
          </div>
        </div>
      </Section>

      <ConfirmDeclineDialog
        open={declineOpen}
        challengeTitle={challengeTitle}
        teamName={teamName}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={() => {
          setDeclineOpen(false);
          void respond("declined");
        }}
      />
    </>
  );
}

function Stat({
  label,
  value,
  urgent,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd
        className={
          urgent
            ? "font-semibold text-[15px] text-warn mt-1"
            : "font-semibold text-[15px] text-brand mt-1"
        }
      >
        {value}
      </dd>
    </div>
  );
}
