"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface OfferCountdownProps {
  /** Hours remaining at render time, derived server-side from the pinned TODAY. */
  initialHours: number;
}

/**
 * Ticks down from the server-derived figure. The baseline comes from the pinned
 * TODAY rather than wall-clock, so the seeded 72-hour window keeps demonstrating
 * the countdown; only the display animates.
 */
export function OfferCountdown({ initialHours }: OfferCountdownProps) {
  const [seconds, setSeconds] = useState(initialHours * 3600);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = window.setInterval(() => {
      setSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  if (seconds <= 0) {
    return (
      <span className="font-semibold text-warn">This invitation has lapsed</span>
    );
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const urgent = hours < 24;

  return (
    <div>
      <p className="text-meta text-ink-3">Time to respond</p>
      <p
        aria-live="polite"
        className={cn(
          "font-mono font-bold tabular-nums text-[22px] leading-tight mt-0.5",
          urgent ? "text-red" : "text-brand",
        )}
      >
        {hours}h {String(minutes).padStart(2, "0")}m{" "}
        {String(secs).padStart(2, "0")}s
      </p>
    </div>
  );
}
