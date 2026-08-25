import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedActor, hasActorCapability } from "@/auth/authenticated-actor";

export const dynamic = "force-dynamic";

/**
 * Posting a new challenge — deferred.
 *
 * The Phase 4.4 write path (`createChallengeDraft`) exists and is exercised
 * by `scripts/verify-challenge-writes.ts`, but it requires the caller to
 * choose a `managingOrganizationId` (the VinUni internal unit — CAID or
 * E-Lab — that will review the posting). No rule anywhere in the codebase or
 * seed decides which internal unit a *new* external-partner submission
 * should route to; the two existing seed challenges for a given partner were
 * assigned by demo/test code, not a product rule. Picking one here would be
 * inventing routing behavior rather than reading it from an existing
 * decision, so this route intentionally does not submit anything yet.
 *
 * This is a reported gap (see the Cluster C write-up), not a silently faked
 * form.
 */
export default async function PartnerPostPage() {
  const resolution = await getAuthenticatedActor();
  if (resolution.status !== "RESOLVED") redirect("/sign-in");
  if (!hasActorCapability(resolution.actor, "PARTNER_REPRESENTATIVE")) notFound();

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-7 py-7 pb-16">
      <nav className="text-meta text-ink-3">
        <Link href="/partner">Your challenges</Link>
        <span className="mx-1.5">›</span>
        Post a challenge
      </nav>

      <h1 className="mt-3.5">Posting a challenge isn&apos;t available yet</h1>
      <div className="mt-6 border border-dashed border-line rounded-card py-10 px-6 text-center">
        <p className="text-ink font-semibold">This flow needs a product decision first</p>
        <p className="text-ink-2 mt-2 max-w-[520px] mx-auto leading-relaxed">
          Creating a challenge draft requires choosing which VinUni internal
          unit (CAID or E-Lab) will manage and review it. No existing rule
          decides that automatically for a new posting, and letting you pick
          from a dropdown here would be a new, unreviewed workflow rather than
          one that already exists — so this page stops short of submitting
          anything.
        </p>
        <p className="text-meta text-ink-3 mt-4">
          Contact the CAID or E-Lab team directly to arrange a new posting for
          now.
        </p>
      </div>
    </div>
  );
}
