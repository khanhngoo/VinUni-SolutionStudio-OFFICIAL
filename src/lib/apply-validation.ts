import type { Challenge, Team } from "@/lib/types";
import { confirmedMembers, pendingMembers, sizeLabel } from "@/lib/teams";

export const MAX_WORDS = 300;

export type ApplyField =
  | "teamName"
  | "team"
  | "motivation"
  | "experience"
  | "hours"
  | "faculty";

export type ApplyErrors = Partial<Record<ApplyField, string>>;

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export interface ApplyDraftState {
  teamName: string;
  motivation: string;
  experience: string;
  hours: string;
  facultyId: string;
}

/**
 * Per-step validation, so a step can only be left once it is answerable.
 *
 * Split by step rather than run as one pass at the end: a wizard that lets you
 * reach step four and then sends you back to step one has wasted the structure
 * it just imposed on you.
 */
export function validateTeam(
  draft: ApplyDraftState,
  team: Team,
  challenge: Challenge,
): ApplyErrors {
  const errors: ApplyErrors = {};
  if (draft.teamName.trim() === "") errors.teamName = "Give the team a name.";

  // Invitations are sent on submission and answered afterwards; the server
  // counts the leader plus invitees against the size rule
  // (validateTeamShape) and holds progression until every invitee responds.
  // A pending invite therefore cannot block submitting.
  const roster = confirmedMembers(team).length + pendingMembers(team).length;
  if (roster < challenge.teamSizeMin) {
    const short = challenge.teamSizeMin - roster;
    errors.team = `${short} more ${short === 1 ? "teammate" : "teammates"} needed — this challenge asks for ${sizeLabel(challenge)}`;
  } else if (roster > challenge.teamSizeMax) {
    errors.team = `Too many members — this challenge takes at most ${challenge.teamSizeMax}`;
  }

  return errors;
}

export function validateMotivation(draft: ApplyDraftState): ApplyErrors {
  const errors: ApplyErrors = {};
  const words = wordCount(draft.motivation);

  if (words === 0) errors.motivation = "Tell them why this one.";
  else if (words > MAX_WORDS) {
    errors.motivation = `${words} words — the limit is ${MAX_WORDS}.`;
  }

  if (draft.experience.trim() === "") {
    errors.experience = "Name something you've done.";
  }

  return errors;
}

export function validateSupervisor(draft: ApplyDraftState): ApplyErrors {
  const errors: ApplyErrors = {};

  const hours = Number(draft.hours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 40) {
    errors.hours = "Between 1 and 40 hours.";
  }
  if (draft.facultyId === "") errors.faculty = "Pick a supervisor to nominate.";

  return errors;
}

/** Step four re-runs everything, so a jump backwards cannot smuggle a gap in. */
export function validateAll(
  draft: ApplyDraftState,
  team: Team,
  challenge: Challenge,
): ApplyErrors {
  return {
    ...validateTeam(draft, team, challenge),
    ...validateMotivation(draft),
    ...validateSupervisor(draft),
  };
}
