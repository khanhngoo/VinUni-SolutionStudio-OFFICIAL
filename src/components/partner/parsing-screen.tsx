"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  FIELD_COUNT,
  filledCount,
  type ParsedBrief,
  type ParseStage,
} from "@/lib/data/brief-parse";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface ParsingScreenProps {
  brief: ParsedBrief;
  stages: ParseStage[];
  onDone: () => void;
}

/**
 * The parse, while it runs.
 *
 * Still a timer over a fixture — but the stages it names are the ones the
 * review screen then shows the results of, so the wait is doing explanatory
 * work rather than filling time. The bar is determinate for the same reason a
 * real one should be: an indeterminate bar that finishes in four seconds is
 * indistinguishable from one that never finishes.
 */
export function ParsingScreen({ brief, stages, onDone }: ParsingScreenProps) {
  const [stage, setStage] = useState(0);
  const reduce = useReducedMotion();

  const total = stages.reduce((ms, s) => ms + s.ms, 0);
  const elapsed = stages.slice(0, stage).reduce((ms, s) => ms + s.ms, 0);
  const progress = Math.round((elapsed / total) * 100);

  useEffect(() => {
    // Reduced motion still gets the stage list, just not the four-second wait.
    const scale = reduce ? 600 / total : 1;

    const timers = stages.map((_, i) => {
      const at = stages.slice(0, i + 1).reduce((ms, s) => ms + s.ms, 0);
      return window.setTimeout(() => setStage(i + 1), at * scale);
    });
    const finish = window.setTimeout(onDone, total * scale + 220);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finish);
    };
  }, [stages, total, reduce, onDone]);

  // Counts up across the extract stage rather than appearing all at once.
  const found =
    stage <= 2 ? 0 : Math.round(filledCount(brief) * Math.min(1, stage / 3));

  return (
    <div className="mt-3.5">
      <h1>Reading your brief…</h1>
      <p className="text-ink-2 mt-2">
        Step 2 of 3 · {brief.fileName} · nothing is saved until you confirm.
      </p>

      <div className="flex gap-1.5 mt-4">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-[5px] flex-1 rounded-full",
              n <= 2 ? "bg-brand" : "bg-line",
            )}
          />
        ))}
      </div>

      <div className="mt-6 bg-card border border-line rounded-card p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-h3 text-ink-3">
            {found > 0 ? `${found} of ${FIELD_COUNT} fields found` : "Starting…"}
          </span>
          <span className="text-meta text-ink-3 tabular-nums">{progress}%</span>
        </div>

        <div
          className="mt-2 h-[5px] rounded-full bg-line overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Parsing your brief"
        >
          <span
            className="block h-full bg-brand rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-5 flex flex-col gap-3">
          {stages.map((s, i) => {
            const done = i < stage;
            const active = i === stage;

            return (
              <li key={s.id} className="flex gap-2.5">
                <span className="w-4 h-4 mt-0.5 shrink-0 grid place-items-center">
                  {done ? (
                    <CheckIcon className="w-4 h-4 text-ok" />
                  ) : active ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-line border-t-brand stage-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-line" />
                  )}
                </span>

                <span className={cn("min-w-0", !done && !active && "opacity-40")}>
                  <span
                    className={cn(
                      "block",
                      active ? "text-ink font-semibold" : "text-ink-2",
                    )}
                  >
                    {s.label}
                  </span>
                  {done || active ? (
                    <span
                      key={`${s.id}-detail`}
                      className="block text-meta text-ink-3 mt-0.5 reveal-block"
                    >
                      {s.detail(brief)}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* The shape of the review form, so the next screen is not a jump cut. */}
      <div
        aria-hidden
        className="mt-4 bg-card border border-line rounded-card p-5 flex flex-col gap-4"
      >
        <div className="h-3 w-24 rounded-card stripes" />
        <div className="h-9 rounded-card stripes" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-9 rounded-card stripes" />
          <div className="h-9 rounded-card stripes" />
        </div>
        <div className="h-16 rounded-card stripes" />
      </div>
    </div>
  );
}
