import { cn } from "@/lib/cn";
import {
  combinedHours,
  requiredHours,
  rolesCovered,
  sharedDaysLabel,
  teamReadiness,
  teamSize,
} from "@/lib/teams";
import type { Challenge, Team } from "@/lib/types";

/**
 * The arithmetic a student would otherwise get wrong: whether the roster is
 * legal, whether it brings the hours the partner asked for, and whether these
 * particular people share a free afternoon.
 */
export function TeamFit({
  team,
  challenge,
}: {
  team: Team;
  challenge: Challenge;
}) {
  const have = combinedHours(team);
  const need = requiredHours(team, challenge);
  const shared = sharedDaysLabel(team);
  const { blockers, warnings } = teamReadiness(team, challenge);

  return (
    <div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Combined hours" value={`${have} / wk`} short={have < need} />
        <Stat label="Asked for" value={`${need} / wk`} />
        <Stat
          label="Roles covered"
          value={`${rolesCovered(team).length} of ${teamSize(team)}`}
        />
        <Stat label="Shared free days" value={shared} short={shared === "None"} />
      </dl>

      {blockers.map((blocker) => (
        <Notice key={blocker} tone="block">
          {blocker}
        </Notice>
      ))}
      {warnings.map((warning) => (
        <Notice key={warning} tone="warn">
          {warning}
        </Notice>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  short = false,
}: {
  label: string;
  value: string;
  short?: boolean;
}) {
  return (
    <div className="bg-line-2 rounded-card px-3.5 py-3">
      <dt className="text-meta text-ink-3">{label}</dt>
      <dd
        className={cn(
          "font-semibold text-[15px] mt-1",
          short ? "text-warn" : "text-brand",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "block" | "warn";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-2.5 rounded-card border border-l-[3px] px-4 py-2.5",
        tone === "block"
          ? "border-line border-l-brand bg-card text-ink-2"
          : "border-warn/35 border-l-warn bg-warn-soft text-ink-2",
      )}
    >
      {children}
    </p>
  );
}
