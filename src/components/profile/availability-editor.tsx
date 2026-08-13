"use client";

import { useState } from "react";
import { AvailabilityLegend } from "@/components/profile/availability-grid";
import { cn } from "@/lib/cn";
import { DAY_NAMES } from "@/lib/profile";
import { WEEKDAY_LABELS, type DayAvailability } from "@/lib/types";

const CYCLE: DayAvailability[] = ["free", "partly", "busy"];

/**
 * The one genuinely interactive field on the profile. Clicking cycles a day
 * rather than opening a picker — three states is fewer than a dropdown costs.
 *
 * Like the rest of the prototype the change is session-only; nothing is saved.
 */
export function AvailabilityEditor({
  initial,
}: {
  initial: DayAvailability[];
}) {
  const [week, setWeek] = useState<DayAvailability[]>(initial);

  function cycle(index: number) {
    setWeek((current) =>
      current.map((day, i) =>
        i === index ? CYCLE[(CYCLE.indexOf(day) + 1) % CYCLE.length] : day,
      ),
    );
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 max-w-[280px]">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={DAY_NAMES[i]} className="text-center">
            <span className="block text-[10px] leading-none text-ink-3 mb-1">
              {label}
            </span>
            <button
              type="button"
              onClick={() => cycle(i)}
              aria-label={`${DAY_NAMES[i]}: ${week[i]}. Click to change.`}
              className={cn(
                "block w-full h-6 rounded-[2px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                week[i] === "free" && "bg-brand",
                week[i] === "partly" && "bg-brand-soft border border-brand",
                week[i] === "busy" && "bg-line-2 hover:bg-line",
              )}
            />
          </div>
        ))}
      </div>
      <div className="mt-2.5">
        <AvailabilityLegend />
      </div>
    </div>
  );
}
