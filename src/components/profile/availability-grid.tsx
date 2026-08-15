import { cn } from "@/lib/cn";
import { DAY_NAMES } from "@/lib/profile";
import { WEEKDAY_LABELS, type DayAvailability } from "@/lib/types";

/**
 * A week at a glance. Deliberately one slot per day rather than an hour grid —
 * the only question it has to answer is "which afternoons could this team
 * actually meet", and finer detail is a promise nobody keeps.
 */
export function AvailabilityGrid({
  availability,
  className,
}: {
  availability: DayAvailability[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-7 gap-1", className)}>
      {WEEKDAY_LABELS.map((label, i) => (
        <div key={DAY_NAMES[i]} className="text-center">
          <span className="block text-[10px] leading-none text-ink-3 mb-1">
            {label}
          </span>
          <span
            title={`${DAY_NAMES[i]} · ${availability[i] ?? "busy"}`}
            className={cn(
              "block h-5 rounded-[2px]",
              availability[i] === "free" && "bg-brand",
              availability[i] === "partly" && "bg-brand-soft border border-brand",
              (availability[i] === "busy" || !availability[i]) && "bg-line-2",
            )}
          >
            <span className="sr-only">
              {DAY_NAMES[i]}: {availability[i] ?? "busy"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Legend, shown once beside a grid rather than repeated per cell. */
export function AvailabilityLegend() {
  return (
    <p className="text-meta text-ink-3 flex items-center gap-3 flex-wrap">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-brand" />
        Free
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-brand-soft border border-brand" />
        Partly
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-line-2" />
        Busy
      </span>
    </p>
  );
}
