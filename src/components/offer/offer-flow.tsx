"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UnlockedBlock } from "@/components/offer/unlocked-block";
import { CheckIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/cn";
import type { Offer } from "@/lib/types";

interface OfferFlowProps {
  applicationId: string;
  challengeId: string;
  challengeTitle: string;
  orgName: string;
  offer: Offer;
  posterContact: { name: string; role: string; email: string };
  fullBrief: string[];
  resourceNames: string[];
  expired: boolean;
}

type Phase = "offer" | "nda" | "revealed" | "declined";

/**
 * The accept → NDA → reveal sequence (PRD §10). State is session-only: there is
 * no persistence layer, so accepting here does not move the seeded application
 * to ACTIVE. The workspace is reachable from its own seeded fixture instead.
 */
export function OfferFlow({
  applicationId,
  challengeId,
  challengeTitle,
  orgName,
  offer,
  posterContact,
  fullBrief,
  resourceNames,
  expired,
}: OfferFlowProps) {
  const [phase, setPhase] = useState<Phase>("offer");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [ndaError, setNdaError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const revealRef = useRef<HTMLDivElement>(null);

  // Move focus to the reveal so the transition is announced, not just seen.
  useEffect(() => {
    if (phase === "revealed") revealRef.current?.focus();
  }, [phase]);

  function accept() {
    setPhase(offer.ndaRequired ? "nda" : "revealed");
  }

  function signNda(event: React.FormEvent) {
    event.preventDefault();
    if (signature.trim().length < 3) {
      setNdaError("Type your full name to sign.");
      return;
    }
    setNdaError(null);
    setPhase("revealed");
  }

  if (phase === "declined") {
    return (
      <div className="mt-7 bg-card border border-line rounded-card p-6 text-center">
        <p className="font-semibold text-[15px] text-ink">Invitation declined</p>
        <p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">
          We&apos;ve let the partner and your supervisor know. Nothing further is
          needed from you.
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

  if (phase === "nda") {
    return (
      <Section title="Non-disclosure agreement">
        <form
          onSubmit={signNda}
          className="bg-card border border-line rounded-card p-5"
        >
          <p className="text-ink-2">
            {orgName} requires a signed NDA before the full brief, datasets and
            contact details are released. By signing you agree not to share the
            challenge materials outside this engagement, and to return or destroy
            any copies at the end of it.
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
            placeholder="Jordan Lee"
            className={cn(
              "w-full sm:w-[320px] rounded-card border bg-paper px-3 py-2 text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              ndaError ? "border-warn" : "border-line",
            )}
          />
          {ndaError ? (
            <p className="text-meta text-warn mt-1.5">{ndaError}</p>
          ) : null}

          <div className="flex items-center gap-2.5 mt-5">
            <button
              type="submit"
              className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Sign and continue
            </button>
            <span className="text-meta text-ink-3">
              Everything stays locked until this is signed.
            </span>
          </div>
        </form>
      </Section>
    );
  }

  if (phase === "revealed") {
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
              <div className="flex flex-col gap-3">
                {fullBrief.slice(0, 2).map((para) => (
                  <p key={para.slice(0, 24)}>{para}</p>
                ))}
              </div>
            </UnlockedBlock>

            <UnlockedBlock title="Resources & datasets" delayMs={160}>
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
            </UnlockedBlock>

            <UnlockedBlock title="Poster contact" delayMs={320}>
              <p className="font-semibold text-ink">{posterContact.name}</p>
              <p className="text-meta text-ink-3">{posterContact.role}</p>
              <p className="mt-1">{posterContact.email}</p>
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
                href={`/challenges/${challengeId}`}
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

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 bg-card border border-line rounded-card p-5">
        {expired ? (
          <p className="font-semibold text-warn">
            This invitation has lapsed. Contact CAID if you believe this is an
            error.
          </p>
        ) : (
          <>
            <div>
              <p className="font-semibold text-ink">Ready to accept?</p>
              <p className="text-meta text-ink-3 mt-0.5">
                {offer.ndaRequired
                  ? "You'll sign an NDA next, then everything unlocks."
                  : "Everything unlocks as soon as you accept."}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeclineOpen(true)}
                className="h-10 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Accept invitation
              </button>
            </div>
          </>
        )}
      </div>

      <DeclineDialog
        open={declineOpen}
        onCancel={() => setDeclineOpen(false)}
        onConfirm={() => {
          setDeclineOpen(false);
          setPhase("declined");
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
          This cannot be undone. The partner will offer the place to another
          candidate, and the challenge materials stay locked.
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
