import { cn } from "@/lib/cn";
import { bandStroke } from "@/lib/score";
import type { ScoreBand } from "@/lib/types";

interface ScoreDonutProps {
  /** 0-100. Pass it through `clampScore` first. */
  score: number;
  band: ScoreBand;
  size?: "sm" | "md";
  /** `sm` sets the numeral beside the ring; `md` centres it inside. */
  showNumber?: boolean;
  /** Overrides the default screen-reader sentence. */
  label?: string;
  className?: string;
}

const SIZES = {
  sm: { box: 28, stroke: 4, numeral: "text-[11px]" },
  md: { box: 44, stroke: 3.5, numeral: "text-[13px]" },
} as const;

/**
 * A fit score as a ring.
 *
 * `pathLength={100}` rescales the circle's geometry to 100 units, so the arc is
 * `strokeDasharray="{score} 100"` with no 2πr arithmetic — and the radius can
 * change without touching the maths.
 *
 * Deliberately not a client component: the marketplace card that carries it is
 * server-rendered, and a ring plus a numeral needs no interactivity.
 */
export function ScoreDonut({
  score,
  band,
  size = "sm",
  showNumber = true,
  label,
  className,
}: ScoreDonutProps) {
  const { box, stroke, numeral } = SIZES[size];
  const centred = size === "md";

  const ring = (
    <span
      className={cn("relative shrink-0 grid place-items-center", centred && "block")}
      style={{ width: box, height: box }}
    >
      <svg
        viewBox="0 0 36 36"
        width={box}
        height={box}
        role="img"
        aria-label={label ?? `Suitability ${score} out of 100 — ${band} fit`}
        className="-rotate-90 origin-center"
      >
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke={bandStroke(band)}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${score} 100`}
          className="donut-sweep"
        />
      </svg>
      {centred && showNumber ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 grid place-items-center font-bold text-ink tabular-nums",
            numeral,
          )}
        >
          {score}
        </span>
      ) : null}
    </span>
  );

  if (centred || !showNumber) {
    return <span className={cn("inline-flex", className)}>{ring}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {ring}
      <span
        aria-hidden
        className={cn("font-bold text-ink tabular-nums", numeral)}
      >
        {score}
      </span>
    </span>
  );
}
