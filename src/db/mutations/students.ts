import { eq } from "drizzle-orm";

import { db } from "@/db";
import { studentPreferredRoles, studentProfiles } from "@/db/schema";
import type { DayAvailability } from "@/db/schema/users";

export type StudentMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface StudentProfileUpdate {
  about: string | null;
  hoursAvailable: number | null;
  portfolioUrl: string | null;
  preferredTeamMax: number | null;
  preferredTeamMin: number | null;
  weeklyAvailability: DayAvailability[];
  workPreference: "ON_SITE" | "HYBRID" | "REMOTE" | null;
}

/**
 * Writes the self-reported half of a student profile.
 *
 * Only the self-reported half: school, major, year, GPA and the transcript all
 * come from the registrar and are deliberately absent from this update, so a
 * student cannot edit the record the university stands behind.
 */
export async function updateStudentProfileRow(
  database: StudentMutationDatabase,
  userId: bigint,
  update: StudentProfileUpdate
): Promise<void> {
  await database
    .update(studentProfiles)
    .set({
      about: update.about,
      availableHoursPerWeek: update.hoursAvailable,
      portfolioUrl: update.portfolioUrl,
      preferredTeamMax: update.preferredTeamMax,
      preferredTeamMin: update.preferredTeamMin,
      updatedAt: new Date(),
      weeklyAvailability: update.weeklyAvailability,
      workPreference: update.workPreference,
    })
    .where(eq(studentProfiles.userId, userId));
}

/**
 * Replaces the student's default team roles wholesale.
 *
 * A set, not a list: the editor presents them as toggles, so replacing is
 * closer to what the user did than diffing would be.
 */
export async function replaceStudentPreferredRoles(
  database: StudentMutationDatabase,
  userId: bigint,
  roles: string[]
): Promise<void> {
  await database
    .delete(studentPreferredRoles)
    .where(eq(studentPreferredRoles.studentId, userId));

  if (roles.length === 0) return;

  await database.insert(studentPreferredRoles).values(
    roles.map((role) => ({
      role: role as (typeof studentPreferredRoles.role.enumValues)[number],
      studentId: userId,
    }))
  );
}
