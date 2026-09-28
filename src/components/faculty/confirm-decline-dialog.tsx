"use client";

import { useEffect, useRef } from "react";

interface ConfirmDeclineDialogProps {
  open: boolean;
  challengeTitle: string;
  teamName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Declining sends a team back to find another supervisor, so it gets the same
 * confirmation step the student's offer decline has. The current schema has
 * no dedicated decline-reason field, so this dialog does not ask for text it
 * cannot persist authoritatively.
 */
export function ConfirmDeclineDialog({
  open,
  challengeTitle,
  teamName,
  onCancel,
  onConfirm,
}: ConfirmDeclineDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="px-6 py-6"
      >
        <p id="decline-supervision-title" className="font-semibold text-[15px]">
          Decline this supervision?
        </p>
        <p className="text-ink-2 mt-2">
          {teamName} will need to nominate another supervisor for{" "}
          {challengeTitle}. This response cannot be undone.
        </p>

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
