import { eq } from "drizzle-orm";

import { db } from "@/db";
import { facultyProfiles } from "@/db/schema";

export type FacultyMutationDatabase =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes the one self-reported field on a faculty profile.
 *
 * School, department and academic title all come from the institution and
 * are deliberately absent from this update, mirroring how
 * `updateStudentProfileRow` withholds the registrar's half of a student
 * profile — supervision capacity is the faculty member's own call.
 */
export async function updateFacultyMaxSupervisions(
  database: FacultyMutationDatabase,
  userId: bigint,
  maxActiveSupervisions: number
): Promise<void> {
  await database
    .update(facultyProfiles)
    .set({ maxActiveSupervisions, updatedAt: new Date() })
    .where(eq(facultyProfiles.userId, userId));
}
