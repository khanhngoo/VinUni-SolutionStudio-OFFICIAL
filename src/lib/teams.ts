import { DAY_NAMES } from "@/lib/profile";
import type { Challenge, Team, TeamMember, TeamRole } from "@/lib/types";

/**
 * Derivations over a team. The point of most of them is arithmetic a student
 * would otherwise do badly in their head — whether the roster is legal, and
 * whether these particular people can ever be in a room together.
 */

export function leaderOf(team: Team): TeamMember | undefined {
  return team.members.find((m) => m.status === "leader");
}

/** Everyone who is actually on the team — invites still out don't count. */
export function confirmedMembers(team: Team): TeamMember[] {
  return team.members.filter(
    (m) => m.status === "leader" || m.status === "accepted",
  );
}

export function pendingMembers(team: Team): TeamMember[] {
  return team.members.filter((m) => m.status === "invited");
}

export function declinedMembers(team: Team): TeamMember[] {
  return team.members.filter((m) => m.status === "declined");
}

export function teamSize(team: Team): number {
  return confirmedMembers(team).length;
}

export function sizeLabel(challenge: Challenge): string {
  return challenge.teamSizeMin === challenge.teamSizeMax
    ? `${challenge.teamSizeMin}`
    : `${challenge.teamSizeMin} – ${challenge.teamSizeMax}`;
}

export function isSizeValid(team: Team, challenge: Challenge): boolean {
  const size = teamSize(team);
  return size >= challenge.teamSizeMin && size <= challenge.teamSizeMax;
}

export function canAddMore(team: Team, challenge: Challenge): boolean {
  // Outstanding invites hold a seat — otherwise you can over-invite and end up
  // illegal the moment everyone says yes.
  return team.members.length - declinedMembers(team).length < challenge.teamSizeMax;
}

/** Hours the confirmed roster brings, against what the partner asked for. */
export function combinedHours(team: Team): number {
  return confirmedMembers(team).reduce((sum, m) => sum + m.hoursAvailable, 0);
}

export function requiredHours(team: Team, challenge: Challenge): number {
  return challenge.hoursPerWeek * teamSize(team);
}

export function rolesCovered(team: Team): TeamRole[] {
  return [...new Set(confirmedMembers(team).map((m) => m.role))];
}

/**
 * Days every confirmed member is free. The number that actually decides
 * whether a team functions, and the one nobody works out before applying.
 */
export function sharedFreeDays(team: Team): number[] {
  const members = confirmedMembers(team);
  if (members.length === 0) return [];

  const days: number[] = [];
  for (let day = 0; day < 7; day += 1) {
    if (members.every((m) => m.weeklyAvailability[day] === "free")) {
      days.push(day);
    }
  }
  return days;
}

export function sharedDaysLabel(team: Team): string {
  const days = sharedFreeDays(team);
  if (days.length === 0) return "None";
  return days.map((d) => DAY_NAMES[d].slice(0, 3)).join(", ");
}

export interface TeamReadiness {
  ready: boolean;
  /** Everything standing between this team and a submitted application. */
  blockers: string[];
  warnings: string[];
}

/**
 * Whether the application can be submitted, and why not. Blockers are hard
 * rules; warnings are things worth knowing that shouldn't stop anyone.
 */
export function teamReadiness(
  team: Team,
  challenge: Challenge,
): TeamReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const pending = pendingMembers(team);
  if (pending.length > 0) {
    const names = pending.map((m) => m.name).join(", ");
    blockers.push(
      pending.length === 1
        ? `Waiting on ${names} to accept`
        : `Waiting on ${pending.length} invitations — ${names}`,
    );
  }

  const size = teamSize(team);
  if (size < challenge.teamSizeMin) {
    const short = challenge.teamSizeMin - size;
    blockers.push(
      `${short} more ${short === 1 ? "teammate" : "teammates"} needed — this challenge asks for ${sizeLabel(challenge)}`,
    );
  }
  if (size > challenge.teamSizeMax) {
    blockers.push(
      `Too many members — this challenge takes at most ${challenge.teamSizeMax}`,
    );
  }

  const shared = sharedFreeDays(team);
  if (size > 1 && shared.length === 0) {
    warnings.push(
      "Your free afternoons never overlap. Agree a fixed weekly slot before you start.",
    );
  } else if (size > 1 && shared.length === 1) {
    warnings.push(
      `Your free afternoons only overlap on ${DAY_NAMES[shared[0]]}. Worth agreeing that as your weekly slot.`,
    );
  }

  const have = combinedHours(team);
  const need = requiredHours(team, challenge);
  if (size > 0 && have < need) {
    warnings.push(
      `The team has ${have} h/wk between you but the partner asked for ${need}.`,
    );
  }

  return { ready: blockers.length === 0, blockers, warnings };
}
