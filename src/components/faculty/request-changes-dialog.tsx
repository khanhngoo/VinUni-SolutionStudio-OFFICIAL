"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface RequestChangesDialogProps {
  open: boolean;
  milestoneTitle: string;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}

export function RequestChangesDialog({
  open,
  milestoneTitle,
  onCancel,
  onSubmit,
}: RequestChangesDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length < 5) {
      setError("Say what needs to change before sending this back.");
      return;
    }
    setError(null);
    setNote("");
    onSubmit(note);
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
      aria-labelledby="request-changes-title"
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
          <div>
            <h2 id="request-changes-title">Request changes</h2>
            <p className="text-meta text-ink-3 mt-0.5">{milestoneTitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-7 h-7 shrink-0 rounded-card border border-line text-ink-3 grid place-items-center hover:text-ink"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <label htmlFor="rc-note" className="block font-semibold text-ink mb-1.5">
            What needs to change
          </label>
          <textarea
            id="rc-note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Be specific about what the team should revise before resubmitting."
            className={cn(
              "w-full rounded-card border bg-paper px-3 py-2 text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              error ? "border-warn" : "border-line",
            )}
          />
          {error ? <p className="text-meta text-warn mt-1.5">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded-card bg-red text-white font-semibold hover:opacity-90"
          >
            Send back to the team
          </button>
        </div>
      </form>
    </dialog>
  );
}
