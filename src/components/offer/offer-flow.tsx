"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CheckIcon } from "@/components/ui/icons";
import type { OfferResponse } from "@/services/offer.service";

interface OfferFlowProps {
  applicationId: string;
  canRespond: boolean;
  challengeSlug: string;
  expired: boolean;
  ndaRequired: boolean;
  respondAction: (response: OfferResponse) => Promise<void>;
  respondedByName: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
}

export function OfferFlow({
  applicationId,
  canRespond,
  challengeSlug,
  expired,
  ndaRequired,
  respondAction,
  respondedByName,
  status,
}: OfferFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);

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

  if (status === "ACCEPTED") {
    return <div className="mt-7 bg-ok-soft border border-ok rounded-card p-5"><p className="flex items-center gap-2 font-semibold text-ok"><CheckIcon className="w-4 h-4" /> Invitation accepted</p><p className="text-ink-2 mt-1.5">{respondedByName ? `${respondedByName} accepted this team offer.` : "This team offer has been accepted."}{ndaRequired ? " Individual agreement acceptance remains separate before restricted materials are released." : " Project workspace provisioning happens in a later workflow."}</p></div>;
  }

  if (status === "DECLINED") {
    return <div className="mt-7 bg-card border border-line rounded-card p-6 text-center"><p className="font-semibold text-[15px] text-ink">Invitation declined</p><p className="text-ink-2 mt-1.5 max-w-[46ch] mx-auto">The offer is closed and cannot be reopened from this page.</p><Link href="/challenges" className="inline-grid place-items-center h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep hover:text-white">Browse challenges</Link></div>;
  }

  if (status === "CANCELLED") {
    return <div className="mt-7 bg-card border border-line rounded-card p-5 text-ink-2">This invitation is no longer available. Contact the managing team if you need clarification.</div>;
  }

  if (expired) {
    return <div className="mt-7 bg-card border border-line rounded-card p-5 text-warn font-semibold">This invitation has lapsed. Contact the managing team if you believe this is an error.</div>;
  }

  if (!canRespond) {
    return <div className="mt-7 bg-card border border-line rounded-card p-5 text-ink-2">Only the accepted team leader can accept or decline this offer for the team.</div>;
  }

  return <><div className="mt-7 flex flex-wrap items-center justify-between gap-4 bg-card border border-line rounded-card p-5"><div><p className="font-semibold text-ink">Ready to respond for your team?</p><p className="text-meta text-ink-3 mt-0.5">{ndaRequired ? "Team acceptance does not sign individual NDAs." : "This records the team-level offer response."}</p></div><div className="flex items-center gap-2.5"><button type="button" disabled={isPending} onClick={() => setDeclineOpen(true)} className="h-10 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3 disabled:opacity-60">Decline</button><button type="button" disabled={isPending} onClick={() => respond("ACCEPT")} className="h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60">{isPending ? "Saving..." : "Accept invitation"}</button></div></div>{error ? <p className="mt-2 text-meta text-warn">{error}</p> : null}<DeclineDialog open={declineOpen} onCancel={() => setDeclineOpen(false)} onConfirm={() => { setDeclineOpen(false); respond("DECLINE"); }} /><p className="sr-only">Offer for application {applicationId} on {challengeSlug}</p></>;
}

function DeclineDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="decline-title" className="w-full max-w-[440px] rounded-card border border-line bg-card px-6 py-6 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)]"><p id="decline-title" className="font-semibold text-[15px]">Decline this invitation?</p><p className="text-ink-2 mt-2">This team-level response cannot be undone from the offer page.</p><div className="flex items-center justify-end gap-2.5 mt-5"><button type="button" autoFocus onClick={onCancel} className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3">Keep it open</button><button type="button" onClick={onConfirm} className="h-9 px-5 rounded-card bg-red text-white font-semibold hover:opacity-90">Decline</button></div></div></div>;
}
