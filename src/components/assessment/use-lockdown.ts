"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIOLATION_LIMIT = 3;

export type LockdownWarning =
  | { kind: "fullscreen"; count: number }
  | { kind: "tab"; count: number }
  | { kind: "time-low" }
  | { kind: "auto-submit" }
  | null;

interface UseLockdownOptions {
  totalSeconds: number;
  onAutoSubmit: () => void;
}

/**
 * The lockdown behaviours from PRD §8.4 — fullscreen enforcement, tab-switch
 * counting with an auto-submit cap, the timer, autosave and the blocked-action
 * toast — in one place so both assessment tracks behave identically.
 */
export function useLockdown({ totalSeconds, onAutoSubmit }: UseLockdownOptions) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<LockdownWarning>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Guards against firing auto-submit twice (cap reached and timer expiring).
  const finishedRef = useRef(false);
  const timeLowShownRef = useRef(false);
  const onAutoSubmitRef = useRef(onAutoSubmit);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const finish = useCallback((reason: "cap" | "time") => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setWarning(reason === "cap" ? { kind: "auto-submit" } : null);
    // Let the overlay paint before handing back to the page.
    window.setTimeout(() => onAutoSubmitRef.current(), reason === "cap" ? 2200 : 0);
  }, []);

  /** Marks the attempt closed so a manual submit cannot double-fire with the
   *  timer or the violation cap. */
  const markFinished = useCallback(() => {
    finishedRef.current = true;
  }, []);

  const registerViolation = useCallback(
    (kind: "fullscreen" | "tab") => {
      if (finishedRef.current) return;
      setViolations((prev) => {
        const next = prev + 1;
        if (next >= VIOLATION_LIMIT) {
          finish("cap");
        } else {
          setWarning({ kind, count: next });
        }
        return next;
      });
    },
    [finish],
  );

  // Countdown.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          finish("time");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finish]);

  // Time-low warning at 5 minutes (PRD §15 STU-13/14 overlay list).
  useEffect(() => {
    if (
      secondsLeft <= 300 &&
      secondsLeft > 0 &&
      !timeLowShownRef.current &&
      !finishedRef.current
    ) {
      timeLowShownRef.current = true;
      setWarning({ kind: "time-low" });
    }
  }, [secondsLeft]);

  // Tab / window switching.
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") registerViolation("tab");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [registerViolation]);

  // Fullscreen enforcement.
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) registerViolation("fullscreen");
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [registerViolation]);

  // Autosave indicator: every 15s, plus whenever the page calls markSaved().
  useEffect(() => {
    const id = window.setInterval(() => setSavedAt(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const markSaved = useCallback(() => setSavedAt(Date.now()), []);

  const blockAction = useCallback((message: string) => {
    setToast(message);
  }, []);

  // Auto-dismiss the blocked-action toast.
  useEffect(() => {
    if (toast === null) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement && document.fullscreenEnabled) {
      void document.documentElement.requestFullscreen().catch(() => {
        // Denied — the violation counter already covers leaving fullscreen.
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  return {
    secondsLeft,
    violations,
    violationLimit: VIOLATION_LIMIT,
    warning,
    dismissWarning: () => setWarning(null),
    toast,
    blockAction,
    savedAt,
    markSaved,
    requestFullscreen,
    exitFullscreen,
    markFinished,
  };
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
