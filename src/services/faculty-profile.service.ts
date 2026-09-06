import { db } from "@/db";
import { getFacultyProfileRecord } from "@/db/queries/faculty";
import {
  updateFacultyMaxSupervisions,
  type FacultyMutationDatabase,
} from "@/db/mutations/faculty";
import type { AuthenticatedActor } from "@/auth/authenticated-actor";

const MAX_SUPERVISIONS_CEILING = 50;

export type FacultyProfileErrorCode = "FORBIDDEN" | "VALIDATION_ERROR";

export class FacultyProfileError extends Error {
  readonly code: FacultyProfileErrorCode;
  readonly details: string[];

  constructor(code: FacultyProfileErrorCode, message: string, details: string[] = []) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "FacultyProfileError";
  }
}

export interface FacultyProfileView {
  academicTitle: string | null;
  department: string | null;
  email: string;
  fullName: string;
  maxActiveSupervisions: number | null;
  school: string | null;
}

export async function getFacultyProfile(actor: AuthenticatedActor): Promise<FacultyProfileView> {
  if (!actor.facultyProfile) {
    throw new FacultyProfileError("FORBIDDEN", "Only a faculty account has a profile here.");
  }

  const record = await getFacultyProfileRecord(db, actor.user.userId);
  if (!record) {
    throw new FacultyProfileError("FORBIDDEN", "Only a faculty account has a profile here.");
  }

  return {
    academicTitle: record.academicTitle,
    department: record.department,
    email: actor.user.email,
    fullName: actor.user.fullName,
    maxActiveSupervisions: record.maxActiveSupervisions,
    school: record.school,
  };
}

export interface FacultyProfileServiceOptions {
  database?: FacultyMutationDatabase;
}

/** Re-validates the one editable field — the form is a convenience, this is the boundary. */
export async function saveFacultyMaxSupervisions(
  input: { maxActiveSupervisions: number },
  actor: AuthenticatedActor,
  options: FacultyProfileServiceOptions = {}
): Promise<void> {
  if (!actor.facultyProfile) {
    throw new FacultyProfileError("FORBIDDEN", "Only a faculty account has a profile here.");
  }

  if (
    !Number.isInteger(input.maxActiveSupervisions) ||
    input.maxActiveSupervisions < 0 ||
    input.maxActiveSupervisions > MAX_SUPERVISIONS_CEILING
  ) {
    throw new FacultyProfileError("VALIDATION_ERROR", "The profile could not be saved.", [
      `Supervision capacity must be a whole number between 0 and ${MAX_SUPERVISIONS_CEILING}.`,
    ]);
  }

  await updateFacultyMaxSupervisions(
    options.database ?? db,
    actor.user.userId,
    input.maxActiveSupervisions
  );
}
