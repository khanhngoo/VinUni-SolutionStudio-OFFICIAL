"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface ConfirmDeclineDialogProps {
  open: boolean;
  challengeTitle: string;
  teamName: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Declining sends a team back to find another supervisor, so it gets the same
 * confirm step the student's offer decline has — plus a reason, which is the
 * only thing that makes the rejection useful to whoever picks the next name.
 */
export function ConfirmDeclineDialog({
  open,
  challengeTitle,
  teamName,
  onCancel,
  onConfirm,
}: ConfirmDeclineDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      setReason("");
      setError(null);
    }
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError("Give the team a short reason.");
      return;
    }
    onConfirm(reason);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
      aria-labelledby="decline-supervision-title"
      className="m-auto w-[min(460px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      <form onSubmit={handleSubmit} className="px-6 py-6">
        <p id="decline-supervision-title" className="font-semibold text-[15px]">
          Decline this supervision?
        </p>
        <p className="text-ink-2 mt-2">
          {teamName} will have to nominate another supervisor for{" "}
          {challengeTitle}. This cannot be undone.
        </p>

        <label htmlFor="decline-reason" className="block font-semibold text-ink mt-4 mb-1.5">
          Reason
        </label>
        <input
          id="decline-reason"
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
          placeholder="Outside my area / no capacity this term"
          className={cn(
            "w-full rounded-card border bg-paper px-3 py-2 text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
            error ? "border-warn" : "border-line",
          )}
        />
        {error ? <p className="text-meta text-warn mt-1.5">{error}</p> : null}

        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
          >
            Keep it
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded-card bg-red text-white font-semibold hover:opacity-90"
          >
            Decline
          </button>
        </div>
      </form>
    </dialog>
  );
}
