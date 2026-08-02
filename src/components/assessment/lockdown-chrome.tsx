"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { formatClock, type LockdownWarning } from "@/components/assessment/use-lockdown";

interface LockdownHeaderProps {
  challengeTitle: string;
  progress: string;
  secondsLeft: number;
  totalSeconds: number;
  violations: number;
  violationLimit: number;
  savedAt: number | null;
  onSubmit: () => void;
}

export function LockdownHeader({
  challengeTitle,
  progress,
  secondsLeft,
  totalSeconds,
  violations,
  violationLimit,
  savedAt,
  onSubmit,
}: LockdownHeaderProps) {
  const ratio = totalSeconds === 0 ? 0 : secondsLeft / totalSeconds;
  // Colour shifts at 25% and 10% remaining (PRD §8.4).
  const timerTone =
    ratio <= 0.1 ? "text-red" : ratio <= 0.25 ? "text-warn" : "text-ink";

  return (
    <header className="h-[52px] shrink-0 bg-card border-b border-line">
      <div className="h-full px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-semibold text-brand truncate max-w-[28ch]">
            {challengeTitle}
          </span>
          <span className="text-meta text-ink-3 shrink-0">{progress}</span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {savedAt ? (
            <span className="text-meta text-ink-3 hidden sm:inline">Saved</span>
          ) : null}

          <span
            className={cn(
              "text-meta",
              violations > 0 ? "text-warn font-semibold" : "text-ink-3",
            )}
          >
            Violations {violations}/{violationLimit}
          </span>

          <span
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "font-mono font-semibold tabular-nums text-[15px]",
              timerTone,
            )}
          >
            {formatClock(secondsLeft)}
            <span className="sr-only"> remaining</span>
          </span>

          <button
            type="button"
            onClick={onSubmit}
            className="h-8 px-4 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Submit
          </button>
        </div>
      </div>
    </header>
  );
}

interface WarningOverlayProps {
  warning: LockdownWarning;
  violationLimit: number;
  onDismiss: () => void;
  onReturnToFullscreen: () => void;
}

/**
 * The overlay family from PRD §15. Uses a native <dialog> for focus trapping,
 * with Escape suppressed — a lockdown warning is not dismissible by keyboard
 * convenience.
 */
export function WarningOverlay({
  warning,
  violationLimit,
  onDismiss,
  onReturnToFullscreen,
}: WarningOverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (warning && !dialog.open) dialog.showModal();
    if (!warning && dialog.open) dialog.close();
  }, [warning]);

  if (!warning) return null;

  const content = overlayContent(warning, violationLimit);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => event.preventDefault()}
      aria-labelledby="lockdown-warning-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/60"
    >
      <div className="px-6 py-6 text-center">
        <p
          id="lockdown-warning-title"
          className={cn(
            "font-semibold text-[15px]",
            content.tone === "warn" ? "text-warn" : "text-ink",
          )}
        >
          {content.title}
        </p>
        <p className="text-ink-2 mt-2 max-w-[42ch] mx-auto">{content.body}</p>

        {content.action ? (
          <button
            type="button"
            autoFocus
            onClick={() => {
              if (warning.kind === "fullscreen") onReturnToFullscreen();
              onDismiss();
            }}
            className="h-9 px-5 mt-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {content.action}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}

function overlayContent(
  warning: NonNullable<LockdownWarning>,
  limit: number,
): { title: string; body: string; action: string | null; tone: "warn" | "ink" } {
  switch (warning.kind) {
    case "fullscreen":
      return {
        title: `Return to fullscreen. Warning ${warning.count} of ${limit}.`,
        body: "Leaving fullscreen is recorded. Your timer has continued running.",
        action: "Return to fullscreen",
        tone: "warn",
      };
    case "tab":
      return {
        title: `Stay on this tab. Warning ${warning.count} of ${limit}.`,
        body: "Switching tabs or windows is recorded. Your timer has continued running.",
        action: "Continue",
        tone: "warn",
      };
    case "time-low":
      return {
        title: "Five minutes remaining",
        body: "Your answers are saved as you go. Finish what you can.",
        action: "Continue",
        tone: "ink",
      };
    case "auto-submit":
      return {
        title: "Your assessment has been submitted",
        body: `You reached ${limit} violations, so the assessment closed automatically. Your saved answers were submitted.`,
        action: null,
        tone: "warn",
      };
  }
}

export function BlockedActionToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-card bg-ink text-white px-4 py-2.5 text-meta shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
    >
      {message}
    </div>
  );
}

interface SubmitConfirmProps {
  open: boolean;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitConfirm({
  open,
  unanswered,
  onCancel,
  onConfirm,
}: SubmitConfirmProps) {
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
      aria-labelledby="submit-confirm-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-card border border-line bg-card p-0 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop:bg-ink/60"
    >
      <div className="px-6 py-6">
        <p id="submit-confirm-title" className="font-semibold text-[15px]">
          Submit your assessment?
        </p>
        <p className="text-ink-2 mt-2">
          {unanswered > 0
            ? `You have ${unanswered} unanswered ${unanswered === 1 ? "item" : "items"}. `
            : "Everything is answered. "}
          You cannot return once submitted.
        </p>
        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-card border border-line bg-card text-ink-2 font-medium hover:border-ink-3"
          >
            Keep working
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="h-9 px-5 rounded-card bg-brand text-white font-semibold hover:bg-brand-deep"
          >
            Submit
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** PRD §16: assessment is desktop-only. Say so rather than break the layout. */
export function DesktopOnlyNotice() {
  return (
    <div className="lg:hidden min-h-[60vh] grid place-items-center px-6 text-center">
      <div>
        <p className="font-semibold text-ink">
          This assessment needs a larger screen
        </p>
        <p className="text-ink-2 mt-1.5 max-w-[40ch]">
          Open it on a desktop or laptop. The lockdown environment is not
          supported on small screens.
        </p>
      </div>
    </div>
  );
}
