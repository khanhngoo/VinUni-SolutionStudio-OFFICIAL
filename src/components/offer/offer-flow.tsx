"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { UnlockedBlock } from "@/components/offer/unlocked-block";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import { organizationRoleLabel } from "@/lib/labels";
import type { OfferResponse } from "@/services/offer.service";

interface OfferFlowProps {
  applicationId: string;
  canRespond: boolean;
  challengeSlug: string;
  challengeTitle: string;
  expired: boolean;
  /** Null until this user has personally signed; drives the reveal. */
  fullBrief: string | null;
  ndaAccepted: boolean;
  ndaRequired: boolean;
  ndaAction: (signature: string) => Promise<void>;
  orgName: string;
  posterContact: { displayName: string; email: string | null; roleLabel: string | null } | null;
  resourceNames: string[];
  respondAction: (response: OfferResponse) => Promise<void>;
  respondedByName: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
}

/**
 * The accept → NDA → reveal sequence (PRD §10).
 *
 * The phase is derived from persisted state, not held in local state: the team
 * offer's status and whether this individual has signed. That is what lets a
 * refresh mid-flow land the student back where they were rather than at the
 * start, and it keeps the reveal honest — the brief arrives from the server
 * only once the signature is on record.
 */
export function OfferFlow({
  applicationId,
  canRespond,
  challengeSlug,
  challengeTitle,
  expired,
  fullBrief,
  ndaAccepted,
  ndaRequired,
  ndaAction,
  orgName,
  posterContact,
  resourceNames,
  respondAction,
  respondedByName,
  status,
}: OfferFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [ndaError, setNdaError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const revealRef = useRef<HTMLDivElement>(null);
  const revealed = status === "ACCEPTED" && (!ndaRequired || ndaAccepted);

  // Move focus to the reveal so the transition is announced, not just seen.
  useEffect(() => {
    if (revealed) revealRef.current?.focus();
  }, [revealed]);

  function respond(response: OfferResponse) {
    setError(null);
    startTransition(async () => {
      try {
        await respondAction(response);
        router.refresh();
      } catch {
        setError("We could not record that response. Refresh this page and try again.");
      }
    });
  }

  function signNda(event: React.FormEvent) {
    event.preventDefault();
    if (signature.trim().length < 3) {
      setNdaError("Type your full name to sign.");
      return;
    }
    setNdaError(null);
    startTransition(async () => {
      try {
        await ndaAction(signature);
        router.refresh();
      } catch {
        setNdaError("We could not record your signature. Try again.");
      }
    });
  }

  if (status === "DECLINED") {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-6 text-center">
        <p className="font-semibold text-[15px] text-ink">Invitation declined</p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          The offer is closed and cannot be reopened from this page.
        </p>
        <Link
          href="/challenges"
          className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
        >
          Browse other challenges
        </Link>
      </div>
    );
  }

  if (status === "CANCELLED") {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-5 text-ink-2">
        This invitation is no longer available. Contact the managing team if you
        need clarification.
      </div>
    );
  }

  if (revealed) {
    return (
      <div ref={revealRef} tabIndex={-1} className="outline-none">
        <div className="mt-7 bg-ok-soft border border-ok rounded-card px-5 py-4">
          <p className="font-semibold text-ok">
            You&apos;re in. Here&apos;s what just opened up.
          </p>
          <p className="text-ink-2 mt-1">
            The blocks you&apos;ve been seeing locked on this challenge are now
            yours to read.
          </p>
        </div>

        <Section title="What's now available to you">
          <div className="flex flex-col gap-2.5">
            <UnlockedBlock title="Full problem statement" delayMs={0}>
              {fullBrief ? (
                <div className="flex flex-col gap-3">
                  {fullBrief
                    .split("\n\n")
                    .slice(0, 2)
                    .map((para) => (
                      <p key={para.slice(0, 24)}>{para}</p>
                    ))}
                </div>
              ) : (
                <p className="text-ink-2">
                  The partner has not filed a full brief for this challenge yet.
                  Your supervisor will share it at kickoff.
                </p>
              )}
            </UnlockedBlock>

            <UnlockedBlock title="Resources & datasets" delayMs={160}>
              {resourceNames.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {resourceNames.map((name) => (
                    <li key={name} className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="w-1 h-1 rounded-full bg-ink-3 mt-[9px] shrink-0"
                      />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-2">
                  Datasets and credentials are released into your workspace at
                  kickoff.
                </p>
              )}
            </UnlockedBlock>

            <UnlockedBlock title="Poster contact" delayMs={320}>
              {posterContact ? (
                <>
                  <p className="font-semibold text-ink">
                    {posterContact.displayName}
                  </p>
                  {posterContact.roleLabel ? (
                    <p className="text-meta text-ink-3">
                      {organizationRoleLabel(posterContact.roleLabel)}
                    </p>
                  ) : null}
                  {posterContact.email ? (
                    <p className="mt-1">{posterContact.email}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-ink-2">
                  Your supervisor will introduce you to the partner contact.
                </p>
              )}
            </UnlockedBlock>
          </div>
        </Section>

        <Section title="Before you start">
          <div className="bg-card border border-line rounded-card p-5">
            <ul className="flex flex-col gap-3">
              {KICKOFF_ITEMS.map((item) => (
                <li key={item}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist[item] ?? false}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item]: e.target.checked,
                        }))
                      }
                      className="w-[15px] h-[15px] mt-0.5 rounded-[4px] border-[1.5px] border-line shrink-0 accent-[var(--color-brand)]"
                    />
                    <span
                      className={
                        checklist[item] ? "text-ink-3 line-through" : "text-ink"
                      }
                    >
                      {item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-line-2">
              <Link
                href={`/workspace/${applicationId}`}
                className="h-10 px-5 grid place-items-center rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white"
              >
                Open your workspace
              </Link>
              <Link
                href={`/challenges/${challengeSlug}`}
                className="h-10 px-4 grid place-items-center rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
              >
                Back to {challengeTitle.length > 28 ? "challenge" : challengeTitle}
              </Link>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <Section title="Non-disclosure agreement">
        <div className="mt-1 mb-2.5 flex items-center gap-2 text-ok font-semibold">
          <CheckIcon className="w-3.5 h-3.5" />
          {respondedByName
            ? `${respondedByName} accepted this offer for the team`
            : "This team offer has been accepted"}
        </div>
        <form
          onSubmit={signNda}
          className="bg-card border border-line rounded-card p-5"
        >
          <p className="text-ink-2">
            {orgName} requires a signed NDA before the full brief, datasets and
            contact details are released. By signing you agree not to share the
            challenge materials outside this engagement, and to return or
            destroy any copies at the end of it.
          </p>
          <p className="text-meta text-ink-3 mt-2">
            Your team leader accepted the place. This agreement is yours alone —
            every member signs before materials are released to them.
          </p>

          <label
            htmlFor="nda-signature"
            className="block font-semibold text-ink mt-5 mb-1.5"
          >
            Type your full name to sign
          </label>
          <input
            id="nda-signature"
            value={signature}
            autoFocus
            onChange={(e) => setSignature(e.target.value)}
            className={cn(
              "w-full sm:w-[320px] rounded-card border bg-paper px-3 py-2 text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              ndaError ? "border-warn" : "border-line"
            )}
          />
          {ndaError ? (
            <p className="text-meta text-warn mt-1.5">{ndaError}</p>
          ) : null}

          <div className="flex items-center gap-2.5 mt-5">
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {isPending ? "Signing..." : "Sign and continue"}
            </button>
            <span className="text-meta text-ink-3">
              Everything stays locked until this is signed.
            </span>
          </div>
        </form>
      </Section>
    );
  }

  if (expired) {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-5 text-warn font-semibold">
        This invitation has lapsed. Contact the managing team if you believe
        this is an error.
      </div>
    );
  }

  if (!canRespond) {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-5 text-ink-2">
        Only the accepted team leader can accept or decline this offer for the
        team.
      </div>
    );
  }

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 bg-card border border-line rounded-card p-5">
        <div>
          <p className="font-semibold text-ink">Ready to respond for your team?</p>
          <p className="text-meta text-ink-3 mt-0.5">
            {ndaRequired
              ? "You'll sign an NDA next, then everything unlocks."
              : "Everything unlocks as soon as you accept."}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setDeclineOpen(true)}
            className="h-10 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 disabled:opacity-60"
          >
            Decline
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond("ACCEPT")}
            className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Accept invitation"}
          </button>
        </div>
      </div>
      {error ? <p className="mt-2 text-meta text-warn">{error}</p> : null}
      <DeclineDialog
        open={declineOpen}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={() => {
          setDeclineOpen(false);
          respond("DECLINE");
        }}
      />
    </>
  );
}

const KICKOFF_ITEMS = [
  "Review the milestones the partner has proposed",
  "Schedule your kickoff meeting with the partner and your supervisor",
  "Read the resources and flag anything you cannot access",
  "Acknowledge the communication rules for this engagement",
];

/**
 * A native dialog, so the browser supplies the focus trap, the inert
 * background and Escape-to-close rather than us reimplementing all three.
 */
function DeclineDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby="decline-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      <div className="px-6 py-6">
        <p id="decline-title" className="font-semibold text-[15px]">
          Decline this invitation?
        </p>
        <p className="text-ink-2 mt-2">
          This team-level response cannot be undone from the offer page. The
          partner will offer the place to another team, and the challenge
          materials stay locked.
        </p>
        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
          >
            Keep it open
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-5 rounded-card bg-red text-white font-semibold hover:opacity-90"
          >
            Decline
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function AcceptedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-ok font-semibold">
      <CheckIcon className="w-3.5 h-3.5" />
      Accepted
    </span>
  );
}
