"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface FeedbackDialogProps {
  open: boolean;
  challengeTitle: string;
  teamName: string;
  /** Existing feedback, when this is a re-read rather than a first write. */
  initialValue?: string;
  onClose: () => void;
  /**
   * Fired the moment the feedback is committed, not when the success screen is
   * dismissed — dismissing by backdrop or Escape must not silently discard a
   * submission the user has already been told succeeded.
   */
  onSubmitted: (feedback: string) => void;
}

export function FeedbackDialog({
  open,
  challengeTitle,
  teamName,
  initialValue = "",
  onClose,
  onSubmitted,
}: FeedbackDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [feedback, setFeedback] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      setSubmitted(false);
      setError(null);
    }
  }, [open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (feedback.trim().length < 10) {
      setError("Write a few sentences — this is the team's official record.");
      return;
    }
    setError(null);
    setSubmitted(true);
    onSubmitted(feedback);
  }

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="feedback-title"
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/45"
    >
      {submitted ? (
        <div className="px-6 py-12 text-center">
          <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
            <CheckIcon className="w-5 h-5" />
          </span>
          <p className="font-semibold text-[15px] mt-3.5">Feedback submitted</p>
          <p className="text-ink-2 mt-1.5 max-w-[42ch] mx-auto">
            {teamName} can now read this in their project record.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
            <div>
              <h2 id="feedback-title">Final feedback</h2>
              <p className="text-meta text-ink-3 mt-0.5">
                {challengeTitle} · {teamName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 shrink-0 rounded-card border border-line text-ink-3 grid place-items-center hover:text-ink"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <label htmlFor="fb-text" className="block font-semibold text-ink mb-1.5">
              How did the team do
            </label>
            <textarea
              id="fb-text"
              rows={6}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What they did well, what to work on, and how this reflects on their record."
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
              onClick={onClose}
              className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
            >
              Submit feedback
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
