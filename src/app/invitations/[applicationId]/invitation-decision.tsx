"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { acceptInvitation, declineInvitation } from "./actions";

/**
 * Accept or decline. Both write, and both report a rejection in place rather
 * than navigating away from the one screen that explains what is being
 * decided.
 */
export function InvitationDecision({
  applicationPublicId,
  teamName,
}: {
  applicationPublicId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(decision: "ACCEPT" | "DECLINE") {
    setError(null);
    startTransition(async () => {
      const message =
        decision === "ACCEPT"
          ? await acceptInvitation(applicationPublicId)
          : await declineInvitation(applicationPublicId);

      if (message) {
        setError(message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-7">
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-card border border-warn/35 bg-warn-soft px-4 py-3 text-ink-2"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => respond("ACCEPT")}
          disabled={pending}
          className="inline-flex items-center h-10 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : `Accept and join ${teamName}`}
        </button>
        <button
          type="button"
          onClick={() => respond("DECLINE")}
          disabled={pending}
          className="inline-flex items-center h-10 px-5 rounded-card border border-line text-brand font-semibold hover:border-brand disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
