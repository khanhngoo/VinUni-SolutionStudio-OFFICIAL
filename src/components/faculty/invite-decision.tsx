"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeclineDialog } from "@/components/faculty/confirm-decline-dialog";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { formatDate } from "@/lib/dates";
import type { InviteQueueItem } from "@/lib/supervision";
import type { Faculty } from "@/lib/types";

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
}: {
  item: InviteQueueItem;
  faculty: Faculty;
  atCapacity: boolean;
}) {
  const router = useRouter();
  const { invite, challenge, application, daysLeft } = item;
  const [declineOpen, setDeclineOpen] = useState(false);
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(null);

  // What this faculty member is being asked to bring, matched against what
  // they actually work on — the question behind accepting or not.
  const overlap = challenge.domainTags.filter((tag) =>
    faculty.researchAreas.some(
      (area) =>
        area.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(area.toLowerCase()),
    ),
  );

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
            ? `${application.team.name} and CAID have been notified. The project record opens to you once the team is selected and the engagement starts.`
            : `${application.team.name} has been told, and will nominate another supervisor.`}
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
          <p>{challenge.summary}</p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1">
            <Stat label="Commitment" value={`${challenge.durationWeeks} weeks`} />
            <Stat
              label="Your slots"
              value={`${faculty.slotsUsed} / ${faculty.slotsTotal} used`}
            />
            <Stat label="Requested" value={formatDate(invite.requestedAt)} />
            <Stat
              label="Respond by"
              value={formatDate(invite.respondBy)}
              urgent={daysLeft <= 2}
            />
          </dl>
          <p className="text-meta text-ink-3">
            {overlap.length > 0
              ? `Overlaps your work on ${overlap.join(", ")}.`
              : `Outside your listed areas (${faculty.researchAreas.join(", ")}) — the team nominated you anyway.`}
          </p>
        </div>
      </Section>

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
              onClick={() => setDeclineOpen(true)}
              className="h-10 px-4 rounded-card border border-red text-red font-semibold hover:bg-red-soft"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={atCapacity}
              onClick={() => setDecision("accepted")}
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-40 disabled:hover:bg-brand"
            >
              Accept supervision
            </button>
          </div>
        </div>
      </Section>

      <ConfirmDeclineDialog
        open={declineOpen}
        challengeTitle={challenge.title}
        teamName={application.team.name}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={() => {
          setDeclineOpen(false);
          setDecision("declined");
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
