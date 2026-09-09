import { db } from "@/db";
import {
  replaceStudentPreferredRoles,
  updateStudentProfileRow,
  type StudentMutationDatabase,
} from "@/db/mutations/students";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";

export const MAX_PREFERRED_ROLES = 3;
const WEEK_LENGTH = 7;

const AVAILABILITY = new Set(["FREE", "PARTLY", "BUSY"]);
const WORK_MODES = new Set(["ON_SITE", "HYBRID", "REMOTE"]);
const TEAM_ROLES = new Set([
  "ANALYSIS",
  "BACKEND",
  "COORDINATION",
  "DATA_ML",
  "DESIGN",
  "DOMAIN_EXPERT",
  "FRONTEND",
  "RESEARCH",
]);

export type StudentProfileErrorCode = "FORBIDDEN" | "VALIDATION_ERROR";

export class StudentProfileError extends Error {
  readonly code: StudentProfileErrorCode;
  readonly details: string[];

  constructor(code: StudentProfileErrorCode, message: string, details: string[] = []) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "StudentProfileError";
  }
}

export interface SaveStudentProfileInput {
  about: string;
  hoursAvailable: number;
  portfolioUrl: string;
  preferredTeamMax: number;
  preferredTeamMin: number;
  roles: string[];
  weeklyAvailability: string[];
  workPreference: string;
}

export interface StudentProfileServiceOptions {
  database?: StudentMutationDatabase;
}

/**
 * Saves the self-reported half of a student's profile.
 *
 * Every rule the editor enforces is re-checked here, because the editor is a
 * convenience and this is the boundary: the three-role cap, the seven-slot
 * week, and the vocabularies. A short availability array is the dangerous one
 * — the team helpers intersect these positionally, so six slots would silently
 * read as "busy on Sunday" rather than as missing.
 */
export async function saveStudentProfile(
  input: SaveStudentProfileInput,
  actor: AuthenticatedActor,
  options: StudentProfileServiceOptions = {}
): Promise<void> {
  if (!actor.studentProfile) {
    throw new StudentProfileError(
      "FORBIDDEN",
      "Only a student account has a profile to edit."
    );
  }

  const details: string[] = [];

  const roles = [...new Set(input.roles)];
  if (roles.length > MAX_PREFERRED_ROLES) {
    details.push(`Pick at most ${MAX_PREFERRED_ROLES} usual roles.`);
  }
  if (roles.some((role) => !TEAM_ROLES.has(role))) {
    details.push("One of the selected roles is not a team role.");
  }

  const week = input.weeklyAvailability;
  if (week.length !== WEEK_LENGTH) {
    details.push("Weekly availability must cover all seven days.");
  }
  if (week.some((slot) => !AVAILABILITY.has(slot))) {
    details.push("Availability values must be free, partly or busy.");
  }

  if (input.workPreference !== "" && !WORK_MODES.has(input.workPreference)) {
    details.push("Work mode must be on-site, hybrid or remote.");
  }

  if (!Number.isInteger(input.hoursAvailable) || input.hoursAvailable < 0 || input.hoursAvailable > 168) {
    details.push("Hours per week must be between 0 and 168.");
  }

  const min = input.preferredTeamMin;
  const max = input.preferredTeamMax;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    details.push("Preferred team size must be a range starting at one or more.");
  }

  if (details.length > 0) {
    throw new StudentProfileError(
      "VALIDATION_ERROR",
      "The profile could not be saved.",
      details
    );
  }

  const userId = actor.user.userId;
  const update = {
    about: input.about.trim() || null,
    hoursAvailable: input.hoursAvailable,
    portfolioUrl: input.portfolioUrl.trim() || null,
    preferredTeamMax: max,
    preferredTeamMin: min,
    weeklyAvailability: week as Parameters<
      typeof updateStudentProfileRow
    >[2]["weeklyAvailability"],
    workPreference: (input.workPreference || null) as
      | "ON_SITE"
      | "HYBRID"
      | "REMOTE"
      | null,
  };

  const run = async (tx: StudentMutationDatabase) => {
    await updateStudentProfileRow(tx, userId, update);
    await replaceStudentPreferredRoles(tx, userId, roles);
  };

  if (options.database) {
    await run(options.database);
    return;
  }

  await db.transaction(async (tx) => {
    await run(tx);
  });
}
