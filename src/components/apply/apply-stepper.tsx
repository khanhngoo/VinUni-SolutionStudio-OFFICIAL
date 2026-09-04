"use client";

import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

interface ApplyStepperProps {
  steps: string[];
  active: number;
  /** The furthest step reached. Anything beyond it is not yet answerable. */
  furthest: number;
  onJump: (step: number) => void;
}

/**
 * Backwards is free, forwards is earned.
 *
 * A step you have already completed is a link, because rereading what you wrote
 * is part of writing the next thing. A step you have not reached is inert
 * rather than hidden, so the shape of the whole application is visible from the
 * first screen.
 */
export function ApplyStepper({
  steps,
  active,
  furthest,
  onJump,
}: ApplyStepperProps) {
  return (
    <ol className="flex items-center flex-wrap gap-x-2 gap-y-2 mt-4">
      {steps.map((step, i) => {
        const done = i < furthest;
        const current = i === active;
        const reachable = i <= furthest;

        const content = (
          <>
            <span
              className={cn(
                "w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] font-semibold shrink-0",
                current
                  ? "bg-brand text-white"
                  : done
                    ? "bg-ok-soft text-ok"
                    : "border border-line text-ink-3",
              )}
            >
              {done && !current ? <CheckIcon className="w-3 h-3" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-meta",
                current ? "text-ink font-semibold" : "text-ink-3",
              )}
            >
              {step}
            </span>
          </>
        );

        return (
          <li key={step} className="flex items-center gap-2">
            {reachable && !current ? (
              <button
                type="button"
                onClick={() => onJump(i)}
                className="flex items-center gap-2 rounded-card hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {content}
              </button>
            ) : (
              <span
                className="flex items-center gap-2"
                aria-current={current ? "step" : undefined}
              >
                {content}
              </span>
            )}

            {i < steps.length - 1 ? (
              <span aria-hidden="true" className="w-5 h-px bg-line mx-1" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
